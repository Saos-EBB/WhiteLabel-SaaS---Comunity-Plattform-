# XXX — Frontend

Next.js app (App Router) for the XXX platform. Connects to the XXX NestJS backend at `http://localhost:3000`.

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 16.2.4 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| State management | Zustand (with `persist` middleware) |
| Real-time | socket.io-client |
| Payments | `@stripe/react-stripe-js` + `@stripe/stripe-js` (Embedded Checkout) |
| Icons | lucide-react |
| Image processing | Sharp (WebP conversion via Next.js image pipeline) |
| Profanity filter | leo-profanity |
| HTTP client | `lib/api.ts` (`fetchApi` wrapper — handles 401 refresh rotation, 204 responses) |

---

## Setup

```bash
npm install
npm run dev -- --port 3001
```

App runs on `http://localhost:3001`. The backend must be running on `http://localhost:3000`.

Copy `.env.example` to `.env.local` and fill in the values.

`next.config.ts` proxies `/uploads/:path*` → `http://localhost:3000/uploads/:path*` so profile photos and audio files load without CORS issues.

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g. `http://localhost:3000/api/v1`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for Embedded Checkout |
| `NEXT_PUBLIC_BAN_SCREEN_TEXT` | Text shown on the ban overlay (falls back to `config/public.config.ts` default) |
| `NEXT_PUBLIC_COMPANY_NAME` | Company name used in Impressum and Datenschutz pages |
| `NEXT_PUBLIC_COMPANY_*` | Address/contact fields for legal pages |
| `NEXT_PUBLIC_CONTACT_*` | WhatsApp, Instagram, email, phone for the B2B contact section |
| `NEXT_PUBLIC_COPYRIGHT_YEAR` | Year shown in the auth layout footer copyright line |
| `NEXT_PUBLIC_BRAND_NAME` | Brand name shown in the auth layout footer |

---

## Key Features

### Auth & Onboarding
- JWT access token (15 min) in Zustand; refresh token in HttpOnly cookie rotated automatically by `fetchApi` on 401
- `AuthProvider` fetches `/profile/me` on mount, populates user store, establishes global WebSocket, and applies accessibility settings
- Multi-step onboarding wizard required before profile can be published
- Consent flow (`/consent`) after registration

### Discover
- 2-col (mobile) / 3-col (desktop) profile grid with skeleton loading
- Filters: `CityAutocomplete` city picker (sends `lat`/`lng`/`radius` to backend), gender, looking_for, age range, online-only; radius slider (10–500 km) enabled once a city is selected
- "Verbinden" sends contact request optimistically; connected profiles show "Chatten →" and "Verbindung trennen"
- "Verbindung trennen" calls `DELETE /chat/connections/:userId` with a bottom-sheet confirmation

### Real-time Chat
- Conversation list with partner online status
- Chat page: WebSocket-powered with optimistic message send (pending spinner → confirmed on echo)
- Typing indicator: animated three-dot bubble, auto-hides after 3 s
- Delete own message: long-press (mobile) or right-click → bottom sheet → `DELETE /chat/messages/:id`
- Scroll-to-bottom button via `IntersectionObserver`
- Block detection: input disabled + banner when either party has blocked the other
- Three-dot header menu: delete chat, report user, block user

### Notification Center
- Real-time delivery via `notification` socket event (no polling required)
- Bell badge with count (max "9+") + pulse ring in `TopNav`
- Dropdown preview in `TopNav` (last 5); full center at `/notifications`
- Tabs: Neu / Verlauf; mark-as-read, delete, "Alle als gelesen markieren"
- Supported types: `message`, `match`, `system`, `ban`, `request`

### Admin Panel (`/admin`)
Accessible to `role: admin` or `role: owner` users. Auth guard waits for Zustand `persist` hydration before checking role.

| Tab | Description |
|---|---|
| Tickets | Admin ticket queue (moderation + support requests); support tickets show email, optional nickname + public ID |
| Medien | Photo moderation queue — swipe view (approve → / reject ←) or grid; type filter (Alle / Fotos / Audio) |
| Nutzer | Paginated user list with role/ban filters; inline role change; `BanModal` for bans |
| Meldungen | Paginated reports filtered by status; inline status + note editing |
| Strikes | Paginated strikes; "Neuer Strike" modal with debounced nickname search |
| Schimpfwörter | Custom profanity word list; add/delete words |
| Einstellungen | System settings key/value editor — `owner` only |
| Verwaltung | **Owner only.** Admin account list (paginated) + "Admin erstellen" form; "Abonnement-Preise" editor; **Dashboard** accordion with platform stats (lazy-loaded via `GET /admin/dashboard/stats`, refresh button) |

### Ban Screen
- `BanScreen` component: full-screen overlay (`z-[9999]`) shown when `isBanned` is `true` in auth store
- Ban state derived from `/profile/me` on startup and from `user.banned` / `user.unbanned` socket events
- `isBanned` is in-memory only — never persisted to `localStorage`
- Plays a random audio clip from `public/ban-audio/` (looped); text sourced from `PUBLIC_CONFIG.banScreen.text`
- "Abmelden" clears auth store and redirects to `/login`

### Settings (`/settings`)
Accordion layout — one section open at a time with CSS `grid-rows` height transition.

| Section | Contents |
|---|---|
| Design & Barrierefreiheit | Theme toggle, profanity filter, font size, high contrast, simple language, UI language selector |
| Benachrichtigungen | Email + push notification toggles |
| Sichtbarkeit | `is_published` master toggle + 7 field visibility toggles (`status_visible`, `show_bio`, `show_city`, `show_age`, `show_gender`, `show_interests`, `show_audio`) |
| Konto | Subscription info, GDPR data export (PDF download), **Passwort ändern** (fully functional — `PATCH /auth/change-password`), **E-Mail ändern** (fully functional — `PATCH /auth/change-email`), account delete |
| Sicherheit & Blockierungen | Blocked user list with inline unblock |
| Abonnement & Zahlung | Subscription detail, Stripe Embedded Checkout, cancel flow |
| Support | Report modal (nickname-lookup mode) |

### Public Profiles
- `/profile/[nickname]` — public view; fields masked by backend `show_*` flags
- Online status, status message, interests, audio player
- Connect/disconnect, block, and report actions

### i18n
- UI language selector in Settings (Deutsch / English) — structure in place, currently local state only
- German ("Leichte Sprache") toggle persisted via `PUT /profile/me`
- All user-facing strings in German by default; English label set present

### Runtime Configuration (`config/public.config.ts`)
- `PUBLIC_CONFIG` exported object for settings that need to be configurable without a rebuild
- Currently: `banScreen.text` and `banScreen.audioFiles`
- Falls back to `NEXT_PUBLIC_*` env vars or hardcoded defaults

---

## Screens

### Auth — `(auth)`

The auth layout (`app/(auth)/layout.tsx`) wraps all auth routes with a sticky footer showing the copyright year (`NEXT_PUBLIC_COPYRIGHT_YEAR`), brand name (`NEXT_PUBLIC_BRAND_NAME`), and Impressum / Datenschutz links.

| Route | Description |
|---|---|
| `/login` | Email or nickname + password login. Stores JWT access token in Zustand. Shows a success banner when redirected from `/setup?setup=done`. "Support kontaktieren" button opens `ContactSupportModal`. |
| `/register` | Registration form. Sends verification email via backend. |
| `/setup` | One-time owner bootstrap wizard. Checks `GET /setup/status` on load; redirects to `/login` if setup is already complete. Form creates the first owner account via `POST /setup`. |
| `/verify` | Email verification landing page (reads `?token=` from URL). |
| `/consent` | AGB / privacy consent flow after registration. |

### App — `(app)`

All app routes are protected. Unauthenticated users are redirected to `/login`.

#### `/dashboard`
Home screen after login. Shows role badge (Crown/Shield) in the welcome heading for owner/admin users, then three stat sections:
- **Mein Überblick** (all users): pending contact requests, active conversation count, subscription status — via `GET /admin/dashboard/user-stats`
- **Moderations-Überblick** (admin + owner): open reports, open tickets, pending media, strikes this week — via `GET /admin/dashboard/admin-stats`
- **Plattform-Übersicht** (owner only): full platform metrics grid (users, activity, revenue, moderation) — via `GET /admin/dashboard/stats`

Followed by quick-access cards (Discover, Chat, Requests) and recent notifications.

#### `/discover`
Browse published profiles in a 2-col (mobile) / 3-col (desktop) grid. Skeleton loading state on initial fetch.

Filters: city (text, Enter to apply), gender, looking_for, age range (min/max), online-only toggle. Apply and reset buttons.

Each profile card shows photo, name + age, city, up to 3 interest chips, and an `OnlineIndicator` for status. "Verbinden" button posts to `POST /chat/requests`; the card switches to "Anfrage gesendet ✓" optimistically. Nickname links to `/profile/[nickname]`. Connected profiles show "Chatten →" and a "Verbindung trennen" button; the latter opens a bottom sheet confirmation and calls `DELETE /chat/connections/:userId` (deletes chat for both sides).

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
- **Three-dot menu** (header): "Chat löschen" (DELETE own copy, navigates to `/chat`), "User melden" (opens `ReportModal`), "Nutzer blockieren" (bottom sheet → `POST /profile/me/block/:userId`).
- **Block banner:** when `is_blocked = true` (either direction) the input is disabled and a banner shows "Dieser Nutzer hat dich blockiert." or "Du kannst diesem Nutzer keine Nachrichten senden." Partner name replaced with "XXXX" when blocked.

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

Audio voice message: `AudioPlayer` component renders the uploaded clip with play/pause, seek bar, and elapsed/total timestamp. Delete button shown only in edit mode.

#### `/settings`

Accordion layout — single section open at a time, CSS `grid-rows` height transition.

**A) Design & Barrierefreiheit:**
- Theme toggle (dark/light) via `useThemeStore`.
- Schimpfwortfilter toggle — auto-saves `profanity_filter` to `PUT /profile/me`.
- Font size selector (Normal / Groß / Sehr groß) — auto-saves to `PUT /profile/me`.
- High contrast and simple language toggles — auto-save to `PUT /profile/me`.
- UI language selector (Deutsch / English) — UI only, not persisted.
- Live accessibility preview box.

**B) Benachrichtigungen:**
- Email and push notification toggles (messages, matches, system) — auto-save to `PUT /notifications/settings`.

**C) Sichtbarkeit:**
- Master `is_published` toggle ("Profil öffentlich") — auto-saves to `PUT /profile/me`; disabled if onboarding not complete. Helper text: "Nickname und Profilbild sind immer sichtbar".
- 7 individual field toggles (auto-save via `PUT /profile/me`, dimmed/disabled when `is_published = false`): Online-Status (`status_visible`), Bio (`show_bio`), Stadt (`show_city`), Alter (`show_age`), Geschlecht & Suche (`show_gender`), Interessen (`show_interests`), Vorstellung / Audio (`show_audio`). Values are preserved while dimmed — not reset.

**D) Konto:**
- Subscription info sourced from `GET /profile/me` (`subscription` field) — shows plan badge, status label, and expiry date; displays "Kein aktives Abonnement" when `null`.
- **Daten exportieren (PDF)** — calls `GET /gdpr/export`; downloads the response as a PDF blob (`paarship-daten-export.pdf`). Rate-limit (403) shows cooldown message in amber; other errors show red message. DSGVO hint ("max. 1× pro 30 Tage") shown below the button. Spinner while loading.
- **Passwort ändern** (nested sub-accordion within Konto) — current password + new password + confirmation; show/hide toggles; calls `PATCH /auth/change-password`; success state clears fields.
- **E-Mail ändern** (nested sub-accordion within Konto) — current password + new email address; calls `PATCH /auth/change-email`; success state clears fields.
- **Konto löschen** — focus-trapped confirmation dialog; calls `DELETE /auth/account`, clears auth store and redirects to `/login` on success; shows inline error on failure with spinner during the request.
- Logout button — `POST /auth/logout` + clears Zustand store; succeeds even if the backend is unreachable.

**E) Sicherheit & Blockierungen:**
- Blocked user list lazy-loaded from `GET /profile/me/blocks` when the section is first opened. Shows avatar, nickname, and an "Entsperren" button.
- Unblock flow: tap "Entsperren" → inline confirmation ("Bestätigen" / "Abbrechen") → `DELETE /profile/me/block/:userId`; user removed from list on success with success toast.

**F) Abonnement & Zahlung:**
- Subscription detail fetched lazily from `GET /payment/subscriptions` when the accordion is first opened — not on page mount.
- **Active subscription:** plan label (Monatlich / Jährlich / Lebenslang), "Aktiv" badge, expiry date in de-DE format (hidden for lifetime plan). Cancel button ("Abonnement kündigen") reveals an inline confirmation step ("Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden." + Bestätigen / Abbrechen) before calling `DELETE /payment/subscriptions/:id`; on success profile is re-fetched.
- **No active subscription:** "Kein aktives Abonnement" message and three plan buttons (Monatlich / Jährlich / Lebenslang) with prices fetched from `GET /system-settings/prices` shown inline (e.g. "Monatlich — €9.99"). Clicking any plan opens `StripeCheckoutModal` with the selected plan.
- **Hidden for admin/owner users:** the entire Abonnement & Zahlung section is not rendered when the user's role is `admin` or `owner`.

**G) Support:**
- "Problem melden" button opens `ReportModal` without a pre-filled user (nickname lookup mode).

All saves show a toast (✓ success or ✗ error).

#### `/onboarding`
Profile setup wizard — required before the profile can be published or the app fully accessed.

#### `/admin`
Admin panel — accessible to `role: admin` or `role: owner` users. Auth guard waits for Zustand `persist` hydration before evaluating the JWT role to prevent false redirects on first render.

Eight tabs (`owner` sees all; `admin` does not see **Verwaltung**):

| Tab | Description |
|---|---|
| Tickets | Admin ticket queue. Two sub-lists: moderation tickets (nickname / image / audio) and support requests. Support requests show submitter email, optional nickname and public ID, message body, and timestamp. |
| Medien | Photo/audio moderation. **Swipe view**: full-screen one-card-at-a-time workflow — approve with → key / right-arrow button, reject with ← key / left-arrow button; audio cards show filename + Play/Pause (Spacebar); type filter (Alle / Fotos / Audio); counter ("3 von 12"); tilt animation. Photos proxied via Next.js (`/uploads/…`) to avoid CORS. |
| Nutzer | Paginated user list with role/banned filters and nickname search. Inline role selector; ban/unban actions via `BanModal`. |
| Meldungen | Paginated report list filtered by status. Inline status + note editing per report. |
| Strikes | Paginated strike list. "Neuer Strike" modal — type (`warning`, `temp`, `permanent`), **nickname search** (debounced lookup, select from results), reason, optional expiry. |
| Schimpfwörter | Custom profanity word list. Add / delete words; persisted to `profanity_words` table via backend. |
| Einstellungen | System settings key/value editor. **Owner only.** |
| Verwaltung | **Owner only.** Four accordion sub-sections: (A) "Dashboard" — platform stats grid (users, activity, revenue, moderation) lazy-loaded via `GET /admin/dashboard/stats` with a refresh button and skeleton loading; (B) admin account list (paginated, `GET /admin/admins`) — shows nickname, role badge, verified status, last login; (C) "Admin erstellen" form (`POST /admin/users/create`) — email, password, nickname; (D) "Abonnement-Preise" — edit monthly/yearly/lifetime prices via `PATCH /system-settings/prices`, confirmation modal before saving; note to keep prices in sync with Stripe. |

### Public — `(public)`

| Route | Description |
|---|---|
| `/profile/[nickname]` | Public profile page. Visibility flags respected. Connect, block, and report actions. |
| `/impressum` | Impressum (§ 5 TMG/ECG). Company details from `NEXT_PUBLIC_COMPANY_*` env vars. |
| `/datenschutz` | Full Datenschutzerklärung (7 sections). |
| `/agb` | AGB. |
| `/b2b` | B2B landing page. Contact section from `NEXT_PUBLIC_CONTACT_*` env vars. |

---

## Navigation

### `TopNav` — `components/nav/TopNav.tsx`
Sticky header, visible on all app pages.

- Logo → `/dashboard`.
- Desktop nav links (Discover, Requests, Chat) with active-page highlight.
- **Status indicator:** `OnlineIndicator` (dot only, label suppressed) inside the status button, reflecting `status_visible` + `status_message` from `/profile/me`. Clicking opens a dropdown to set one of five statuses (Verfügbar, Suche Gespräch, Suche Date, Beschäftigt, Nicht stören) or toggle "Unsichtbar"; all save to `PUT /profile/me` optimistically.
- **Bell icon:** unread badge (count, max "9+") + pulse ring when `unreadCount > 0`. Dropdown shows last 5 notifications in Neu/Verlauf tabs; per-notification click navigates and marks read; trash deletes; "Alle als gelesen" button. Links to `/notifications` for the full view.
- Polls `GET /notifications` and `GET /chat/requests/incoming` every 30 s; injects a `_local` notification for newly seen pending requests.
- Settings icon link visible on all screen sizes; Profile icon link shown on desktop only.

**Known gap:** user avatar in the top-right corner is a hardcoded `?` placeholder — profile photo is not loaded there.

### `BottomNav` — `components/nav/BottomNav.tsx`
Fixed bottom bar, mobile only (`md:hidden`). Five items: Home, Discover, Requests, Chat, Profile. Active item gets a filled icon in the primary color.

**Known gap:** no unread badge on the Chat or Requests items — the badge only appears in TopNav's bell.

---

## Auth

- JWT access token (15 min) stored in Zustand + persisted to `localStorage` via `persist` middleware.
- Refresh token stored as httpOnly cookie; rotated automatically by `fetchApi` on 401.
- `AuthProvider` (`components/AuthProvider.tsx`) fetches `/profile/me` on mount, populates the user store, applies accessibility settings, and establishes the global WebSocket connection. If the response includes `is_banned: true`, `setBanned(true)` is called immediately and the ban screen is shown.
- `isBanned` in `authStore` is **in-memory only** — not persisted to `localStorage`. Ban state is always derived from the backend on startup (via `/profile/me`) or in real-time (via `user.banned` / `user.unbanned` socket events). This prevents stale ban state surviving across sessions.
- Ban screen (`components/ui/BanScreen.tsx`): full-screen overlay shown when `isBanned` is true. Plays a random audio clip from `public/ban-audio/`. Shows a logout button that calls `POST /auth/logout`, clears auth store, and redirects to `/login`.

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

**Global listeners** (`AuthProvider`):
- `new_message` → fires a bell notification for any incoming message across all conversations.
- `notification` → hydrates `notificationStore` with the incoming notification in real time (no polling needed).
- `contact_request` → fires a bell notification for new incoming contact requests.
- `user.banned` → calls `clearAuth()` + `setBanned(true)`; shows the ban screen overlay.
- `user.unbanned` → calls `setBanned(false)`; hides the ban screen overlay.

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

### `CityAutocomplete` — `components/ui/CityAutocomplete.tsx`

City autocomplete input. Queries `GET /cities/search?q=` as the user types and renders a dropdown of results.

```tsx
<CityAutocomplete
  value={city}
  onSelect={(city) => { setCity(city.name); setCoords({ lat: city.lat, lng: city.lng }) }}
  onClear={() => { setCity(''); setCoords(null) }}
  placeholder="Stadt"
  ariaLabel="Nach Stadt filtern"
  inputClassName="..."
/>
```

| Prop | Type | Description |
|---|---|---|
| `value` | `string` | Controlled display value |
| `onSelect` | `(city: { id, name, country, region, lat, lng }) => void` | Called when the user picks a result |
| `onClear` | `() => void` | Optional — called when the input is cleared |
| `placeholder` | `string` | Input placeholder |
| `ariaLabel` | `string` | `aria-label` on the underlying input |
| `inputClassName` | `string` | CSS classes forwarded to the `<input>` |

---

### `StripeCheckoutModal` — `components/ui/StripeCheckoutModal.tsx`

Modal wrapper for Stripe Embedded Checkout.

```tsx
<StripeCheckoutModal plan="monthly" onClose={() => setCheckoutPlan(null)} />
```

| Prop | Type | Description |
|---|---|---|
| `plan` | `'monthly' \| 'yearly' \| 'lifetime'` | Plan to purchase |
| `onClose` | `() => void` | Called when the backdrop or × button is clicked |

On mount POSTs to `POST /payment/subscriptions` to obtain a `clientSecret`, then renders `EmbeddedCheckoutProvider` + `EmbeddedCheckout` from `@stripe/react-stripe-js`. After payment Stripe redirects to `STRIPE_RETURN_URL` automatically. Requires `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local`.

---

### `ReportModal` — `components/ui/ReportModal.tsx`

Modal for reporting a user or piece of content.

```tsx
<ReportModal reportedUserId="uuid" onClose={() => setOpen(false)} />
```

| Prop | Type | Description |
|---|---|---|
| `reportedUserId` | `string \| undefined` | Pre-fills the target user. If omitted, a nickname text input is shown and the user ID is resolved via `GET /profile/:nickname`. |
| `messageId` | `string \| undefined` | Optional — attached to the report body when reporting a specific message. |
| `onClose` | `() => void` | Called when the backdrop or × button is clicked, or automatically after 2 s on success. |

Five preset reason options (Belästigung, Spam, Fake-Profil, Unangemessene Inhalte, Missbrauch) + optional free-text description (500 char limit). Submits to `POST /moderation/reports`. Used from the chat header, the public profile page, and the Support settings accordion.

---

### `AudioPlayer` — `components/ui/AudioPlayer.tsx`

Custom audio player replacing native `<audio controls>` on profile pages.

```tsx
<AudioPlayer src="/uploads/audio/intro.webm" />
```

| Prop | Type | Description |
|---|---|---|
| `src` | `string` | Audio file URL |

- Play/Pause toggle with `lucide-react` icons.
- Clickable seek bar (`onClick` on the track div).
- `MM:SS / MM:SS` elapsed/total timestamp.
- Progress driven by `requestAnimationFrame` loop — smooth animation at display refresh rate.
- Resets state (`isPlaying`, `currentTime`, `duration`) when `src` changes.
- Colors: `text-primary-fixed-dim` / `bg-primary-fixed-dim` (Tailwind v4 tokens).

### `BanModal` — `components/ui/BanModal.tsx`

Admin modal for banning a user. Used from the `/admin` Nutzer tab.

```tsx
<BanModal userId="uuid" nickname="alice" reportId="uuid" onSuccess={() => loadUsers()} onClose={() => setBanModal(null)} />
```

| Prop | Type | Description |
|---|---|---|
| `userId` | `string` | Target user UUID |
| `nickname` | `string` | Displayed in the modal title |
| `reportId` | `string \| undefined` | Optional report UUID attached to the ban |
| `onSuccess` | `() => void` | Called after a successful ban (before closing) |
| `onClose` | `() => void` | Called when backdrop or × is clicked |

Duration dropdown (24h / 7d / 30d / permanent), reason dropdown (5 presets), optional free-text note (appended to reason, 500 char limit). Posts `PATCH /admin/users/:id/ban` with `{ duration, reason, report_id? }`.

---

### `ContactSupportModal` — `components/ui/ContactSupportModal.tsx`

Anonymous support contact form. Shown on the login page.

```tsx
<ContactSupportModal onClose={() => setShowSupportModal(false)} />
```

| Prop | Type | Description |
|---|---|---|
| `onClose` | `() => void` | Called when backdrop or × is clicked (disabled while loading) |

Fields: email (required), nickname (optional), public ID (optional), message (required, 10–1000 chars). Submits to `POST /support/contact`. Rate-limited to 3 requests/hour by backend. Shows a success confirmation state after submission.

---

### `BanScreen` — `components/ui/BanScreen.tsx`

Full-screen overlay rendered by `AuthProvider` when `isBanned` is `true` in the auth store.

- Plays a random audio clip from `public/ban-audio/` on mount (looped).
- Displays configurable ban text (rubber-stamp styling, 10° rotation). Text sourced from `PUBLIC_CONFIG.banScreen.text` → falls back to `NEXT_PUBLIC_BAN_SCREEN_TEXT` env var or `'Dein Account wurde gesperrt.'`.
- "Abmelden" button: calls `POST /auth/logout`, clears auth store, redirects to `/login`.
- `z-[9999]` — covers all other content.
- Audio file list managed in `config/public.config.ts`.

---

## Config

### `config/public.config.ts`

Static runtime config exported as `PUBLIC_CONFIG`. Currently holds ban screen settings:

```ts
PUBLIC_CONFIG.banScreen.text        // ban overlay message
PUBLIC_CONFIG.banScreen.audioFiles  // array of filenames from public/ban-audio/
```

Text falls back to `process.env.NEXT_PUBLIC_BAN_SCREEN_TEXT` or the default string. Audio files are served statically from `public/ban-audio/`.

---

### `useConnectionAction` — `hooks/useConnectionAction.ts`

Custom hook that manages all connection state mutations for a target user.

```ts
const conn = useConnectionAction(targetUserId, initialStatus, initialRequestId, initialConversationId)
```

| Return value | Type | Description |
|---|---|---|
| `connectionStatus` | `ConnectionStatus` | Live status: `NONE \| SENT \| RECEIVED \| CONNECTED \| BLOCKED` |
| `conversationId` | `string \| null` | Conversation ID once connected |
| `isLoading` | `boolean` | True while any async action is in flight |
| `error` | `string \| null` | Last error message; cleared on next action |
| `sendRequest()` | `() => Promise<boolean>` | POST `/chat/requests` |
| `acceptRequest()` | `() => Promise<string \| null>` | PATCH `/chat/requests/:id/accept` — returns new `conversationId` |
| `declineRequest()` | `() => Promise<boolean>` | PATCH `/chat/requests/:id/decline` |
| `disconnect()` | `() => Promise<boolean>` | DELETE `/chat/connections/:userId` |
| `block()` | `() => Promise<boolean>` | POST `/profile/me/block/:userId` |
| `unblock()` | `() => Promise<boolean>` | DELETE `/profile/me/block/:userId` |

Syncs from props when `targetUserId` transitions from `''` (not yet loaded) to a real UUID. Used by Discover and the public profile page.

---

## Key notes

- `sender_id` on messages is the account UUID. Always use `user.user_id` (not `user.id`) for `isOwn` comparisons.
- Optimistic message send: message appears immediately with a pending indicator, replaced by the confirmed message on `new_message`.

---

## Known gaps

| Area | Gap |
|---|---|
| `TopNav` | Avatar placeholder (`?`) — profile photo not fetched |
| `chat/[id]` header | Generic user icon — partner photo not loaded |
| `BottomNav` | No unread badge on Chat or Requests tabs |
| `chat/[id]` | `read_at` exists on messages but read receipts not rendered |
| `settings` → Einstellungen | UI language selector (de/en) — local state only, not persisted |

---

## Changelog

### 2026-05-26 (latest)
- New component: `CityAutocomplete` (`components/ui/CityAutocomplete.tsx`) — autocomplete input that queries `GET /cities/search?q=` as the user types; shows dropdown with city name, country, and region; exposes selected city's `lat`/`lng` to the parent
- Discover (`/discover`): city filter replaced with `CityAutocomplete`; radius slider added (10–500 km, step 10, disabled until a city is selected); search sends `lat`, `lng`, `radius` when a city is chosen from autocomplete rather than a free-text city string
- Profile edit (`/profile`): city field replaced with `CityAutocomplete`; selected city coordinates are sent alongside the city name in `PUT /profile/me`
- Onboarding: city step uses `CityAutocomplete`; `cityLat`/`cityLng` stored in form state and included in `PUT /profile/me` on wizard completion
- Dashboard (`/dashboard`): full redesign — role badge (Crown/Shield) shown in welcome heading for owner/admin; "Mein Überblick" stat row for all users (pending requests, active chats, subscription via `GET /admin/dashboard/user-stats`); "Moderations-Überblick" (admin + owner) via `GET /admin/dashboard/admin-stats`; "Plattform-Übersicht" (owner only) via `GET /admin/dashboard/stats`; Admin quick-link button shown to admin/owner users
- Admin (`/admin`): new "Dashboard" accordion in Verwaltung tab (owner only) — lazy-loads platform stats via `GET /admin/dashboard/stats` with a refresh button and skeleton loading
- Admin (`/admin`): strikes list search refactored to use new `useSearch` hook (replaces manual debounced state)
- AuthProvider: `new_message` notifications now show `"{sender_nickname} hat dir eine Nachricht geschickt."` instead of the generic "Neue Nachricht" (`sender_nickname` field added to `MessagePayload` type)

### 2026-05-26
- Settings (`/settings`): "Abonnement & Zahlung" section hidden entirely for `admin` and `owner` users
- Settings (`/settings`): plan selection buttons now show prices fetched from `GET /system-settings/prices` (e.g. "Monatlich — €9.99"); prices are loaded on page mount
- Settings (`/settings`): "Passwort ändern" and "E-Mail ändern" implemented as nested sub-accordions inside the **Konto** section (replacing "Bald verfügbar" placeholders); each has show/hide password toggles and inline success/error states
- Settings (`/settings`): `uiLang` state migrated from local `useState` to `languageStore` (Zustand) — language preference now survives component remounts
- Auth layout (`(auth)/layout.tsx`): sticky footer added with copyright year (`NEXT_PUBLIC_COPYRIGHT_YEAR`), brand name (`NEXT_PUBLIC_BRAND_NAME`), and Impressum / Datenschutz links
- Admin (`/admin`): new **Abonnement-Preise** accordion in the **Verwaltung** tab — owner can edit monthly/yearly/lifetime prices via `PATCH /system-settings/prices`; prices are pre-loaded from `GET /system-settings/prices`; confirmation modal before saving with a Stripe sync reminder
- Chat (`/chat/[id]`): "Chat löschen", "Nutzer blockieren", and "Nachricht löschen" confirmation dialogs changed from bottom sheets to centered modals
- i18n: `useTranslation()` hook and `t.*` keys applied throughout chat, settings, admin, and auth pages — all UI strings now go through the translation layer

### 2026-05-24 (latest)
- Auth (`/login`): login now accepts email **or** nickname via `identifier` field; "Support kontaktieren" link opens `ContactSupportModal`; `?setup=done` query param shows a green success banner
- New route: `/setup` — one-time owner bootstrap wizard; checks `GET /setup/status` on load, redirects to `/login` if setup is already complete; creates owner account via `POST /setup`
- New component: `ContactSupportModal` (`components/ui/ContactSupportModal.tsx`) — anonymous support form (email required, nickname + public ID optional, message required); submits to `POST /support/contact`; shows success confirmation state; rate-limited by backend (3/hour)
- Settings (`/settings`): "Passwort ändern" fully implemented — inline accordion sub-section with current password + new password (show/hide toggles); calls `PATCH /auth/change-password`; success toast + fields cleared on success
- Settings (`/settings`): "E-Mail ändern" fully implemented — inline accordion sub-section with current password + new email; calls `PATCH /auth/change-email`; success toast + fields cleared on success
- Admin (`/admin`): owner-aware access — `isOwner` flag derived from JWT role; auth guard now allows `admin` **or** `owner`; **Verwaltung** tab shown to owners only
- Admin (`/admin`): new **Verwaltung** tab (owner only) — (A) paginated admin list via `GET /admin/admins`; (B) "Admin erstellen" form via `POST /admin/users/create`
- Admin (`/admin`): **Einstellungen** tab now owner-only (was visible to all admins)
- Admin (`/admin`): support tickets surfaced in **Tickets** tab alongside moderation tickets; `AdminTicket` interface with `source` and `context` fields (email, nickname, public_id, message)
- i18n: `lib/i18n/` module introduced — `useTranslation()` hook, `languageStore` (Zustand), German source-of-truth with typed `en` / `leicht` stubs; used throughout login, setup, settings, and admin pages

### 2026-05-23 (latest)
- Admin (`/admin`): new **Swipe View** for media moderation — full-screen overlay with one card at a time; approve with → key / right arrow button / right swipe, reject with ← key / left arrow button / left swipe; audio cards show filename + Play/Pause (Spacebar); type filter (Alle / Fotos / Audio); counter ("3 von 12"); tilt animation on action; replaces the grid-of-cards approach for faster review
- Admin (`/admin`): `AdminStrike` type gains `ban_lifted_at` field (was missing from the interface)
- Onboarding: merged three-step profile info flow (separate Nickname, Birthdate+City, and Bio steps) into a single **StepProfileInfo** step — all required fields (nickname, birthdate, city) validated together before advancing; optional fields (bio, gender, looking_for) remain on later steps
- Onboarding: added `useTranslation` hook integration — step 1 welcome text and CTA now use `t.onboarding.*` keys from `config/translations.ts`
- New hook: `hooks/useConnectionAction.ts` — `useConnectionAction(targetUserId, initialStatus, initialRequestId, initialConversationId)` centralises all connection state mutations (send request, accept, decline, disconnect, block, unblock) with shared `isLoading` / `error` state; syncs from props when `targetUserId` transitions from `''` to a real value; used by Discover and public profile
- Discover (`/discover`) + Public profile (`/profile/[nickname]`): refactored to use `useConnectionAction` — removed per-page duplicated fetch logic and state (`busy`, `disconnecting`, `blocking`, `requestStatus`, `requestError`, etc.)
- Public profile: `PublicProfile` type gains `request_id` and `conversation_id` fields (needed by `useConnectionAction`)
- Chat (`/chat/[id]`): block banner text corrected — "Du kannst diesem Nutzer keine Nachrichten senden." → "Du hast diesen Nutzer blockiert."; blocked input field now shows `bg-surface-container-high opacity-50 cursor-not-allowed` styling instead of plain disabled
- Own profile (`/profile`): "Ersetzen" and "Neue Aufnahme" audio action buttons now only shown in edit mode (were always visible when audio had status pending or rejected)
- TopNav: status dot in the status button now shows green whenever the user is logged in (`!!accessToken`) instead of checking `statusVisible` — prevents the dot going grey when the user sets themselves to invisible (which is the backend's job, not the dot's)
- `AuthProvider`: minor formatting refactor — `return` now uses explicit JSX wrapping instead of a fragment expression
- New: `config/translations.ts` — `translations` object with German source-of-truth (`de`) and empty `en` / `leicht` stubs typed via `DeepPartial<TranslationKeys>`; `TranslationKeys` inferred from German so TypeScript surfaces every missing key when a stub is promoted
- New: `hooks/useTranslation.ts` — `useTranslation()` hook reads `lang_simple` from auth store to select the active locale

### 2026-05-23

### 2026-05-22 (latest)
- Auth: ban state now derived from backend on every app startup — `AuthProvider` checks `user.is_banned` in the `/profile/me` response and calls `setBanned(true)` if true. Stale ban state no longer survives across sessions.
- Auth: `isBanned` removed from Zustand `partialize` — no longer written to `localStorage`. In-memory only; reset to `false` on logout.
- Auth: `User` interface gains optional `is_banned?: boolean` field.
- Auth: `AuthProvider` onboarding redirect now also guards on `!user.is_banned` (banned users are not redirected to `/onboarding`).
- New component: `BanScreen` (`components/ui/BanScreen.tsx`) — full-screen ban overlay; plays a random looping audio from `public/ban-audio/`; shows configurable ban text in rubber-stamp style; "Abmelden" button clears auth and redirects to `/login`. Rendered by `AuthProvider` when `isBanned` is true.
- New component: `BanModal` (`components/ui/BanModal.tsx`) — admin ban form; duration dropdown (24h/7d/30d/permanent), reason dropdown (5 presets), optional note (500 chars). Posts `{ duration, reason, report_id? }` to `PATCH /admin/users/:id/ban`.
- Admin (`/admin`): Nutzer tab uses `BanModal` instead of the old inline form; `banModal` state now carries `{ userId, nickname, reportId? }`.
- Admin (`/admin`): Strike modal replaced UUID text input with a debounced nickname search — type a nickname, pick from results, `user_id` resolved automatically.
- New `config/public.config.ts` — `PUBLIC_CONFIG` with `banScreen.text` (from `NEXT_PUBLIC_BAN_SCREEN_TEXT` env var) and `banScreen.audioFiles` array.
- New `public/ban-audio/` — 8 audio files served statically for the ban screen.

### 2026-05-22
- Chat (`/chat/[id]`): three-dot menu in the header — "Chat löschen" (soft-delete own copy, navigates to `/chat`), "User melden" (opens `ReportModal`), "Nutzer blockieren" (bottom sheet confirmation → `POST /profile/me/block/:userId`).
- Chat (`/chat/[id]`): block state loaded from `is_blocked` / `blocked_by` on conversation fetch; input and send button disabled when blocked; block banner shown in the input bar; partner name replaced with "XXXX" when blocked.
- Discover (`/discover`): connected profiles now show a "Verbindung trennen" button below "Chatten →"; confirmation bottom sheet calls `DELETE /chat/connections/:userId` and resets connection status to NONE.
- Public profile (`/profile/[nickname]`): "Verbindung trennen" button for connected profiles (bottom sheet confirmation); "User melden" button opens `ReportModal`; "Nutzer blockieren" button (bottom sheet confirmation → `POST /profile/me/block/:userId` → navigates back). `connection_status` field added to `PublicProfile` type.
- Settings (`/settings`): new **E) Sicherheit & Blockierungen** accordion section — blocked user list lazy-loaded from `GET /profile/me/blocks`; inline unblock flow with confirmation.
- Settings (`/settings`): new **G) Support** accordion section — "Problem melden" button opens `ReportModal` in nickname-lookup mode.
- New component: `ReportModal` (`components/ui/ReportModal.tsx`) — report modal with reason dropdown (5 options), optional description (500 chars), optional nickname lookup when `reportedUserId` is omitted. Used from chat page, public profile, and settings.

### 2026-05-21 (latest)
- Payment: `POST /payment/subscriptions` now returns `{ clientSecret }` (Stripe Embedded Checkout). `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` added to `.env.local`.
- Settings: "Abonnement & Zahlung" accordion filled — active subscription shows plan label (Monatlich / Jährlich / Lebenslang), "Aktiv" badge, and expiry date (hidden for lifetime); inline cancel confirmation flow calls `DELETE /payment/subscriptions/:id`; no subscription shows three plan buttons opening `StripeCheckoutModal`; subscription detail lazy-loaded on accordion open.
- New `StripeCheckoutModal` component (`components/ui/StripeCheckoutModal.tsx`) — Stripe Embedded Checkout in a fixed full-screen modal overlay; fetches `clientSecret` on mount via `POST /payment/subscriptions`.
- `package.json`: added `@stripe/react-stripe-js` and `@stripe/stripe-js`.

### 2026-05-21
- Layouts: footer added to both `(app)` and `(public)` layouts — copyright, brand name, Impressum and Datenschutz links; `(app)` footer uses `mb-16 md:mb-0` to clear the fixed BottomNav on mobile
- Legal pages: `app/(public)/impressum/page.tsx` — Impressum (§ 5 ECG / § 5 TMG) with company details from `NEXT_PUBLIC_COMPANY_*` env vars
- Legal pages: `app/(public)/datenschutz/page.tsx` — full Datenschutzerklärung (7 sections: Verantwortlicher, Erhobene Daten, Zweck, Rechtsgrundlage, Speicherdauer, Rechte, Kontakt) sourced from env vars
- B2B page: contact section (WhatsApp, Instagram, E-Mail, Telefon) wired to `NEXT_PUBLIC_CONTACT_*` env vars instead of hardcoded values
- `.env.local`: `NEXT_PUBLIC_COMPANY_*` and `NEXT_PUBLIC_CONTACT_*` env var groups added
- `TopNav`: admin icon (`Shield`) removed from desktop nav links
- `TopNav`: status dot replaced — `OnlineIndicator` now renders inside the status button with label text suppressed via CSS wrapper (`[&>span>span:last-child]:hidden`)
- `TopNav`: Settings link now visible on all screen sizes (was `hidden md:inline-flex`)
- `BottomNav`: Settings item removed; nav now has 5 items (Home, Discover, Requests, Chat, Profile)
- `AudioPlayer` component (`components/ui/AudioPlayer.tsx`): custom player replacing all native `<audio controls>` instances — Play/Pause toggle, clickable seek bar, `MM:SS / MM:SS` timestamp; progress driven by `requestAnimationFrame` for smooth animation; colors use `text-primary-fixed-dim` / `bg-primary-fixed-dim`
- Own profile (`/profile`): both audio players replaced with `AudioPlayer`; audio delete button now only shown in edit mode
- Public profile (`/profile/[nickname]`): audio player replaced with `AudioPlayer`
- WebSocket (`AuthProvider`): global `notification` and `contact_request` socket event listeners added — real-time delivery without polling

### 2026-05-21
- Settings (`/settings`): full rewrite as 4-section accordion (Design & Barrierefreiheit, Benachrichtigungen, Sichtbarkeit, Konto) — single section open at a time with CSS grid-rows height transition
- Settings: new Sichtbarkeit section — master `is_published` toggle + 7 field visibility toggles (`status_visible`, `show_bio`, `show_city`, `show_age`, `show_gender`, `show_interests`, `show_audio`); all auto-save via `PUT /profile/me`; sub-toggles dimmed (not reset) when `is_published = false`
- Settings: Konto section — subscription info from `profile.subscription` (plan badge + status + expiry date, or "Kein aktives Abonnement"); placeholder rows for Passwort ändern, E-Mail ändern, Konto löschen (all "Bald verfügbar"); "Daten exportieren (PDF)" is fully functional — calls `GET /gdpr/export`, triggers blob download, shows cooldown/error feedback and DSGVO hint text
- Public profile (`/profile/[nickname]`): city hidden when `null` (was showing `—`); gender and looking_for shown as chips when non-null (German labels, `not_specified` excluded)
- Discover (`/discover`): `calcAge` now accepts `string | null | undefined` and returns `number | null`; age hidden in card when `null` (birthdate not returned by backend when `show_age = false`); `birthdate` typed as `string | null`

### 2026-05-21
- Admin panel (`/admin`): full admin UI — media moderation (approve/reject with reason), paginated user management (ban/unban/role), report management (status + note), strike creation, custom profanity word list (add/delete)
- Admin auth guard: fixed premature redirect on first render — `useAuthStore.persist.hasHydrated()` + `onFinishHydration` subscription ensures Zustand `persist` has loaded before the JWT role is checked
- Admin media tab: `toProxyUrl()` helper strips absolute origin from `file_url` before setting `<img src>`, routing photos through the Next.js `/uploads/` proxy
- `lib/api.ts`: `fetchApi` now returns `undefined` for 204 / zero-content-length responses instead of throwing a JSON parse error

### 2026-05-20
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
