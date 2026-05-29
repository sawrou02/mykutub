-- Rate limiting pour messages et reviews
--
-- Avant : seules les propositions de prix avaient un rate limit
-- (PR #6). Un user malveillant pouvait spammer 10 000 messages/min
-- ou créer un avis par chat avec un même vendeur en série.
--
-- (1) Messages : max 30 messages par user par minute glissante.
--     Implémenté en politique RLS RESTRICTIVE — bloque l'insert
--     direct dès que le seuil est dépassé. Les RPCs SECURITY
--     DEFINER (qui posent des messages système / offre) ne sont
--     pas concernées.
--
-- (2) Reviews : max 5 avis par reviewer par jour. La contrainte
--     UNIQUE existante (seller_id, reviewer_id, chat_id) reste —
--     ce nouveau cap est anti-spam global.

-- ---------------------------------------------------------------------------
-- (1) Rate limit messages
-- ---------------------------------------------------------------------------
drop policy if exists "Messages rate limit per user" on public.messages;
create policy "Messages rate limit per user"
  on public.messages
  as restrictive
  for insert
  to authenticated
  with check (
    (
      select count(*)
      from public.messages
      where sender_id = auth.uid()
        and created_at > now() - interval '1 minute'
    ) < 30
  );

-- ---------------------------------------------------------------------------
-- (2) Rate limit reviews
-- ---------------------------------------------------------------------------
drop policy if exists "Reviews rate limit per user" on public.reviews;
create policy "Reviews rate limit per user"
  on public.reviews
  as restrictive
  for insert
  to authenticated
  with check (
    (
      select count(*)
      from public.reviews
      where reviewer_id = auth.uid()
        and created_at > now() - interval '1 day'
    ) < 5
  );
