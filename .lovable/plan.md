# Récap des actions Supabase

## 1) Appliquer les 6 nouvelles migrations
Via `supabase--migration`, j'exécuterai dans cet ordre exact le contenu de :
1. `20260527120000_secure_phone_column.sql`
2. `20260527120100_db_side_book_moderation.sql`
3. `20260527120200_harden_storage_buckets.sql`
4. `20260527120300_force_validated_uploads.sql`
5. `20260527120400_atomic_email_throttle.sql`
6. `20260527120500_unique_phone_constraint.sql`

Une migration par appel (l'outil les exécute séquentiellement). Si une échoue, je stoppe immédiatement et te remonte l'erreur SQL — je ne lance pas la suivante.

## 2) Déployer l'edge function `validate-book-image`
Via `supabase--deploy_edge_functions` avec `["validate-book-image"]`. Le fichier source `supabase/functions/validate-book-image/index.ts` est déjà dans le repo, le déploiement utilisera ce contenu. Si le déploiement échoue, je te remonte le log d'erreur.

## 3) Installer les 4 templates emails — ⚠️ pas possible automatiquement
Les templates d'emails d'auth Supabase (`Authentication → Email Templates`) **ne sont pas accessibles via les outils d'intégration Supabase** que j'ai à disposition. C'est exactement ce que dit ton `README.md` : "il faut les coller à la main une seule fois dans le dashboard".

Pour cette étape je ne peux que te lister précisément quoi faire — ce que je ferai après les étapes 1 et 2 :
- les 4 fichiers à ouvrir
- le template Supabase correspondant pour chacun
- les sujets recommandés (déjà dans ton README)
- le rappel de garder les variables `{{ .ConfirmationURL }}` etc.

## Ordre d'exécution
1. Migrations (6 appels séquentiels, stop au premier échec)
2. Déploiement edge function
3. Instructions copier-coller pour les templates emails

Confirme-moi et je lance.