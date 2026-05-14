Three features to add to MyKutub. I'll need DB changes, realtime presence, and UI updates.

## 1. Online status (presence)

**DB (profiles table):**
- Add `is_online` boolean default false
- Add `last_seen` timestamp default now()

**Implementation:**
- New hook `usePresence()` mounted in `__root.tsx`: when user logs in, update `is_online=true, last_seen=now()`. On `beforeunload` + every 30s heartbeat update `last_seen`. On signOut/visibility hidden after timeout, set `is_online=false`.
- Realtime subscription on `profiles` to get live status updates.
- New component `<OnlineDot userId>` showing green/grey dot + "Vu il y a X min" via date-fns.

**Where shown:**
- Messages list (`messages.index.tsx`) next to each contact avatar
- Chat detail header (`messages.$id.tsx`) replacing static "En ligne"
- User profile page (`user.$id.tsx`)

## 2. Book reservation system (GIVV style)

**DB changes:**
- `books`: add `status` text default 'available' (`available|reserved|given`), `reserved_by` uuid, `reserved_at` timestamp
- New table `book_requests`: id, book_id, requester_id, requester_name, status (`pending|accepted|rejected`), created_at — RLS: requester can insert/view own; book seller can view/update requests on their books
- New table `notifications`: id, user_id, message, type, is_read, link, created_at — RLS: user can view/update own
- Realtime enabled on books, book_requests, notifications

**UI — book detail (`book.$id.tsx`):**
- Status badge (green/yellow/red) at top
- If viewer = seller: list of requesters with "Réserver" button per request, "Marquer comme donné", "Annuler réservation"
- If viewer ≠ seller: "Demander ce livre" button (creates a row in book_requests + notification to seller). Disabled with "Ce livre est déjà réservé / donné" if status ≠ available.

**Notifications:**
- When seller reserves: notify chosen requester ("Votre réservation est confirmée") + all other pending requesters ("Ce livre a été réservé par quelqu'un d'autre")
- When given: notify reserved_by
- Add a bell icon in `SiteHeader.tsx` showing unread count + dropdown with recent notifications (mark as read on click)

**Card display:** `BookCard.tsx` shows RÉSERVÉ / DÉJÀ DONNÉ overlay badge when applicable.

## 3. Messaging UI revamp

Rewrite `messages.index.tsx` + `messages.$id.tsx` into a single split-pane layout when on `/messages`:
- Desktop: 280px left sidebar (contacts with avatar, online dot, last message, unread badge) + centered chat area (max 800px)
- Mobile: sidebar only on `/messages`, full chat on `/messages/$id` (current behavior preserved)
- Bubbles: received left (muted bg), sent right (teal/primary bg)
- Read receipts: add `read_at` timestamp on `messages` table, show ✓ (sent) / ✓✓ (read, teal) on sender side
- Typing indicator: ephemeral via Supabase Realtime broadcast channel (`typing` event), show "X est en train d'écrire…" in chat header

**DB additions for messaging:**
- `messages`: add `read_at` timestamp nullable
- Mark messages as read when chat opened (update where chat_id = X and sender_id != me and read_at is null)

## Order of work

1. Migration: profiles columns, books columns, book_requests table, notifications table, messages.read_at, realtime publication
2. Presence hook + OnlineDot component, wire into root
3. Notifications bell in SiteHeader + notifications page integration
4. Book reservation UI in book.$id.tsx + BookCard badges
5. Messaging redesign with read receipts + typing

## Technical notes

- Reservation actions are sensitive — wrap in serverFn with `requireSupabaseAuth` to avoid client-side trust on seller_id checks.
- Presence cleanup uses `navigator.sendBeacon` to a server route `/api/public/presence-offline` (with user token verification) so closing tab reliably marks offline. Fallback: `last_seen` stale > 60s ⇒ treat as offline in UI.
- All new tables get RLS policies (own-rows pattern). `book_requests` policy lets the book's seller SELECT/UPDATE rows referencing their books.

Confirm and I'll execute the migration first, then code.