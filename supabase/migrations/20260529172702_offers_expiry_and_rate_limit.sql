-- Expiration auto à +7j + rate limiting des propositions
--
-- (1) Expiration : une proposition pending ou countered devient automatiquement
--     "expired" après 7 jours. Nouveau statut `expired`, colonne expires_at,
--     RPC `expire_old_price_offers()` à brancher sur pg_cron (ou à appeler
--     manuellement / via Edge Cron). En lazy, create_price_offer expire aussi
--     les anciennes offres du même livre avant de créer la nouvelle.
--
-- (2) Rate limit : max 5 propositions de prix créées par un acheteur dans
--     l'heure glissante. Empêche le spam et les attaques d'épuisement.

-- ---------------------------------------------------------------------------
-- (1.a) Schéma : statut expired + colonne expires_at
-- ---------------------------------------------------------------------------

alter table public.price_offers
  drop constraint if exists price_offers_status_check;
alter table public.price_offers
  add constraint price_offers_status_check
  check (status in ('pending', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired'));

alter table public.price_offers
  add column if not exists expires_at timestamptz;

-- Backfill : tout ce qui existe se voit attribuer created_at + 7j.
update public.price_offers
set expires_at = created_at + interval '7 days'
where expires_at is null;

alter table public.price_offers
  alter column expires_at set not null,
  alter column expires_at set default (now() + interval '7 days');

create index if not exists price_offers_expires_idx
  on public.price_offers (expires_at)
  where status in ('pending', 'countered');

-- ---------------------------------------------------------------------------
-- (1.b) Fonction publique : expire les vieilles offres encore actives
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
    where status in ('pending', 'countered')
      and expires_at < now()
    for update
  loop
    update public.price_offers
    set status = 'expired'
    where id = v_expired.id;

    if v_expired.chat_id is not null then
      insert into public.messages (chat_id, sender_id, sender_name, text)
      values (
        v_expired.chat_id,
        v_expired.seller_id,
        'Système',
        '__system__:La proposition de ' || v_expired.proposed_price::text
          || ' € a expiré (7 jours sans réponse)'
      );
      update public.chats
      set last_message = 'Proposition expirée',
          last_message_at = now(),
          deleted_for = '{}'::uuid[]
      where id = v_expired.chat_id;
    end if;

    -- Notifier les deux parties
    insert into public.notifications (user_id, type, message, link)
    values
      (
        v_expired.buyer_id,
        'price_offer',
        'Votre proposition de ' || v_expired.proposed_price::text || ' € a expiré',
        case when v_expired.chat_id is not null
             then '/messages/' || v_expired.chat_id::text else null end
      ),
      (
        v_expired.seller_id,
        'price_offer',
        'Une proposition de ' || v_expired.proposed_price::text
          || ' € reçue a expiré faute de réponse',
        case when v_expired.chat_id is not null
             then '/messages/' || v_expired.chat_id::text else null end
      );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.expire_old_price_offers() to authenticated;

-- ---------------------------------------------------------------------------
-- (1.c) Cron : exécution toutes les 10 min si pg_cron est disponible
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Annule un éventuel job précédent du même nom
    perform cron.unschedule('expire-price-offers')
    from cron.job where jobname = 'expire-price-offers';

    perform cron.schedule(
      'expire-price-offers',
      '*/10 * * * *',
      $cron$ select public.expire_old_price_offers(); $cron$
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- (2) Rate limiting + expiration lazy dans create_price_offer
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

  -- (2.a) Rate limit : max 5 propositions / heure glissante par acheteur
  select count(*) into v_recent_count
  from public.price_offers
  where buyer_id = v_buyer
    and created_at > now() - interval '1 hour';

  if v_recent_count >= 5 then
    raise exception 'Rate limit: trop de propositions récentes (max 5 / heure)'
      using errcode = '54000';
  end if;

  -- (2.b) Expiration lazy : nettoie les vieilles offres du même livre avant
  -- d'évaluer le verrou d'unicité partielle.
  update public.price_offers
  set status = 'expired'
  where book_id = _book_id
    and status in ('pending', 'countered')
    and expires_at < now();

  select seller_id, title, image_url, price, status, is_donation
    into v_seller, v_book_title, v_book_image, v_original_price, v_book_status, v_is_donation
  from public.books
  where id = _book_id;

  if v_seller is null then
    raise exception 'Book not found' using errcode = 'P0002';
  end if;

  if v_seller = v_buyer then
    raise exception 'Cannot make an offer on your own book' using errcode = '42501';
  end if;

  if v_is_donation then
    raise exception 'Cannot make a price offer on a donation' using errcode = '22023';
  end if;

  if v_book_status is distinct from 'available' then
    raise exception 'Book is not available' using errcode = '22023';
  end if;

  if _proposed_price > v_original_price then
    raise exception 'Proposed price cannot exceed listed price' using errcode = '22023';
  end if;

  select id into v_chat_id
  from public.chats
  where book_id = _book_id
    and participants @> array[v_buyer, v_seller]::uuid[]
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

  insert into public.messages (chat_id, sender_id, sender_name, text)
  values (
    v_chat_id,
    v_buyer,
    coalesce((select display_name from public.profiles where id = v_buyer), 'Acheteur'),
    '__offer__:' || v_offer_id::text
  );

  update public.chats
  set last_message = 'Proposition : ' || _proposed_price::text || ' €',
      last_message_at = now(),
      unread_by = array(select distinct unnest(array_append(coalesce(unread_by, '{}'), v_seller))),
      deleted_for = '{}'::uuid[]
  where id = v_chat_id;

  insert into public.notifications (user_id, type, message, link)
  values (
    v_seller,
    'price_offer',
    'Nouvelle proposition de prix de ' || _proposed_price::text || ' € pour « ' || v_book_title || ' »',
    '/messages/' || v_chat_id::text
  );

  return v_offer_id;
end;
$$;

grant execute on function public.create_price_offer(uuid, numeric, text) to authenticated;
