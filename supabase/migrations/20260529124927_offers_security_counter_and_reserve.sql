-- Price offers : sécurité + contre-proposition + réservation auto à l'acceptation
--
-- 3 améliorations groupées :
--
-- (1) Sécurité — bloque les utilisateurs qui tenteraient d'injecter
--     `__system__:` ou `__offer__:` dans le texte d'un message normal.
--     Politique RLS RESTRICTIVE qui s'ajoute à l'existant : les insertions
--     directes (chat texte) ne peuvent plus utiliser ces préfixes réservés.
--     Les RPCs SECURITY DEFINER ne sont pas affectées (RLS bypassée).
--
-- (2) Contre-proposition — le vendeur peut proposer un prix intermédiaire
--     au lieu d'accepter ou refuser sec. Nouveau statut `countered` et 3
--     nouvelles RPCs : counter_price_offer (vendeur), accept_counter_offer
--     et reject_counter_offer (acheteur).
--
-- (3) Réservation auto — accepter une proposition (ou une contre acceptée
--     par l'acheteur) met le livre en `status='reserved'` et `reserved_by`
--     l'acheteur. Toutes les autres propositions pending sur ce livre
--     sont automatiquement rejetées et notifiées.

-- ---------------------------------------------------------------------------
-- (1) Anti-injection des préfixes réservés
-- ---------------------------------------------------------------------------

drop policy if exists "Block reserved message prefixes for users" on public.messages;
create policy "Block reserved message prefixes for users"
  on public.messages
  as restrictive
  for insert
  to authenticated
  with check (text !~ '^__(system|offer)__:');

-- ---------------------------------------------------------------------------
-- (2) Schéma : contre-proposition
-- ---------------------------------------------------------------------------

alter table public.price_offers
  add column if not exists counter_price numeric(10, 2)
    check (counter_price is null or counter_price >= 0),
  add column if not exists counter_message text
    check (counter_message is null or char_length(counter_message) <= 2500);

alter table public.price_offers
  drop constraint if exists price_offers_status_check;

alter table public.price_offers
  add constraint price_offers_status_check
  check (status in ('pending', 'countered', 'accepted', 'rejected', 'withdrawn'));

-- Index unique : une seule offre active (pending ou countered) par
-- (livre, acheteur). Remplace l'ancien index pending-only.
drop index if exists public.price_offers_one_pending_per_buyer;
create unique index if not exists price_offers_one_active_per_buyer
  on public.price_offers (book_id, buyer_id)
  where status in ('pending', 'countered');

-- ---------------------------------------------------------------------------
-- Helper interne : rejette toutes les autres propositions actives sur un livre
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
    update public.price_offers
    set status = 'rejected'
    where id = v_loser.id;

    if v_loser.chat_id is not null then
      insert into public.messages (chat_id, sender_id, sender_name, text)
      values (
        v_loser.chat_id,
        (select seller_id from public.books where id = _book_id),
        'Système',
        '__system__:Le livre a été réservé suite à une autre proposition acceptée'
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
      v_loser.buyer_id,
      'price_offer',
      'Le livre a été réservé suite à une autre proposition. Votre proposition de '
        || v_loser.proposed_price::text || ' € a été annulée.',
      case when v_loser.chat_id is not null then '/messages/' || v_loser.chat_id::text else null end
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper interne : marque le livre comme réservé
-- ---------------------------------------------------------------------------
create or replace function public.price_offers_reserve_book(
  _book_id uuid,
  _buyer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_reserved_by uuid;
begin
  select status, reserved_by into v_status, v_reserved_by
  from public.books where id = _book_id for update;

  if v_status is null then
    raise exception 'Book not found' using errcode = 'P0002';
  end if;

  if v_status = 'reserved' and v_reserved_by is distinct from _buyer_id then
    raise exception 'Book already reserved by another buyer' using errcode = '22023';
  end if;

  update public.books
  set status = 'reserved',
      reserved_by = _buyer_id,
      reserved_at = now()
  where id = _book_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- (3) accept_price_offer : réserve le livre + rejette les autres offres
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
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_offer from public.price_offers where id = _offer_id for update;
  if v_offer.id is null then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;
  if v_uid <> v_offer.seller_id then
    raise exception 'Only the seller can accept' using errcode = '42501';
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'Offer is not pending' using errcode = '22023';
  end if;

  v_price := v_offer.proposed_price;

  -- 1) Réserver le livre pour l'acheteur (échoue si déjà réservé par un autre)
  perform public.price_offers_reserve_book(v_offer.book_id, v_offer.buyer_id);

  -- 2) Passer l'offre à accepted
  update public.price_offers set status = 'accepted' where id = _offer_id;

  -- 3) Rejeter et notifier les autres offres actives sur ce livre
  perform public.price_offers_reject_others_on_book(v_offer.book_id, _offer_id);

  -- 4) Message système + notif pour l'acheteur
  if v_offer.chat_id is not null then
    insert into public.messages (chat_id, sender_id, sender_name, text)
    values (
      v_offer.chat_id,
      v_uid,
      coalesce((select display_name from public.profiles where id = v_uid), 'Vendeur'),
      '__system__:Proposition acceptée — le livre vous est réservé. Finalisez la transaction ici.'
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
    v_offer.buyer_id,
    'price_offer',
    'Votre proposition de ' || v_price::text || ' € a été acceptée — le livre vous est réservé',
    case when v_offer.chat_id is not null then '/messages/' || v_offer.chat_id::text else null end
  );
end;
$$;

grant execute on function public.accept_price_offer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- (2.1) counter_price_offer : vendeur propose un prix intermédiaire
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
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if _counter_price is null or _counter_price < 0 then
    raise exception 'Invalid counter price' using errcode = '22023';
  end if;

  select * into v_offer from public.price_offers where id = _offer_id for update;
  if v_offer.id is null then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;
  if v_uid <> v_offer.seller_id then
    raise exception 'Only the seller can counter' using errcode = '42501';
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'Offer is not pending' using errcode = '22023';
  end if;
  if _counter_price > v_offer.original_price then
    raise exception 'Counter price cannot exceed listed price' using errcode = '22023';
  end if;
  if _counter_price <= v_offer.proposed_price then
    raise exception 'Counter price must be higher than the buyer offer' using errcode = '22023';
  end if;

  update public.price_offers
  set status = 'countered',
      counter_price = _counter_price,
      counter_message = _counter_message
  where id = _offer_id;

  if v_offer.chat_id is not null then
    insert into public.messages (chat_id, sender_id, sender_name, text)
    values (
      v_offer.chat_id,
      v_uid,
      coalesce((select display_name from public.profiles where id = v_uid), 'Vendeur'),
      '__offer__:' || _offer_id::text
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
    v_offer.buyer_id,
    'price_offer',
    'Le vendeur propose ' || _counter_price::text || ' € en contrepartie',
    case when v_offer.chat_id is not null then '/messages/' || v_offer.chat_id::text else null end
  );
end;
$$;

grant execute on function public.counter_price_offer(uuid, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- (2.2) accept_counter_offer : acheteur accepte la contre-proposition
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
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_offer from public.price_offers where id = _offer_id for update;
  if v_offer.id is null then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;
  if v_uid <> v_offer.buyer_id then
    raise exception 'Only the buyer can accept the counter' using errcode = '42501';
  end if;
  if v_offer.status <> 'countered' then
    raise exception 'Offer is not countered' using errcode = '22023';
  end if;

  v_price := v_offer.counter_price;

  perform public.price_offers_reserve_book(v_offer.book_id, v_offer.buyer_id);

  update public.price_offers
  set status = 'accepted',
      proposed_price = v_offer.counter_price
  where id = _offer_id;

  perform public.price_offers_reject_others_on_book(v_offer.book_id, _offer_id);

  if v_offer.chat_id is not null then
    insert into public.messages (chat_id, sender_id, sender_name, text)
    values (
      v_offer.chat_id,
      v_uid,
      coalesce((select display_name from public.profiles where id = v_uid), 'Acheteur'),
      '__system__:Contre-proposition acceptée — le livre est réservé. Finalisez la transaction ici.'
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
    v_offer.seller_id,
    'price_offer',
    'L''acheteur a accepté votre contre-proposition de ' || v_price::text || ' €',
    case when v_offer.chat_id is not null then '/messages/' || v_offer.chat_id::text else null end
  );
end;
$$;

grant execute on function public.accept_counter_offer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- (2.3) reject_counter_offer : acheteur refuse la contre-proposition
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
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_offer from public.price_offers where id = _offer_id for update;
  if v_offer.id is null then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;
  if v_uid <> v_offer.buyer_id then
    raise exception 'Only the buyer can reject the counter' using errcode = '42501';
  end if;
  if v_offer.status <> 'countered' then
    raise exception 'Offer is not countered' using errcode = '22023';
  end if;

  update public.price_offers set status = 'rejected' where id = _offer_id;

  if v_offer.chat_id is not null then
    insert into public.messages (chat_id, sender_id, sender_name, text)
    values (
      v_offer.chat_id,
      v_uid,
      coalesce((select display_name from public.profiles where id = v_uid), 'Acheteur'),
      '__system__:Contre-proposition refusée'
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
    v_offer.seller_id,
    'price_offer',
    'L''acheteur a refusé votre contre-proposition de ' || v_offer.counter_price::text || ' €',
    case when v_offer.chat_id is not null then '/messages/' || v_offer.chat_id::text else null end
  );
end;
$$;

grant execute on function public.reject_counter_offer(uuid) to authenticated;
