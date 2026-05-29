-- Fix : les nouveaux messages doivent ré-afficher un chat précédemment supprimé.
--
-- Avant ce patch, quand un utilisateur faisait "Supprimer la conversation",
-- son id était ajouté à chats.deleted_for. Les messages suivants (textes,
-- propositions de prix, transitions accepted/rejected) ne vidaient pas
-- ce tableau, donc la conversation restait invisible dans sa sidebar.
--
-- On corrige les RPCs price_offers (create + transition) pour qu'elles
-- vident chats.deleted_for à chaque écriture, comme le fait désormais
-- le code frontend pour les messages texte/image.

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

  -- Reset deleted_for so the chat resurfaces for any party that had
  -- previously deleted it locally.
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
        unread_by = array(select distinct unnest(array_append(coalesce(unread_by, '{}'), v_other))),
        deleted_for = '{}'::uuid[]
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
