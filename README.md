# XXX — Frontend

Next.js app (App Router) for the XXX platform. Connects to the XXX NestJS backend at `http://localhost:3000`.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16.2.4 (App Router) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| State | Zustand |
| Real-time | socket.io-client |
| Icons | lucide-react |
| Image processing | Sharp (WebP conversion via Next.js image pipeline) |

---

## Setup

```bash
npm install
npm run dev -- --port 3001
```

App runs on `http://localhost:3001`. The backend must be running on `http://localhost:3000`.

`next.config.ts` proxies `/uploads/:path*` → `http://localhost:3000/uploads/:path*` so profile photos load without CORS issues.

---

## Screens

### Auth — `(auth)`

| Route | Description |
|---|---|
| `/login` | Email + password login. Stores JWT access token in Zustand. |
| `/register` | Registration form. Sends verification email via backend. |
| `/verify` | Email verification landing page (reads `?token=` from URL). |

### App — `(app)`

All app routes are protected. Unauthenticated users are redirected to `/login`.

#### `/dashboard`
Home screen after login.

#### `/discover`
Browse published profiles in a 2-col (mobile) / 3-col (desktop) grid. Skeleton loading state on initial fetch.

Filters: city (text, Enter to apply), gender, looking_for, age range (min/max), online-only toggle. Apply and reset buttons.

Each profile card shows photo, name + age, city, up to 3 interest chips, and an `OnlineIndicator` for status. "Verbinden" button posts to `POST /chat/requests`; the card switches to "Anfrage gesendet ✓" optimistically. Nickname links to `/profile/[nickname]`.

#### `/requests`
Incoming and outgoing contact requests. Accept / decline.

#### `/chat`
Conversation list. Partner online status shown via ring dot and `OnlineIndicator` label.

#### `/chat/[id]`
Real-time conversation page.

- Messages loaded from `GET /chat/conversations/:id/messages`.
- Partner nickname resolved via `GET /profile/user/:pid`; partner online status fetched from `GET /profile/:nickname`.
- WebSocket: emits `join_conversation`, `send_message`, `typing` (throttled to once per 2 s), `read_messages`; listens for `new_message` and `user_typing`.
- Optimistic send: message appears immediately with a pending spinner; replaced by confirmed message on `new_message` echo.
- Typing indicator: animated three-dot bubble, auto-hides after 3 s of silence.
- Delete own message: long-press (mobile) or right-click → bottom sheet confirmation → `DELETE /chat/messages/:id`. Deleted messages render as "Nachricht gelöscht".
- Scroll-to-bottom button appears when the sentinel div leaves the viewport (IntersectionObserver).
- Suppresses the bell unread badge for `message`-type notifications while this conversation is open.

**Not yet implemented:** `read_at` data exists in the message type but read receipts are not rendered in the UI.

#### `/notifications`
Full notification center.

- Loads from `GET /notifications`, hydrates `notificationStore`.
- Neu / Verlauf tabs split by `is_read`.
- Per-notification: click marks as read (`PATCH /notifications/:id/read`), trash icon deletes (`DELETE /notifications/:id`).
- "Alle als gelesen markieren" button in the Neu tab (`PATCH /notifications/read-all`).
- "Alle löschen" button in the Verlauf tab.
- Relative timestamps (gerade eben / vor N Min. / Std. / Tagen).
- Supports types: `message`, `match`, `system`, `ban`, `request` — each with its own icon and label.

#### `/profile`
View and edit own profile.

**View mode:** full-square photo (or initial-letter fallback), nickname + age overlay, city + `OnlineIndicator` overlay, bio, interest chips.

**Edit mode** (activated by "Bearbeiten" button):
- Photo: tap/click the overlay → hidden file input → client-side validation (JPEG/PNG/WebP, max 5 MB) → `POST /media/upload/profile-photo`; preview shown immediately from object URL.
- Nickname, city (inline inputs on photo), bio (textarea, 1000 char limit with counter), gender + looking_for (selects), `is_published` toggle.
- If nickname or gender is changed from the original loaded value, a warning banner appears inline ("einmal pro Jahr") before saving. Reverts to no-warning if the original value is restored. On save, a 400 from the backend with "einmal pro Jahr" surfaces as a user-friendly toast instead of the raw error.
- Interests: full list of available interests shown as toggleable chips; `POST`/`DELETE /profile/me/interests/:id` per toggle.
- Save writes `PUT /profile/me`, then re-fetches to confirm.

**Placeholder:** audio/voice message player — UI rendered at `opacity-40` with "Bald verfügbar" label, play button disabled.

#### `/settings`

Two tabs — **Einstellungen** and **Konto**.

**Einstellungen tab:**
- Profile visibility (`is_published`) toggle — auto-saves to `PUT /profile/me`; disabled if onboarding is not complete.
- Notification toggles — email (messages, matches, system) and push (messages, matches, system) — auto-save to `PUT /notifications/settings`.
- Theme toggle (dark/light) via `useThemeStore`.
- Font size selector (Normal / Groß / Sehr groß) — auto-saves to `PUT /profile/me`.
- High contrast and simple language toggles — auto-save to `PUT /profile/me`.
- UI language selector (Deutsch / English) — UI only, no save wired up yet.
- Live accessibility preview box.

**Konto tab:**
- **"Passwort ändern"** — placeholder only, shows "Bald verfügbar", no action. _(not implemented)_
- Logout button — `POST /auth/logout` + clears Zustand store; succeeds even if the backend is unreachable.
- **"Meine Daten exportieren" (DSGVO)** — placeholder only, shows "Bald verfügbar", no action. _(not implemented)_
- DSGVO retention notice (30-day soft-delete copy).
- "Konto löschen" — confirmation bottom sheet → `DELETE /auth/account` → clears auth store.

All saves show a toast (✓ success or ✗ error).

#### `/onboarding`
Profile setup wizard — required before the profile can be published or the app fully accessed.

---

## Navigation

### `TopNav` — `components/nav/TopNav.tsx`
Sticky header, visible on all app pages.

- Logo → `/dashboard`.
- Desktop nav links (Discover, Requests, Chat) with active-page highlight.
- **Status dot:** colored circle reflecting `status_visible` + `status_message` from `/profile/me`. Clicking opens a dropdown to set one of five statuses (Verfügbar, Suche Gespräch, Suche Date, Beschäftigt, Nicht stören) or toggle "Unsichtbar"; all save to `PUT /profile/me` optimistically.
- **Bell icon:** unread badge (count, max "9+") + pulse ring when `unreadCount > 0`. Dropdown shows last 5 notifications in Neu/Verlauf tabs; per-notification click navigates and marks read; trash deletes; "Alle als gelesen" button. Links to `/notifications` for the full view.
- Polls `GET /notifications` and `GET /chat/requests/incoming` every 30 s; injects a `_local` notification for newly seen pending requests.
- Settings and Profile icon links shown on desktop only.

**Known gap:** user avatar in the top-right corner is a hardcoded `?` placeholder — profile photo is not loaded there.

### `BottomNav` — `components/nav/BottomNav.tsx`
Fixed bottom bar, mobile only (`md:hidden`). Six items: Home, Discover, Requests, Chat, Profile, Einstellungen. Active item gets a filled icon in the primary color.

**Known gap:** no unread badge on the Chat or Requests items — the badge only appears in TopNav's bell.

---

## Known gaps

| Area | Gap |
|---|---|
| `TopNav` | Avatar placeholder (`?`) — profile photo not fetched |
| `chat/[id]` header | Generic user icon — partner photo not loaded |
| `BottomNav` | No unread badge on Chat or Requests tabs |
| `chat/[id]` | `read_at` exists on messages but read receipts not rendered |
| `settings` → Konto | "Passwort ändern" — shows "Bald verfügbar", no functionality |
| `settings` → Konto | "Meine Daten exportieren" (DSGVO) — shows "Bald verfügbar", no functionality |
| `profile` | Voice message player — rendered but fully disabled ("Bald verfügbar") |
| `settings` → Einstellungen | UI language selector (de/en) — local state only, not persisted |

---

## Auth

- JWT access token (15 min) stored in Zustand + persisted to `localStorage` via `persist` middleware.
- Refresh token stored as httpOnly cookie; rotated automatically by `fetchApi` on 401.
- `AuthProvider` (`components/AuthProvider.tsx`) fetches `/profile/me` on mount, populates the user store, applies accessibility settings, and establishes the global WebSocket connection.

---

## WebSocket

The socket is established globally in `AuthProvider` once the user profile loads. This means real-time notifications work on every page, not just the chat page.

**Module:** `lib/socket.ts` — singleton Socket.io client.

```ts
connect(token)  // creates socket with auth token; no-op if already connected
disconnect()    // tears down the socket
getSocket()     // returns the current Socket | null
reconnect(token) // force-reconnects with a new token
```

**Global listener** (`AuthProvider`): `new_message` → fires a bell notification for any incoming message across all conversations.

**Chat page listeners** (`app/(app)/chat/[id]/page.tsx`):

| Emitted | Received |
|---|---|
| `join_conversation` | `new_message` |
| `send_message` | `user_typing` |
| `typing` | |
| `read_messages` | |

Cleanup uses named handler references (`sock.off('event', handler)`) so the chat page never removes the global AuthProvider listener on unmount.

---

## Notifications

- **Store:** `lib/store/notificationStore.ts` (Zustand)
- **Sources:**
  - Backend `/notifications` polled every 30 s
  - Real-time `new_message` socket events (via global AuthProvider listener)
  - New pending contact requests polled every 30 s in `TopNav`
- **`_local` flag:** client-generated notifications are marked `_local: true` and skip the `PATCH /notifications/:id/read` call — they have no backend record.
- **Bell badge:** glows and pulses when `unreadCount > 0`.

---

## Components

### `OnlineIndicator` — `components/ui/OnlineIndicator.tsx`

Reusable online-status dot + optional status label.

```tsx
<OnlineIndicator is_online={true} status_message="available" size="sm" />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `is_online` | `boolean` | — | Green dot when true, gray when false |
| `status_message` | `string \| null` | `null` | Translated label shown next to dot |
| `size` | `'sm' \| 'md'` | `'sm'` | Dot size (`h-2 w-2` vs `h-3 w-3`) |

Status translations: `available` → Verfügbar · `looking_for_chat` → Suche Gespräch · `looking_for_date` → Suche Date · `busy` → Beschäftigt · `do_not_disturb` → Nicht stören.

Renders an accessible `aria-label` describing the combined state.

---

## Key notes

- `sender_id` on messages is the account UUID. Always use `user.user_id` (not `user.id`) for `isOwn` comparisons.
- Optimistic message send: message appears immediately with a pending indicator, replaced by the confirmed message on `new_message`.

---

## Changelog

### 2026-05-20 (latest)
- Profanity filter: new `lib/profanity.ts` — `leo-profanity` wrapper (`initProfanityFilter`, `blurText`, `hasProfanity`)
- `AuthProvider`: calls `initProfanityFilter()` on login/refresh to load the custom word list from `GET /moderation/wordlist`
- Chat (`/chat/[id]`): `MessageBubble` applies `blurText()` to incoming messages when `profanity_filter = true` on the current user's profile
- Public profile (`/profile/[nickname]`): `blurText()` applied to bio and `status_message` when `profanity_filter = true`; `photo_needs_review` field added to `PublicProfile` type
- Settings (`/settings`): "Schimpfwortfilter" toggle added under Theme (auto-saves `profanity_filter` via `PUT /profile/me`); `profanity_filter` field added to `Profile` type
- Discover (`/discover`): `photo_needs_review` field added to `Profile` type; photos with `photo_needs_review = true` show blur + "Wird überprüft" badge on the card
- Own profile (`/profile`): `photo_needs_review` field added to `Profile` type; photo gets an error ring + "Wird überprüft" badge when `photo_needs_review = true` (hidden during a fresh upload preview)
- `package.json`: added `leo-profanity ^1.9.0`

### 2026-05-19 (latest)
- New `OnlineIndicator` component (`components/ui/OnlineIndicator.tsx`) — green/gray dot + translated status label, accessible `aria-label`, sizes `sm`/`md`
- Chat list (`/chat`): green/gray ring dot overlaid on avatar; status_message label shown below message preview via `OnlineIndicator`; both driven by new `partner_is_online` / `partner_status_message` fields from the conversations API
- Chat header (`/chat/[id]`): `OnlineIndicator` shown below partner nickname; partner public profile fetched after nickname resolves to get `is_online` and `status_message`
- Public profile (`/profile/[nickname]`): `OnlineIndicator` (size `md`) shown below city; `PublicProfile` type extended with `is_online` and `status_message`
- Discover (`/discover`): `Profile` type extended with `status_message`; status label rendered in card info section below city when set
- Settings (`/settings`): "Datenschutz & Sichtbarkeit" section now includes "Online-Status anzeigen" toggle (`status_visible`) and Status dropdown (`status_message`); both auto-save to `PUT /profile/me` with optimistic update + toast
- `conversationStore`: `Conversation` type extended with `partner_is_online`, `partner_status_visible`, `partner_status_message`, `partner_last_active_at`

### 2026-05-19
- Settings: "Abmelden" (logout) button added to the Konto section — calls `POST /auth/logout` to clear the HttpOnly cookie, then clears Zustand store and redirects to `/login`; logout still succeeds if the backend request fails
- Settings: "Konto löschen" now functional — calls `DELETE /auth/account`, on success clears auth store and redirects to `/login`; shows inline error on failure with loading spinner during the request

### 2026-05-14
- Profile: clickable avatar triggers hidden file input — uploads to `POST /media/upload/profile-photo` as `multipart/form-data`
- Profile: client-side validation before upload — rejects non-image MIME types and files over 5 MB
- Profile: photo displayed immediately after successful upload; restored on page refresh via `photo_url` from `GET /profile/me`
- Profile: `photo_url` typed in `Profile` interface; pathname extracted from full URL so Next.js proxy handles the request
- `next.config.ts`: rewrite rule proxies `/uploads/*` to `http://localhost:3000/uploads/*` (avoids cross-origin image load)

### 2026-05-08 (latest)
- WebSocket moved to global `AuthProvider` — real-time notifications on all pages
- Notification center (`/notifications`) with type filters and mark-as-read
- Bell badge in `TopNav`: glow + pulse on unread, dropdown preview of last 5
- `setNotifications` merges `_local` entries instead of overwriting them
- Debug console.log statements removed from socket, store, and chat modules

### 2026-05-07
- `profile/page.tsx`: full profile editor — nickname/bio/city edit mode, interest add/remove, publish button, onboarding progress sidebar
- `settings/page.tsx`: accessibility settings with auto-save + live preview; notification toggles; delete account modal; DSGVO section
- Chat list: partner nickname resolved via `GET /profile/user/:id`
- Chat detail: partner nickname shown in header; typing indicator cleared on new message

### 2026-05-07
- Chat page: WebSocket support — real-time messages, typing indicator, read receipts, optimistic sends
- `isOwn` now uses `user.user_id` (account UUID) not `user.id` (profile UUID)
- `AuthProvider`: fixed double-fetch with `hasFetched` ref (React StrictMode-safe)

### 2026-05-04
- Initial setup: Next.js, Tailwind v4, navigation, auth flow, Zustand auth store, dashboard, discover, chat, requests
