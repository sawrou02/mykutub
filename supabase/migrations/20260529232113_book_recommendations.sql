-- Recommandations livres : RPCs SQL à la volée
--
-- Deux fonctions publiques :
--
-- (1) get_similar_books(_book_id, _limit) — Suggestions à partir d'un
--     livre donné : même catégorie + même langue (bonus si match),
--     prix proche, AUTRES vendeurs, status='available'. Pas de cache,
--     tri par proximité + récence.
--
-- (2) get_recommended_books(_user_id, _limit) — Suggestions personnelles
--     : agrège les catégories des livres favoris de l'utilisateur, puis
--     remonte des livres dans ces catégories. Exclut les livres de
--     l'utilisateur lui-même et ceux déjà mis en favori.

-- ---------------------------------------------------------------------------
create or replace function public.get_similar_books(_book_id uuid, _limit integer default 6)
returns setof public.books
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with current_book as (
    select category, language, price, seller_id
    from public.books
    where id = _book_id
  )
  select b.*
  from public.books b, current_book cb
  where b.id <> _book_id
    and b.status = 'available'
    and b.seller_id <> cb.seller_id
    and b.category = cb.category
    -- Tolère ±50% sur le prix (ou prix = 0 pour les dons gratuits)
    and (cb.price = 0 or b.price between cb.price * 0.5 and cb.price * 1.5)
  order by
    -- même langue d'abord (bonus de tri)
    case when b.language = cb.language then 0 else 1 end,
    -- proximité de prix
    abs(b.price - cb.price),
    b.created_at desc
  limit _limit;
$$;

grant execute on function public.get_similar_books(uuid, integer) to authenticated, anon;

-- ---------------------------------------------------------------------------
create or replace function public.get_recommended_books(_user_id uuid, _limit integer default 6)
returns setof public.books
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with fav_categories as (
    -- Top catégories vues dans les favoris de l'utilisateur
    select b.category, count(*) as freq
    from public.favorites f
    join public.books b on b.id = f.book_id
    where f.user_id = _user_id
    group by b.category
  ),
  fav_book_ids as (
    select book_id from public.favorites where user_id = _user_id
  )
  select b.*
  from public.books b
  left join fav_categories fc on fc.category = b.category
  where b.status = 'available'
    and b.seller_id <> _user_id
    and b.id not in (select book_id from fav_book_ids)
    and (
      -- Soit dans une catégorie favorite de l'utilisateur,
      fc.category is not null
      -- soit, si l'user n'a pas de favoris, fallback sur les
      -- livres les plus récents (tout retour > vide)
      or not exists (select 1 from fav_categories)
    )
  order by
    coalesce(fc.freq, 0) desc,
    b.created_at desc
  limit _limit;
$$;

grant execute on function public.get_recommended_books(uuid, integer) to authenticated;
