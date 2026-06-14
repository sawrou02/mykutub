# Phase 1 — Flow post-acceptation d'une proposition

Étendre le cycle de vie d'une `price_offers` au-delà de `accepted` pour couvrir :
**acceptée → expédiée → reçue → avis déposé**.

## 1. Base de données (migration)

`price_offers` :
- Étendre le check `status` avec : `'shipped'`, `'received'`.
- Nouvelles colonnes :
  - `shipped_at timestamptz`
  - `received_at timestamptz`
  - `tracking_carrier text` (optionnel, max 50)
  - `tracking_number text` (optionnel, max 100)
  - `review_id uuid` (FK `reviews.id` ON DELETE SET NULL)

Nouvelles fonctions RPC (SECURITY DEFINER) :
- `mark_offer_shipped(_offer_id uuid, _carrier text, _tracking text)` — seller only, status doit être `accepted`.
- `mark_offer_received(_offer_id uuid)` — buyer only, status doit être `shipped`.
- `mark_offer_not_received(_offer_id uuid)` — buyer only, déclenche notification vendeur sans changer le statut.

Notifications in-app (table `notifications` déjà existante) insérées dans chaque RPC.

## 2. Edge function `send-offer-notification-email`

Ajouter 3 nouveaux `kind` : `shipped`, `received`, `not_received`.
Sujets/corps FR adaptés.

## 3. UI — `MyOffersList.tsx`

Labels + couleurs pour les nouveaux statuts. Nouvelles actions :

**Onglet Reçues (vendeur)** :
- Statut `accepted` → bouton **« J'ai expédié le produit »** → ouvre `ShippedModal` (carrier + tracking optionnels).
- Statut `shipped` → badge « Expédiée » + détails tracking.
- Statut `received` → badge « Reçue ».

**Onglet Envoyées (acheteur)** :
- Statut `accepted` → message « En attente d'expédition par le vendeur ».
- Statut `shipped` → boutons **« J'ai bien reçu »** et **« Pas encore reçu »**.
- Sur « bien reçu » → RPC + ouverture immédiate de `LeaveReviewModal` (note 1-5 + commentaire) → insertion dans `reviews` + lien vers `price_offers.review_id`.

## 4. Composants nouveaux

- `src/components/ShippedModal.tsx`
- `src/components/LeaveReviewModal.tsx` (réutilisable depuis le flow de réservation existant)

## 5. Types

- Étendre `PriceOfferStatus` avec `shipped` + `received`.
- Ajouter champs optionnels dans le type `PriceOffer`.

## Hors-scope (déjà fait ou phase ultérieure)

- Avis lui-même (table `reviews` existe déjà).
- Charte / email FR / téléphone (Phase 3 — fait).
- Photos mobile (Phase 2 — après).

Je commence par la migration dès que tu valides.
