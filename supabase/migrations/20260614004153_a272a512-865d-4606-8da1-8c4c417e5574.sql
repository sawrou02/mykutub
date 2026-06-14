
-- 1. Extend status check
ALTER TABLE public.price_offers DROP CONSTRAINT IF EXISTS price_offers_status_check;
ALTER TABLE public.price_offers ADD CONSTRAINT price_offers_status_check
  CHECK (status = ANY (ARRAY['pending','countered','accepted','rejected','withdrawn','expired','shipped','received']));

-- 2. New columns
ALTER TABLE public.price_offers
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_carrier text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS review_id uuid REFERENCES public.reviews(id) ON DELETE SET NULL;

ALTER TABLE public.price_offers
  DROP CONSTRAINT IF EXISTS price_offers_tracking_carrier_check;
ALTER TABLE public.price_offers
  ADD CONSTRAINT price_offers_tracking_carrier_check
    CHECK (tracking_carrier IS NULL OR char_length(tracking_carrier) <= 50);
ALTER TABLE public.price_offers
  DROP CONSTRAINT IF EXISTS price_offers_tracking_number_check;
ALTER TABLE public.price_offers
  ADD CONSTRAINT price_offers_tracking_number_check
    CHECK (tracking_number IS NULL OR char_length(tracking_number) <= 100);

-- 3. RPC: seller marks shipped
CREATE OR REPLACE FUNCTION public.mark_offer_shipped(
  _offer_id uuid, _carrier text DEFAULT NULL, _tracking text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_offer record;
  v_msg text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING errcode='42501'; END IF;
  SELECT * INTO v_offer FROM public.price_offers WHERE id = _offer_id FOR UPDATE;
  IF v_offer.id IS NULL THEN RAISE EXCEPTION 'Offer not found' USING errcode='P0002'; END IF;
  IF v_uid <> v_offer.seller_id THEN RAISE EXCEPTION 'Only the seller can mark as shipped' USING errcode='42501'; END IF;
  IF v_offer.status <> 'accepted' THEN RAISE EXCEPTION 'Offer is not in accepted state' USING errcode='22023'; END IF;

  UPDATE public.price_offers
    SET status='shipped', shipped_at=now(),
        tracking_carrier=NULLIF(trim(_carrier),''),
        tracking_number=NULLIF(trim(_tracking),'')
    WHERE id = _offer_id;

  v_msg := 'Le vendeur a expédié votre commande';
  IF _tracking IS NOT NULL AND length(trim(_tracking)) > 0 THEN
    v_msg := v_msg || ' (suivi ' || coalesce(NULLIF(trim(_carrier),'')||' ','') || trim(_tracking) || ')';
  END IF;

  IF v_offer.chat_id IS NOT NULL THEN
    INSERT INTO public.messages (chat_id, sender_id, sender_name, text, kind, metadata)
    VALUES (v_offer.chat_id, v_uid,
      COALESCE((SELECT display_name FROM public.profiles WHERE id=v_uid),'Vendeur'),
      '', 'system', jsonb_build_object('text', v_msg));
    UPDATE public.chats
      SET last_message = 'Colis expédié', last_message_at = now(),
          unread_by = array(SELECT DISTINCT unnest(array_append(coalesce(unread_by,'{}'), v_offer.buyer_id))),
          deleted_for = '{}'::uuid[]
      WHERE id = v_offer.chat_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (v_offer.buyer_id, 'price_offer', v_msg,
    CASE WHEN v_offer.chat_id IS NOT NULL THEN '/messages/'||v_offer.chat_id::text ELSE NULL END);
END;
$$;

-- 4. RPC: buyer confirms received
CREATE OR REPLACE FUNCTION public.mark_offer_received(_offer_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_offer record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING errcode='42501'; END IF;
  SELECT * INTO v_offer FROM public.price_offers WHERE id = _offer_id FOR UPDATE;
  IF v_offer.id IS NULL THEN RAISE EXCEPTION 'Offer not found' USING errcode='P0002'; END IF;
  IF v_uid <> v_offer.buyer_id THEN RAISE EXCEPTION 'Only the buyer can confirm receipt' USING errcode='42501'; END IF;
  IF v_offer.status <> 'shipped' THEN RAISE EXCEPTION 'Offer is not in shipped state' USING errcode='22023'; END IF;

  UPDATE public.price_offers SET status='received', received_at=now() WHERE id = _offer_id;
  -- Mark book as sold
  UPDATE public.books SET status='sold' WHERE id = v_offer.book_id;

  IF v_offer.chat_id IS NOT NULL THEN
    INSERT INTO public.messages (chat_id, sender_id, sender_name, text, kind, metadata)
    VALUES (v_offer.chat_id, v_uid,
      COALESCE((SELECT display_name FROM public.profiles WHERE id=v_uid),'Acheteur'),
      '', 'system', jsonb_build_object('text','Acheteur a confirmé la réception du colis'));
    UPDATE public.chats
      SET last_message='Colis reçu', last_message_at=now(),
          unread_by=array(SELECT DISTINCT unnest(array_append(coalesce(unread_by,'{}'), v_offer.seller_id))),
          deleted_for='{}'::uuid[]
      WHERE id = v_offer.chat_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (v_offer.seller_id, 'price_offer',
    'L''acheteur a confirmé la réception du colis',
    CASE WHEN v_offer.chat_id IS NOT NULL THEN '/messages/'||v_offer.chat_id::text ELSE NULL END);
END;
$$;

-- 5. RPC: buyer signals not received (no status change)
CREATE OR REPLACE FUNCTION public.mark_offer_not_received(_offer_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_offer record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING errcode='42501'; END IF;
  SELECT * INTO v_offer FROM public.price_offers WHERE id = _offer_id FOR UPDATE;
  IF v_offer.id IS NULL THEN RAISE EXCEPTION 'Offer not found' USING errcode='P0002'; END IF;
  IF v_uid <> v_offer.buyer_id THEN RAISE EXCEPTION 'Only the buyer can signal' USING errcode='42501'; END IF;
  IF v_offer.status <> 'shipped' THEN RAISE EXCEPTION 'Offer is not in shipped state' USING errcode='22023'; END IF;

  IF v_offer.chat_id IS NOT NULL THEN
    INSERT INTO public.messages (chat_id, sender_id, sender_name, text, kind, metadata)
    VALUES (v_offer.chat_id, v_uid,
      COALESCE((SELECT display_name FROM public.profiles WHERE id=v_uid),'Acheteur'),
      '', 'system', jsonb_build_object('text','L''acheteur signale ne pas encore avoir reçu le colis'));
    UPDATE public.chats
      SET last_message='Colis non reçu', last_message_at=now(),
          unread_by=array(SELECT DISTINCT unnest(array_append(coalesce(unread_by,'{}'), v_offer.seller_id))),
          deleted_for='{}'::uuid[]
      WHERE id = v_offer.chat_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (v_offer.seller_id, 'price_offer',
    'L''acheteur signale ne pas encore avoir reçu le colis',
    CASE WHEN v_offer.chat_id IS NOT NULL THEN '/messages/'||v_offer.chat_id::text ELSE NULL END);
END;
$$;

-- 6. RPC: link review to offer (called after review insert)
CREATE OR REPLACE FUNCTION public.link_review_to_offer(_offer_id uuid, _review_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Auth required' USING errcode='42501'; END IF;
  UPDATE public.price_offers
    SET review_id = _review_id
    WHERE id = _offer_id AND buyer_id = v_uid;
END;
$$;

-- 7. Relax restrictive review policies so reviews are allowed after offer received
DROP POLICY IF EXISTS "Reviews require confirmed exchange" ON public.reviews;
CREATE POLICY "Reviews require confirmed exchange"
ON public.reviews AS RESTRICTIVE FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.books b
    WHERE b.seller_id = reviews.seller_id
      AND b.reserved_by = auth.uid()
      AND b.status IN ('given','sold')
  )
  OR EXISTS (
    SELECT 1 FROM public.price_offers po
    WHERE po.seller_id = reviews.seller_id
      AND po.buyer_id = auth.uid()
      AND po.status IN ('received','accepted')
  )
);
