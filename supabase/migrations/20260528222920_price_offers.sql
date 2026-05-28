-- Price offers feature
-- Buyer proposes a price to seller; seller accepts/rejects; chat-integrated.
--
-- A price_offer is anchored to a specific (book, buyer, seller) triplet.
-- Lifecycle: pending → (accepted | rejected | withdrawn).
-- Acceptance/rejection is final — buyer must create a new offer to retry.

create table if not exists public.price_offers (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  original_price numeric(10, 2) not null check (original_price >= 0),
  proposed_price numeric(10, 2) not null check (proposed_price >= 0),
  message text check (message is null or char_length(message) <= 2500),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_offers_distinct_parties check (buyer_id <> seller_id)
);

create index if not exists price_offers_book_idx on public.price_offers (book_id);
create index if not exists price_offers_buyer_idx on public.price_offers (buyer_id, created_at desc);
create index if not exists price_offers_seller_idx on public.price_offers (seller_id, created_at desc);
create index if not exists price_offers_chat_idx on public.price_offers (chat_id);

-- A buyer can only have ONE pending offer per book at a time.
create unique index if not exists price_offers_one_pending_per_buyer
  on public.price_offers (book_id, buyer_id)
  where status = 'pending';

-- updated_at trigger
create or replace function public.price_offers_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists price_offers_touch_updated_at on public.price_offers;
create trigger price_offers_touch_updated_at
  before update on public.price_offers
  for each row execute function public.price_offers_touch_updated_at();

-- RLS: reads only for parties involved; writes only via SECURITY DEFINER RPCs below.
alter table public.price_offers enable row level security;

drop policy if exists "price_offers read by buyer or seller" on public.price_offers;
create policy "price_offers read by buyer or seller"
  on public.price_offers
  for select
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Note: no INSERT/UPDATE/DELETE policies. All writes go through RPCs that
-- enforce business rules (ownership, status transitions, notifications).

-- ---------------------------------------------------------------------------
-- RPC: create_price_offer
-- Buyer creates an offer for a book; reuses/creates the (book, buyer, seller)
-- chat and posts an __offer__:<offer_id> system marker in it.
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
begin
  if v_buyer is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if _proposed_price is null or _proposed_price < 0 then
    raise exception 'Invalid proposed price' using errcode = '22023';
  end if;

  -- Pull book + seller info
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

  -- Find or create the chat between buyer and seller for this book
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

  -- Create the offer (unique partial index will reject duplicate pending)
  insert into public.price_offers (
    book_id, chat_id, buyer_id, seller_id,
    original_price, proposed_price, message
  ) values (
    _book_id, v_chat_id, v_buyer, v_seller,
    v_original_price, _proposed_price, _message
  )
  returning id into v_offer_id;

  -- Post a marker message in the chat so the offer renders as a card
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
      unread_by = array(select distinct unnest(array_append(coalesce(unread_by, '{}'), v_seller)))
  where id = v_chat_id;

  -- In-app notification for the seller
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

-- ---------------------------------------------------------------------------
-- Shared helper: transition a pending offer + notify + post system msg
-- ---------------------------------------------------------------------------
create or replace function public.price_offers_transition(
  _offer_id uuid,
  _expected_actor text, -- 'seller' or 'buyer'
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
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_offer from public.price_offers where id = _offer_id for update;
  if v_offer.id is null then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'Offer is no longer pending' using errcode = '22023';
  end if;

  if v_uid = v_offer.seller_id then
    v_actor_role := 'seller';
    v_other := v_offer.buyer_id;
  elsif v_uid = v_offer.buyer_id then
    v_actor_role := 'buyer';
    v_other := v_offer.seller_id;
  else
    raise exception 'Not a party to this offer' using errcode = '42501';
  end if;

  if v_actor_role <> _expected_actor then
    raise exception 'Wrong actor for this transition' using errcode = '42501';
  end if;

  update public.price_offers set status = _new_status where id = _offer_id;

  if v_offer.chat_id is not null then
    insert into public.messages (chat_id, sender_id, sender_name, text)
    values (
      v_offer.chat_id,
      v_uid,
      coalesce((select display_name from public.profiles where id = v_uid), 'Système'),
      '__system__:' || _chat_system_text
    );
    update public.chats
    set last_message = _chat_system_text,
        last_message_at = now(),
        unread_by = array(select distinct unnest(array_append(coalesce(unread_by, '{}'), v_other)))
    where id = v_offer.chat_id;
  end if;

  insert into public.notifications (user_id, type, message, link)
  values (
    v_other,
    'price_offer',
    _notify_other_text,
    case when v_offer.chat_id is not null then '/messages/' || v_offer.chat_id::text else null end
  );
end;
$$;

-- accept_price_offer (seller-only)
create or replace function public.accept_price_offer(_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_msg text;
begin
  select 'Votre proposition de ' || proposed_price::text || ' € a été acceptée'
    into v_msg
  from public.price_offers where id = _offer_id;

  perform public.price_offers_transition(
    _offer_id,
    'seller',
    'accepted',
    coalesce(v_msg, 'Votre proposition a été acceptée'),
    'Proposition acceptée — vous pouvez finaliser la transaction'
  );
end;
$$;

grant execute on function public.accept_price_offer(uuid) to authenticated;

-- reject_price_offer (seller-only)
create or replace function public.reject_price_offer(_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_msg text;
begin
  select 'Votre proposition de ' || proposed_price::text || ' € a été refusée'
    into v_msg
  from public.price_offers where id = _offer_id;

  perform public.price_offers_transition(
    _offer_id,
    'seller',
    'rejected',
    coalesce(v_msg, 'Votre proposition a été refusée'),
    'Proposition refusée'
  );
end;
$$;

grant execute on function public.reject_price_offer(uuid) to authenticated;

-- withdraw_price_offer (buyer-only)
create or replace function public.withdraw_price_offer(_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_msg text;
begin
  select 'L''acheteur a retiré sa proposition de ' || proposed_price::text || ' €'
    into v_msg
  from public.price_offers where id = _offer_id;

  perform public.price_offers_transition(
    _offer_id,
    'buyer',
    'withdrawn',
    coalesce(v_msg, 'L''acheteur a retiré sa proposition'),
    'Proposition retirée'
  );
end;
$$;

grant execute on function public.withdraw_price_offer(uuid) to authenticated;
