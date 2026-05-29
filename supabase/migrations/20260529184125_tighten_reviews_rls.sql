-- Reviews : durcir la règle d'éligibilité côté backend
--
-- Avant ce patch, la politique RLS exigeait seulement qu'un chat existe
-- entre le reviewer et le seller. Le check "échange confirmé" (livre
-- effectivement donné/vendu au reviewer) n'était fait que côté frontend
-- (SellerReviews.tsx) — un utilisateur passant directement par l'API
-- pouvait laisser un avis sans avoir reçu le livre.
--
-- On remplace la politique INSERT pour exiger qu'il existe un livre du
-- vendeur ciblé qui a été soit réservé puis donné à l'acheteur, soit
-- vendu via une proposition de prix acceptée. Ça aligne la règle RLS
-- sur la logique métier déjà appliquée côté UI.

drop policy if exists "Authenticated users can create reviews" on public.reviews;

create policy "Authenticated users can create reviews after a transaction"
  on public.reviews
  for insert
  to authenticated
  with check (
    auth.uid() = reviewer_id
    and auth.uid() <> seller_id
    and exists (
      -- même chat entre les deux parties (ancre l'avis sur la conversation
      -- qui a porté la transaction)
      select 1 from public.chats c
      where c.id = reviews.chat_id
        and auth.uid() = any(c.participants)
        and reviews.seller_id = any(c.participants)
    )
    and (
      -- soit un livre du vendeur a été marqué donné/vendu à ce reviewer
      exists (
        select 1 from public.books b
        where b.seller_id = reviews.seller_id
          and b.reserved_by = auth.uid()
          and b.status in ('given', 'sold')
      )
      -- soit une proposition de prix entre ces deux a été acceptée
      or exists (
        select 1 from public.price_offers po
        where po.seller_id = reviews.seller_id
          and po.buyer_id = auth.uid()
          and po.status = 'accepted'
      )
    )
  );
