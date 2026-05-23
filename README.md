# XXX — Frontend

Next.js (App Router) frontend for the XXX platform. Connects to the XXX NestJS backend.

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| State management | Zustand (with `persist` middleware) |
| Real-time | socket.io-client |
| Payments | `@stripe/react-stripe-js` + `@stripe/stripe-js` (Embedded Checkout) |
| Icons | lucide-react |
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

---

## Key Features

### Auth & Onboarding
- JWT access token (15 min) in Zustand; refresh token in HttpOnly cookie rotated automatically by `fetchApi` on 401
- `AuthProvider` fetches `/profile/me` on mount, populates user store, establishes global WebSocket, and applies accessibility settings
- Multi-step onboarding wizard required before profile can be published
- Consent flow (`/consent`) after registration

### Discover
- 2-col (mobile) / 3-col (desktop) profile grid with skeleton loading
- Filters: city, gender, looking_for, age range, online-only
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
Accessible to `role: admin` users only. Auth guard waits for Zustand `persist` hydration before checking role.

| Tab | Description |
|---|---|
| Medien | Photo moderation queue — approve or reject with reason |
| Nutzer | Paginated user list with role/ban filters; inline role change; `BanModal` for bans |
| Meldungen | Paginated reports filtered by status; inline status + note editing |
| Strikes | Paginated strikes; "Neuer Strike" modal with debounced nickname search |
| Schimpfwörter | Custom profanity word list; add/delete words |
| Einstellungen | System settings key/value editor (GET/PUT `/admin/settings`) |

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
| Konto | Subscription info, GDPR data export (PDF download), account delete |
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

| Route | Description |
|---|---|
| `/login` | Email + password login |
| `/register` | Registration |
| `/verify` | Email verification landing page |
| `/consent` | AGB / privacy consent flow |
| `/onboarding` | Profile setup wizard |
| `/dashboard` | Home screen after login |
| `/discover` | Browse published profiles |
| `/requests` | Incoming + outgoing contact requests |
| `/chat` | Conversation list |
| `/chat/[id]` | Real-time conversation |
| `/notifications` | Full notification center |
| `/profile` | Own profile view + edit |
| `/profile/[nickname]` | Public profile |
| `/settings` | All settings (7 accordion sections) |
| `/admin` | Admin panel (5 tabs) |
| `/impressum` | Impressum (§ 5 TMG/ECG) |
| `/datenschutz` | Datenschutzerklärung |
| `/agb` | AGB |
| `/b2b` | B2B landing page |

---

## WebSocket

The socket is established globally in `AuthProvider` once the user profile loads — real-time events work on every page, not just the chat page.

**Module:** `lib/socket.ts` — singleton Socket.io client.

```ts
connect(token)     // creates socket with auth token; no-op if already connected
disconnect()       // tears down the socket
getSocket()        // returns Socket | null
reconnect(token)   // force-reconnects with a new token
```

**Global listeners (AuthProvider):**

| Event | Action |
|---|---|
| `new_message` | Bell notification for any incoming message |
| `notification` | Hydrates `notificationStore` in real time |
| `contact_request` | Bell notification for new contact requests |
| `user.banned` | `clearAuth()` + `setBanned(true)` → ban screen overlay |
| `user.unbanned` | `setBanned(false)` → hides ban screen |

---

## Key Components

| Component | Description |
|---|---|
| `AuthProvider` | Global auth + WebSocket setup; ban state management |
| `OnlineIndicator` | Green/gray dot + translated status label; sizes `sm`/`md` |
| `BanScreen` | Full-screen ban overlay with audio + configurable text |
| `BanModal` | Admin ban form (duration, reason, optional note) |
| `ReportModal` | Report modal with reason dropdown; optional nickname lookup |
| `StripeCheckoutModal` | Stripe Embedded Checkout in a modal overlay |
| `AudioPlayer` | Custom play/pause + seek bar + timestamp; `requestAnimationFrame` progress |
| `TopNav` | Sticky header; bell badge; status dropdown; notification dropdown |
| `BottomNav` | Mobile-only fixed bottom bar (5 items) |

---

## Known Gaps

| Area | Gap |
|---|---|
| `TopNav` | Avatar `?` placeholder — profile photo not loaded in top-right corner |
| `chat/[id]` header | Generic user icon — partner photo not loaded |
| `BottomNav` | No unread badge on Chat or Requests tabs |
| `chat/[id]` | `read_at` exists on messages but read receipts not rendered |
| Settings → Konto | "Passwort ändern", "E-Mail ändern" — placeholder rows, not yet functional |
| Settings | UI language selector — local state only, not persisted |
