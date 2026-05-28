# Guide collaboration Claude × Lovable

Ce repo est édité par deux agents :

- **Lovable** : visuel, UI, frontend. Commit direct sur `main`.
- **Claude (via Claude Code)** : sécurité, base de données, edge functions,
  CI/CD, refactors lourds. Toujours via PR.

Ce document fixe les règles pour éviter qu'on se marche dessus.

## Qui touche à quoi

| Zone                                               | Owner principal            | Notes                                                   |
| -------------------------------------------------- | -------------------------- | ------------------------------------------------------- |
| `src/components/`, `src/routes/`, `src/styles.css` | Lovable                    | UI / UX                                                 |
| `src/integrations/supabase/types.ts`               | Supabase (auto-gen)        | **Ne pas éditer à la main**, ignoré par prettier        |
| `src/routeTree.gen.ts`                             | TanStack Router (auto-gen) | Régénéré au build, gitignoré                            |
| `.lovable/`                                        | Lovable                    | Métadonnées internes, ignoré par prettier               |
| `supabase/migrations/`                             | Claude                     | Lovable peut ajouter via son intégration ; Claude relit |
| `supabase/functions/`                              | Claude                     | Edge functions                                          |
| `supabase/email-templates/`                        | Claude                     | HTML hand-tuned, ignoré par prettier                    |
| `.github/workflows/`                               | Claude                     | CI                                                      |
| `AGENTS.md`, `README.md`                           | Claude                     | Doc projet                                              |

## Workflow

### Lovable

- Pousse directement sur `main`
- Si la CI échoue après un push Lovable, Claude répare via PR

### Claude

- Travaille sur des branches `claude/<slug>`
- Toujours ouvrir une PR (en draft tant que pas testé)
- Avant chaque session : `git pull origin main` pour récupérer le travail Lovable
- En cas de conflit, **rebase** sur `main` (jamais de merge "main into branch")

## Fichiers à ne jamais formater

Listés dans `.prettierignore` :

- `src/integrations/supabase/types.ts` (Supabase regen)
- `src/routeTree.gen.ts` (TanStack regen — gitignoré aussi)
- `.lovable/` (Lovable interne)
- `supabase/email-templates/` (HTML inline-styled pour clients mail)

## Actions Supabase manuelles

Certaines actions ne se font pas via le repo et restent à la charge de
l'utilisateur (ou de Lovable via son intégration Supabase) :

1. Appliquer les migrations (`supabase db push` ou SQL Editor)
2. Déployer les edge functions (`supabase functions deploy <nom>`)
3. Installer les templates emails (Authentication → Email Templates)

Voir `supabase/email-templates/README.md` pour les templates.
