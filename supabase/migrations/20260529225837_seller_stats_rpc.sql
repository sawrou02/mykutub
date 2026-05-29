-- Stats vendeur : taux d'acceptation et temps de réponse moyen
--
-- Expose une fonction publique get_seller_stats(_seller_id) qui agrège
-- l'historique des propositions de prix reçues par un vendeur :
--
--   - acceptance_rate : % d'offres acceptées parmi celles ayant reçu
--     une décision (accepted + rejected). On exclut pending (pas
--     encore traitée), countered (traitée mais sans réponse finale
--     du vendeur côté simple), expired et withdrawn (pas sa
--     décision).
--   - avg_response_seconds : temps moyen entre la création d'une
--     offre et sa première transition de statut, pour les offres
--     qui n'ont pas été contre-proposées. Sur le flow "simple"
--     (pending → accepted/rejected), updated_at = moment de la
--     décision du vendeur.
--   - total_received, accepted_count, rejected_count : compteurs.

create or replace function public.get_seller_stats(_seller_id uuid)
returns table (
  total_received bigint,
  accepted_count bigint,
  rejected_count bigint,
  pending_count bigint,
  countered_count bigint,
  expired_count bigint,
  withdrawn_count bigint,
  acceptance_rate numeric,
  avg_response_seconds numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with stats as (
    select
      count(*) as total,
      count(*) filter (where status = 'accepted') as acc,
      count(*) filter (where status = 'rejected') as rej,
      count(*) filter (where status = 'pending') as pen,
      count(*) filter (where status = 'countered') as cnt,
      count(*) filter (where status = 'expired') as exp,
      count(*) filter (where status = 'withdrawn') as wit,
      avg(
        extract(epoch from (updated_at - created_at))
      ) filter (
        where status in ('accepted', 'rejected')
          and counter_price is null
      ) as avg_resp
    from public.price_offers
    where seller_id = _seller_id
  )
  select
    total,
    acc,
    rej,
    pen,
    cnt,
    exp,
    wit,
    case
      when (acc + rej) > 0
        then round(100.0 * acc / (acc + rej), 1)
      else null
    end as acceptance_rate,
    case when avg_resp is null then null else round(avg_resp::numeric, 0) end as avg_response_seconds
  from stats;
$$;

grant execute on function public.get_seller_stats(uuid) to authenticated, anon;
