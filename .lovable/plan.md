# Plan d'implémentation

## 1. Navigation & header (rapide)

- **Supprimer** du menu : `À propos`, `FAQ`, `Contact` (header desktop + sheet mobile)
- **Ajouter une barre "Déposer une annonce"** en haut, bien visible (au-dessus ou intégrée au header), bouton CTA proéminent
- **Ajouter langues** Espagnol (🇪🇸) et Italien (🇮🇹) dans `LanguageSwitcher` + traductions dans `i18n.ts`

## 2. Favoris (nécessite DB)

Nouvelle table `favorites` :
```
id, user_id, book_id, created_at
UNIQUE(user_id, book_id)
RLS : user gère ses propres favoris
```
- Activer le bouton cœur dans `BookCard` → toggle réel (insert/delete) + état chargé depuis la DB
- Onglet **"Favoris"** dans `/profile` qui liste les livres mis en favori

## 3. Wording

- Renommer le badge `"Gratuit"` en `"Don"` partout (BookCard, book details, etc.)

## 4. Profil utilisateur enrichi

Étendre la table `profiles` :
```
+ avatar_url text
+ phone text
+ phone_visible boolean default false
+ city text
```
- Page `/profile` : section "Informations personnelles" éditable (photo upload, pseudo, téléphone + toggle visible/masqué, email lecture seule, ville)
- Storage bucket `avatars` pour les photos

## 5. Paramètres du compte

Nouvelle page `/settings` (ou section dans `/profile`) :
- **Changer mot de passe** : formulaire (mot de passe actuel + nouveau) → `supabase.auth.updateUser({ password })`
- **Notifications** : préférences email / push (table `notification_preferences` ou champs dans `profiles`)
- **Confidentialité** : qui peut voir mon téléphone (déjà couvert par `phone_visible`)
- **Suppression du compte** : bouton avec confirmation → server function admin qui supprime via `supabaseAdmin.auth.admin.deleteUser()`

## Détails techniques

- Storage : créer bucket public `avatars` avec RLS (user upload son propre dossier `{user_id}/...`)
- Suppression compte : server function `deleteAccount` avec `requireSupabaseAuth` + admin client
- Notifications push réelles non implémentées (juste les préférences stockées) — sauf si tu veux brancher un service

## Question : ordre de priorité ?

Tout faire en une fois est gros. Je propose de **commencer par 1 + 2 + 3** (navigation, favoris, wording) qui sont les plus visibles, puis enchaîner sur 4 + 5 (profil + paramètres) dans un second temps.

Confirme-moi : **on fait tout d'un coup** ou **on commence par 1+2+3** ?
