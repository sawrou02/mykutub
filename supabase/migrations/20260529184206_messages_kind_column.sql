-- Refactor : préfixes magiques `__system__:`, `__image__:`, `__offer__:`
-- remplacés par une vraie colonne `kind` + jsonb `metadata`.
--
-- Avant :
--   text = '__offer__:<uuid>' ou '__system__:Foo bar' ou '__image__:https://...'
--   → parsing de chaîne partout, RLS regex, fragile.
--
-- Après :
--   kind in ('text', 'image', 'system', 'offer')
--   metadata jsonb (clés : url pour 'image', text pour 'system', offer_id pour 'offer')
--   text reste utilisé pour 'text' uniquement.
--
-- Les RPCs des price_offers sont réécrites pour insérer directement
-- avec kind + metadata, sans préfixe dans text. Le frontend lit kind
-- en priorité.

-- ---------------------------------------------------------------------------
-- 1. Schéma : ajout kind + metadata
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists kind text not null default 'text',
  add column if not exists metadata jsonb;

alter table public.messages
  drop constraint if exists messages_kind_check;
alter table public.messages
  add constraint messages_kind_check check (kind in ('text', 'image', 'system', 'offer'));

create index if not exists messages_kind_idx on public.messages (chat_id, kind);

-- ---------------------------------------------------------------------------
-- 2. Backfill : on déduit kind + metadata des préfixes existants, puis on
--    vide la colonne text pour les messages non-texte.
-- ---------------------------------------------------------------------------
update public.messages
set kind = 'system',
    metadata = jsonb_build_object('text', substring(text from length('__system__:') + 1)),
    text = ''
where text like '__system__:%' and kind = 'text';

update public.messages
set kind = 'image',
    metadata = jsonb_build_object('url', substring(text from length('__image__:') + 1)),
    text = ''
where text like '__image__:%' and kind = 'text';

update public.messages
set kind = 'offer',
    metadata = jsonb_build_object('offer_id', substring(text from length('__offer__:') + 1)),
    text = ''
where text like '__offer__:%' and kind = 'text';

-- ---------------------------------------------------------------------------
-- 3. RLS : remplace l'ancienne restriction par préfixe par une whitelist
--    de kinds autorisés à l'insertion par un utilisateur authentifié.
-- ---------------------------------------------------------------------------
drop policy if exists "Block reserved message prefixes for users" on public.messages;

drop policy if exists "Users can only insert text or image messages" on public.messages;
create policy "Users can only insert text or image messages"
  on public.messages
  as restrictive
  for insert
  to authenticated
  with check (kind in ('text', 'image'));

-- ---------------------------------------------------------------------------
-- 4. RPCs price_offers : réécrites pour utiliser kind + metadata
-- ---------------------------------------------------------------------------

create or replace function public.create_price_offer(
  _book_id uuid,
  _proposed_price numeric,
  _message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_buyer uuid := auth.uid();
  v_seller uuid;
  v_book_title text;
  v_book_image text;
  v_original_price numeric;
  v_book_status text;
  v_is_donation boolean;
  v_chat_id uuid;
  v_offer_id uuid;
  v_recent_count integer;
begin
  if v_buyer is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if _proposed_price is null or _proposed_price < 0 then
    raise exception 'Invalid proposed price' using errcode = '22023';
  end if;

  select count(*) into v_recent_count
  from public.price_offers
  where buyer_id = v_buyer and created_at > now() - interval '1 hour';
  if v_recent_count >= 5 then
    raise exception 'Rate limit: trop de propositions récentes (max 5 / heure)'
      using errcode = '54000';
  end if;

  update public.price_offers
  set status = 'expired'
  where book_id = _book_id
    and status in ('pending', 'countered')
    and expires_at < now();

  select seller_id, title, image_url, price, status, is_donation
    into v_seller, v_book_title, v_book_image, v_original_price, v_book_status, v_is_donation
  from public.books where id = _book_id;

  if v_seller is null then raise exception 'Book not found' using errcode = 'P0002'; end if;
  if v_seller = v_buyer then raise exception 'Cannot make an offer on your own book' using errcode = '42501'; end if;
  if v_is_donation then raise exception 'Cannot make a price offer on a donation' using errcode = '22023'; end if;
  if v_book_status is distinct from 'available' then raise exception 'Book is not available' using errcode = '22023'; end if;
  if _proposed_price > v_original_price then raise exception 'Proposed price cannot exceed listed price' using errcode = '22023'; end if;

  select id into v_chat_id
  from public.chats
  where book_id = _book_id and participants @> array[v_buyer, v_seller]::uuid[]
  limit 1;

  if v_chat_id is null then
    insert into public.chats (
      participants, book_id, book_title, book_image_url,
      last_message, last_message_at, unread_by
    ) values (
      array[v_buyer, v_seller]::uuid[],
      _book_id, v_book_title, v_book_image,
      'Nouvelle proposition de prix',
      now(),
      array[v_seller]::uuid[]
    )
    returning id into v_chat_id;
  end if;

  insert into public.price_offers (
    book_id, chat_id, buyer_id, seller_id,
    original_price, proposed_price, message
  ) values (
    _book_id, v_chat_id, v_buyer, v_seller,
    v_original_price, _proposed_price, _message
  )
  returning id into v_offer_id;

  -- Message porteur de l'offre (kind='offer', offer_id en metadata)
  insert into public.messages (chat_id, sender_id, sender_name, text, kind, metadata)
  values (
    v_chat_id, v_buyer,
    coalesce((select display_name from public.profiles where id = v_buyer), 'Acheteur'),
    '', 'offer', jsonb_build_object('offer_id', v_offer_id::text)
  );

  update public.chats
  set last_message = 'Proposition : ' || _proposed_price::text || ' €',
      last_message_at = now(),
      unread_by = array(select distinct unnest(array_append(coalesce(unread_by, '{}'), v_seller))),
      deleted_for = '{}'::uuid[]
  where id = v_chat_id;

  insert into public.notifications (user_id, type, message, link)
  values (
    v_seller, 'price_offer',
    'Nouvelle proposition de prix de ' || _proposed_price::text || ' € pour « ' || v_book_title || ' »',
    '/messages/' || v_chat_id::text
  );

  return v_offer_id;
end;
$$;
grant execute on function public.create_price_offer(uuid, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.price_offers_transition(
  _offer_id uuid,
  _expected_actor text,
  _new_status text,
  _notify_other_text text,
  _chat_system_text text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_offer record;
  v_actor_role text;
  v_other uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_offer from public.price_offers where id = _offer_id for update;
  if v_offer.id is null then raise exception 'Offer not found' using errcode = 'P0002'; end if;
  if v_offer.status <> 'pending' then raise exception 'Offer is no longer pending' using errcode = '22023'; end if;

  if v_uid = v_offer.seller_id then v_actor_role := 'seller'; v_other := v_offer.buyer_id;
  elsif v_uid = v_offer.buyer_id then v_actor_role := 'buyer'; v_other := v_offer.seller_id;
  else raise exception 'Not a party to this offer' using errcode = '42501'; end if;

  if v_actor_role <> _expected_actor then raise exception 'Wrong actor for this transition' using errcode = '42501'; end if;

  update public.price_offers set status = _new_status where id = _offer_id;

  if v_offer.chat_id is not null then
    insert into public.messages (chat_id, sender_id, sender_name, text, kind, metadata)
    values (
      v_offer.chat_id, v_uid,
      coalesce((select display_name from public.profiles where id = v_uid), 'Système'),
      '', 'system', jsonb_build_object('text', _chat_system_text)
    );
    update public.chats
    set last_message = _chat_system_text,
        last_message_at = now(),
        unread_by = array(select distinct unnest(array_append(coalesce(unread_by, '{}'), v_other))),
        deleted_for = '{}'::uuid[]
    where id = v_offer.chat_id;
  end if;

  insert into public.notifications (user_id, type, message, link)
  values (
    v_other, 'price_offer', _notify_other_text,
    case when v_offer.chat_id is not null then '/messages/' || v_offer.chat_id::text else null end
  );
end;
$$;

-- ---------------------------------------------------------------------------
create or replace function public.price_offers_reject_others_on_book(
  _book_id uuid,
  _winner_offer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_loser record;
begin
  for v_loser in
    select id, buyer_id, chat_id, proposed_price
    from public.price_offers
    where book_id = _book_id
      and id <> _winner_offer_id
      and status in ('pending', 'countered')
  loop
    update public.price_offers set status = 'rejected' where id = v_loser.id;

    if v_loser.chat_id is not null then
      insert into public.messages (chat_id, sender_id, sender_name, text, kind, metadata)
      values (
        v_loser.chat_id,
        (select seller_id from public.books where id = _book_id),
        'Système', '', 'system',
        jsonb_build_object('text', 'Le livre a été réservé suite à une autre proposition acceptée')
      );
      update public.chats
      set last_message = 'Livre réservé par un autre acheteur',
          last_message_at = now(),
          unread_by = array(select distinct unnest(array_append(coalesce(unread_by, '{}'), v_loser.buyer_id))),
          deleted_for = '{}'::uuid[]
      where id = v_loser.chat_id;
    end if;

    insert into public.notifications (user_id, type, message, link)
    values (
      v_loser.buyer_id, 'price_offer',
      'Le livre a été réservé suite à une autre proposition. Votre proposition de '
        || v_loser.proposed_price::text || ' € a été annulée.',
      case when v_loser.chat_id is not null then '/messages/' || v_loser.chat_id::text else null end
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
create or replace function public.accept_price_offer(_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_offer record;
  v_price numeric;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;

  select * into v_offer from public.price_offers where id = _offer_id for update;
  if v_offer.id is null then raise exception 'Offer not found' using errcode = 'P0002'; end if;
  if v_uid <> v_offer.seller_id then raise exception 'Only the seller can accept' using errcode = '42501'; end if;
  if v_offer.status <> 'pending' then raise exception 'Offer is not pending' using errcode = '22023'; end if;

  v_price := v_offer.proposed_price;
  perform public.price_offers_reserve_book(v_offer.book_id, v_offer.buyer_id);
  update public.price_offers set status = 'accepted' where id = _offer_id;
  perform public.price_offers_reject_others_on_book(v_offer.book_id, _offer_id);

  if v_offer.chat_id is not null then
    insert into public.messages (chat_id, sender_id, sender_name, text, kind, metadata)
    values (
      v_offer.chat_id, v_uid,
      coalesce((select display_name from public.profiles where id = v_uid), 'Vendeur'),
      '', 'system',
      jsonb_build_object('text', 'Proposition acceptée — le livre vous est réservé. Finalisez la transaction ici.')
    );
    update public.chats
    set last_message = 'Proposition acceptée',
        last_message_at = now(),
        unread_by = array(select distinct unnest(array_append(coalesce(unread_by, '{}'), v_offer.buyer_id))),
        deleted_for = '{}'::uuid[]
    where id = v_offer.chat_id;
  end if;

  insert into public.notifications (user_id, type, message, link)
  values (
    v_offer.buyer_id, 'price_offer',
    'Votre proposition de ' || v_price::text || ' € a été acceptée — le livre vous est réservé',
    case when v_offer.chat_id is not null then '/messages/' || v_offer.chat_id::text else null end
  );
end;
$$;
grant execute on function public.accept_price_offer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.counter_price_offer(
  _offer_id uuid,
  _counter_price numeric,
  _counter_message text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_offer record;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if _counter_price is null or _counter_price < 0 then raise exception 'Invalid counter price' using errcode = '22023'; end if;

  select * into v_offer from public.price_offers where id = _offer_id for update;
  if v_offer.id is null then raise exception 'Offer not found' using errcode = 'P0002'; end if;
  if v_uid <> v_offer.seller_id then raise exception 'Only the seller can counter' using errcode = '42501'; end if;
  if v_offer.status <> 'pending' then raise exception 'Offer is not pending' using errcode = '22023'; end if;
  if _counter_price > v_offer.original_price then raise exception 'Counter price cannot exceed listed price' using errcode = '22023'; end if;
  if _counter_price <= v_offer.proposed_price then raise exception 'Counter price must be higher than the buyer offer' using errcode = '22023'; end if;

  update public.price_offers
  set status = 'countered', counter_price = _counter_price, counter_message = _counter_message
  where id = _offer_id;

  if v_offer.chat_id is not null then
    insert into public.messages (chat_id, sender_id, sender_name, text, kind, metadata)
    values (
      v_offer.chat_id, v_uid,
      coalesce((select display_name from public.profiles where id = v_uid), 'Vendeur'),
      '', 'offer', jsonb_build_object('offer_id', _offer_id::text)
    );
    update public.chats
    set last_message = 'Contre-proposition : ' || _counter_price::text || ' €',
        last_message_at = now(),
        unread_by = array(select distinct unnest(array_append(coalesce(unread_by, '{}'), v_offer.buyer_id))),
        deleted_for = '{}'::uuid[]
    where id = v_offer.chat_id;
  end if;

  insert into public.notifications (user_id, type, message, link)
  values (
    v_offer.buyer_id, 'price_offer',
    'Le vendeur propose ' || _counter_price::text || ' € en contrepartie',
    case when v_offer.chat_id is not null then '/messages/' || v_offer.chat_id::text else null end
  );
end;
$$;
grant execute on function public.counter_price_offer(uuid, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.accept_counter_offer(_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_offer record;
  v_price numeric;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_offer from public.price_offers where id = _offer_id for update;
  if v_offer.id is null then raise exception 'Offer not found' using errcode = 'P0002'; end if;
  if v_uid <> v_offer.buyer_id then raise exception 'Only the buyer can accept the counter' using errcode = '42501'; end if;
  if v_offer.status <> 'countered' then raise exception 'Offer is not countered' using errcode = '22023'; end if;

  v_price := v_offer.counter_price;
  perform public.price_offers_reserve_book(v_offer.book_id, v_offer.buyer_id);
  update public.price_offers set status = 'accepted', proposed_price = v_offer.counter_price where id = _offer_id;
  perform public.price_offers_reject_others_on_book(v_offer.book_id, _offer_id);

  if v_offer.chat_id is not null then
    insert into public.messages (chat_id, sender_id, sender_name, text, kind, metadata)
    values (
      v_offer.chat_id, v_uid,
      coalesce((select display_name from public.profiles where id = v_uid), 'Acheteur'),
      '', 'system',
      jsonb_build_object('text', 'Contre-proposition acceptée — le livre est réservé. Finalisez la transaction ici.')
    );
    update public.chats
    set last_message = 'Contre-proposition acceptée',
        last_message_at = now(),
        unread_by = array(select distinct unnest(array_append(coalesce(unread_by, '{}'), v_offer.seller_id))),
        deleted_for = '{}'::uuid[]
    where id = v_offer.chat_id;
  end if;

  insert into public.notifications (user_id, type, message, link)
  values (
    v_offer.seller_id, 'price_offer',
    'L''acheteur a accepté votre contre-proposition de ' || v_price::text || ' €',
    case when v_offer.chat_id is not null then '/messages/' || v_offer.chat_id::text else null end
  );
end;
$$;
grant execute on function public.accept_counter_offer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.reject_counter_offer(_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_offer record;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_offer from public.price_offers where id = _offer_id for update;
  if v_offer.id is null then raise exception 'Offer not found' using errcode = 'P0002'; end if;
  if v_uid <> v_offer.buyer_id then raise exception 'Only the buyer can reject the counter' using errcode = '42501'; end if;
  if v_offer.status <> 'countered' then raise exception 'Offer is not countered' using errcode = '22023'; end if;

  update public.price_offers set status = 'rejected' where id = _offer_id;

  if v_offer.chat_id is not null then
    insert into public.messages (chat_id, sender_id, sender_name, text, kind, metadata)
    values (
      v_offer.chat_id, v_uid,
      coalesce((select display_name from public.profiles where id = v_uid), 'Acheteur'),
      '', 'system', jsonb_build_object('text', 'Contre-proposition refusée')
    );
    update public.chats
    set last_message = 'Contre-proposition refusée',
        last_message_at = now(),
        unread_by = array(select distinct unnest(array_append(coalesce(unread_by, '{}'), v_offer.seller_id))),
        deleted_for = '{}'::uuid[]
    where id = v_offer.chat_id;
  end if;

  insert into public.notifications (user_id, type, message, link)
  values (
    v_offer.seller_id, 'price_offer',
    'L''acheteur a refusé votre contre-proposition de ' || v_offer.counter_price::text || ' €',
    case when v_offer.chat_id is not null then '/messages/' || v_offer.chat_id::text else null end
  );
end;
$$;
grant execute on function public.reject_counter_offer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.expire_old_price_offers()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_expired record;
begin
  v_count := 0;
  for v_expired in
    select id, buyer_id, seller_id, chat_id, proposed_price, status
    from public.price_offers
    where status in ('pending', 'countered') and expires_at < now()
    for update
  loop
    update public.price_offers set status = 'expired' where id = v_expired.id;

    if v_expired.chat_id is not null then
      insert into public.messages (chat_id, sender_id, sender_name, text, kind, metadata)
      values (
        v_expired.chat_id, v_expired.seller_id, 'Système', '',
        'system',
        jsonb_build_object('text',
          'La proposition de ' || v_expired.proposed_price::text || ' € a expiré (7 jours sans réponse)')
      );
      update public.chats
      set last_message = 'Proposition expirée',
          last_message_at = now(),
          deleted_for = '{}'::uuid[]
      where id = v_expired.chat_id;
    end if;

    insert into public.notifications (user_id, type, message, link) values
      (
        v_expired.buyer_id, 'price_offer',
        'Votre proposition de ' || v_expired.proposed_price::text || ' € a expiré',
        case when v_expired.chat_id is not null then '/messages/' || v_expired.chat_id::text else null end
      ),
      (
        v_expired.seller_id, 'price_offer',
        'Une proposition de ' || v_expired.proposed_price::text || ' € reçue a expiré faute de réponse',
        case when v_expired.chat_id is not null then '/messages/' || v_expired.chat_id::text else null end
      );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
grant execute on function public.expire_old_price_offers() to authenticated;
