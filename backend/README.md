# XXX — Backend API

NestJS REST API + WebSocket gateway for the XXX platform.

---

## Contents

- [Tech Stack](#tech-stack)
- [Module Overview](#module-overview)
- [Key Features](#key-features)
  - [Authentication & Security](#authentication--security)
  - [Ban System](#ban-system)
  - [Real-time (WebSocket)](#real-time-websocket)
  - [Stripe Payments](#stripe-payments)
  - [GDPR](#gdpr)
  - [Profile & Search](#profile--search)
  - [Moderation & Profanity](#moderation--profanity)
  - [System Settings](#system-settings)
  - [Owner Role](#owner-role)
  - [Multi-tenant / Licensing](#multi-tenant--licensing)
- [Security](#security)
- [API Reference](#api-reference)
  - [Auth — `/auth`](#auth--auth)
  - [Media — `/media`](#media--media)
  - [Profile — `/profile`](#profile--profile)
  - [Chat — `/chat`](#chat--chat)
  - [Notifications — `/notifications`](#notifications--notifications)
  - [Moderation — `/moderation`](#moderation--moderation)
  - [Payment — `/payment`](#payment--payment)
  - [Admin — `/admin`](#admin--admin)
  - [Cities — `/cities`](#cities--cities)
  - [System Settings — `/system-settings`](#system-settings--system-settings)
  - [Setup — `/setup`](#setup--setup)
  - [Support — `/support`](#support--support)
  - [GDPR — `/gdpr`](#gdpr--gdpr)
  - [Hidden Zone — `/hidden`](#hidden-zone---hidden)
- [WebSocket Events](#websocket-events)
- [Frontend](#frontend)
- [Environment](#environment)
- [Running Locally](#running-locally)
- [Changelog](#changelog)

---

## Tech Stack

| | |
|---|---|
| Runtime | Node.js / TypeScript |
| Framework | NestJS |
| ORM | TypeORM |
| Database | PostgreSQL 16 + PostGIS |
| Auth | JWT (access + refresh), bcrypt |
| Encryption | AES-256-CBC (field-level), SHA-256 (hashing) |
| Email | Resend |
| Payments | Stripe (Embedded Checkout + webhooks) |
| Real-time | WebSockets via socket.io (`@nestjs/platform-socket.io`) |
| Events | `@nestjs/event-emitter` (internal cross-module bus) |
| File processing | sharp (image resize + WebP conversion) |
| PDF generation | pdfkit |
| Profanity | leo-profanity + custom DB word list |

---

## Module Overview

| Module | Path | Responsibility |
|---|---|---|
| `AuthModule` | `src/modules/core/auth` | Register, login, refresh, logout, email verification, password reset, consent |
| `ProfileModule` | `src/modules/core/profile` | Profile CRUD, interests, search (PostGIS radius), visibility flags, blocks, sensitive data |
| `ChatModule` | `src/modules/core/chat` | Contact requests, conversations, messages, disconnect |
| `NotificationsModule` | `src/modules/core/notifications` | In-app notifications, settings |
| `ModerationModule` | `src/modules/core/moderation` | Reports, auto-ban, profanity service, media queue |
| `AdminModule` | `src/modules/core/admin` | User management, ban/unban, strikes, reports, media moderation |
| `GdprModule` | `src/modules/core/gdpr` | DSGVO data export PDF (Art. 15), pseudonymization |
| `MediaModule` | `src/modules/core/media` | Profile photo upload, resize, WebP conversion |
| `PaymentModule` | `src/modules/core/payment` | Stripe subscriptions, webhooks, payment history |
| `SystemSettingsModule` | `src/modules/core/system-settings` | Admin-editable key/value settings with in-memory cache |
| `SetupModule` | `src/modules/core/setup` | One-time owner account bootstrap; setup-status check |
| `SupportModule` | `src/modules/core/support` | Anonymous contact-support tickets (public endpoint) |
| `CitiesModule` | `src/modules/core/cities` | City autocomplete search backed by seeded `cities` table |
| `MatchingModule` | `src/modules/core/matching` | Swipe deck (interest + distance scoring), swipe action (mutual like → match + conversation), matches list (`GET /discover/matches`) |
| `CommonModule` | `src/common` | `PremiumGuard`, `@RequiresPremium()`, `HttpExceptionFilter`, RLS helpers |
| `BeefModule` | `src/modules/hidden/beef` | Hidden zone: beef challenges, voting, comments, coin pot; real-time game system (RPS/RPSLS, TicTacToe, Mastermind, Reaction) via `BeefGameService` + typed handlers; `HiddenBeefGateway` (`/hidden-beef` WS namespace) |
| `CoinModule` | `src/modules/hidden/coin` | Hidden zone: coin balance ledger and transactions |
| `TeethModule` | `src/modules/hidden/teeth` | Hidden zone: tooth collection and tooth-chain crafting |
| `BadgeModule` | `src/modules/hidden/badge` | Hidden zone: winner/loser/chicken badges with expiry; `GET /hidden/badge/mine` |

---

## Key Features

### Authentication & Security
- JWT access token (15 min) + single-use refresh token (30 days) rotated via HttpOnly cookie
- Passwords hashed with bcrypt cost 12
- Email stored AES-256-CBC encrypted, looked up via SHA-256 hash (no plaintext in DB)
- Sensitive data (disability type) stored AES-256-CBC encrypted
- Rate limiting: global 100 req/60 s; login 5/60 s; password reset 3/60 s
- Soft deletes (`deleted_at`); account reactivation within 30 days on re-login
- Refresh tokens bulk-revoked on account delete

### Ban System
- **Manual ban** (`PATCH /admin/users/:id/ban`): duration-based (24 h / 7 d / 30 d / permanent), auto-creates a strike, sends ban email, pushes `user.banned` socket event in real time
- **Auto-suspend**: triggered at ≥ 10 unique reports against a user — bans automatically, creates a `SYSTEM` strike, sends auto-suspend email, pushes `user.banned` socket event
- Unban (`PATCH /admin/users/:id/unban`) pushes `user.unbanned` socket event
- `GET /profile/me` returns `is_banned` — frontend uses this as source of truth on startup
- **Ban protections**: `owner` accounts can never be banned; admins cannot ban other admins — only the `owner` can

### Real-time (WebSocket)
- Socket.io gateway on the same port as HTTP
- Each authenticated user joins personal room `user:{userId}` on connect
- Events: `user.banned`, `user.unbanned`, `notification`, `contact_request`, `new_message`, `user_typing`, `messages_read`

### Stripe Payments
- Embedded Checkout session (`ui_mode: 'embedded'`, returns `clientSecret`)
- Webhook handlers: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`
- Daily cron (08:00): notifies users 3 days before expiry; marks expired subscriptions
- Plans: `monthly`, `yearly`, `lifetime`
- `@RequiresPremium()` decorator enforces active subscription on guarded routes

### GDPR
- `GET /gdpr/export` streams a PDF with 14 data sections (Art. 15 DSGVO)
- Rate-limited to once every 30 days per user
- All encrypted fields decrypted before inclusion; third-party UUIDs never exposed
- `DELETE /auth/account` soft-deletes (Art. 17); `admin/:id/export` for admin-side export

### Profile & Search
- PostGIS radius search on `profiles.location` — `GET /profile/search` accepts `lat`, `lng`, `radius` (km, default 50) for coordinate-based filtering via `ST_DWithin`; falls back to city text search when no coordinates provided
- `PUT /profile/me` accepts optional `lat` + `lng` to update `profiles.location` via `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`
- `GET /cities/search?q=` — city autocomplete backed by a seeded `cities` table (name, country, region, lat, lng, population); returns top 10 by population
- Visibility flags (`show_bio`, `show_city`, `show_age`, `show_gender`, `show_interests`, `show_audio`) — masking applied at API layer
- `enhanced_protection` and `vulnerable_flag` users excluded from search at DB level
- Status system: `status_visible` + `status_message` enum (available / looking_for_chat / looking_for_date / busy / do_not_disturb)

### Moderation & Profanity
- `ProfanityService`: leo-profanity + German/English custom word list loaded from `profanity_words` DB table on startup; runtime add/remove via admin API
- Checks on bio, status_message, nickname, chat messages (REST + WebSocket)
- Profane nicknames → `admin_tickets` (type `nickname`) for manual review
- All uploads → `admin_tickets` (type `image`) for visual moderation
- Profanity detections logged to `profanity_flags`

### System Settings
- `system_settings` table — owner-editable key/value pairs
- `SystemSettingsService.getNumber(key, fallback)` and `getString(key, fallback)` with 60 s in-memory cache
- Owner-only admin endpoints: `GET /admin/settings`, `PATCH /admin/settings/:key`
- Subscription prices stored as `subscription_price_monthly`, `subscription_price_yearly`, `subscription_price_lifetime` keys; seeded via migration `020_subscription_prices.sql`
- Public endpoint: `GET /system-settings/prices` — returns `{ monthly, yearly, lifetime }` (no auth required)
- Owner-only price update: `PATCH /system-settings/prices` — updates one or more price keys atomically

### Owner Role
- `role` column on `users`: `user | admin | org | owner`
- `owner` is a super-admin role — exactly one owner can exist at any time (partial unique index enforces this, migration `019_owner_role.sql`)
- `OwnerGuard` (`src/common/guards/owner.guard.ts`) — restricts endpoints to `owner` role only
- `RolesGuard` updated: `owner` inherits all `admin` permissions (no separate decoration needed)
- Owner-only admin endpoints: `POST /admin/users/create`, `PATCH /admin/users/:id/role`, `GET /admin/admins`, `GET /admin/settings`, `PATCH /admin/settings/:key`

### Multi-tenant / Licensing
- `role` column on `users`: `user | admin | org | owner`
- `managed_accounts` table present; `org` role reserved for licensed operators
- `caretaker_access` RLS policy placeholder on `profile_sensitive_data`

---

## Security

- **JWT**: access token 15 min, refresh token 30 days (single-use rotation, stored as SHA-256 hash)
- **Refresh token cookie**: `refreshToken` HttpOnly cookie — never exposed to JavaScript
- **Passwords**: bcrypt cost 12
- **Email**: stored AES-256-CBC encrypted, looked up via SHA-256 hash
- **Sensitive data**: disability type stored AES-256-CBC encrypted
- **Rate limiting**: global 100 req/60s; login 5/60s; forgot-password & reset-password 3/60s
- **Soft deletes**: users have `deleted_at`, excluded from all queries; `DELETE /auth/account` sets it (DSGVO Art. 17)
- **Enhanced protection**: users with `enhanced_protection = true` are excluded from all search/discover results at DB level
- **Vulnerable flag**: users with `vulnerable_flag = true` are excluded from all search/discover results at DB level (caretaker exemption planned)
- **Global exception filter**: all errors are caught, logged via NestJS `Logger` (timestamp, method, URL, status, userId), and returned in a consistent `{ statusCode, error, message }` shape. Request body, tokens, passwords, emails, and IPs are never logged.

---

## API Reference

All routes are prefixed with `/api/v1` (e.g. `/api/v1/auth/login`).

All protected routes require `Authorization: Bearer <accessToken>`.

---

### Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register with email + password. Creates profile, sends verification email. |
| POST | `/auth/login` | — | Login. Body: `{ identifier, password }` where `identifier` is email or nickname. Returns `{ accessToken, needsConsent }`. Sets `refreshToken` HttpOnly cookie (30 days). Blocked if `is_banned`. Reactivates soft-deleted accounts within 30 days. |
| POST | `/auth/refresh` | — (cookie) | Rotate refresh token using `refreshToken` cookie. Old token is revoked. Returns `{ accessToken }` + new cookie. |
| POST | `/auth/logout` | — (cookie) | Revoke refresh token from cookie and clear cookie. |
| GET | `/auth/me` | JWT | Returns current JWT payload (`sub`, `role`). |
| GET | `/auth/verify?token=` | — | Verify email address via token from email link. |
| POST | `/auth/forgot-password` | — | Send password reset email. Always returns same message (no email enumeration). |
| POST | `/auth/reset-password` | — | Reset password with token. Token valid 1 hour. |
| GET | `/auth/agb-versions` | — | List all current AGB/privacy policy versions. Used by frontend to display consent. |
| POST | `/auth/consent` | JWT | Bulk upsert consent logs. Body: `{ consents: [{ agb_version_id, accepted }] }`. |
| DELETE | `/auth/account` | JWT | Soft-delete own account (DSGVO Art. 17). Sets `deleted_at`. Clears `refreshToken` cookie. Idempotent — returns 400 if already deleted. |
| PATCH | `/auth/change-password` | JWT | Change own password. Body: `{ current_password, new_password }`. Verifies current password before updating. |
| PATCH | `/auth/change-email` | JWT | Change own email address. Body: `{ current_password, new_email }`. Verifies current password; updates encrypted email + search hash. |

---

### Media — `/media`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/media/upload/profile-photo` | JWT | Upload a profile photo. Accepts `multipart/form-data` with field `file` (JPEG, PNG, WebP, max 5 MB). Resizes to max 800×800 and converts to WebP via sharp. Saves to `uploads/profiles/`, stores a `MediaUpload` record, updates `profile.photo_id`. Creates an `admin_tickets` row (type `image`) for moderation review. Returns `{ file_url, id }`. |

---

### Profile — `/profile`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/profile/interests` | — | List all available interests. |
| GET | `/profile/me` | JWT | Get own profile. Returns `photo_url`, `photo_needs_review`, `audio_url`, `audio_moderation_status`, all six `show_*` visibility flags (`show_bio`, `show_city`, `show_age`, `show_gender`, `show_interests`, `show_audio`), `subscription: { plan, status, current_period_end } \| null` (active subscription row, or `null`), and `is_banned: boolean` (sourced from `users` table — source of truth for the frontend ban screen). |
| PUT | `/profile/me` | JWT | Update own profile (nickname, bio, city, birthdate, gender, looking_for, `is_published`, `status_visible`, `status_message`, `profanity_filter`, `show_bio`, `show_city`, `show_age`, `show_gender`, `show_interests`, `show_audio`). Optional `lat` + `lng` (decimal) update `profiles.location` via PostGIS `ST_MakePoint`. Triggers onboarding check. Nickname changes containing profanity create an admin ticket for review; bio, `status_message`, and chat messages with profanity are silently logged to `profanity_flags`. |
| PATCH | `/profile/me/publish` | JWT | Publish profile. Requires onboarding completed (nickname + birthdate + city + ≥1 interest + verified email). |
| GET | `/profile/me/interests` | JWT | Get own selected interests. |
| POST | `/profile/me/interests/:interestId` | JWT | Add an interest. Triggers onboarding check. |
| DELETE | `/profile/me/interests/:interestId` | JWT | Remove an interest. |
| GET | `/profile/search` | JWT | Search published profiles. Query params: `city` (text), `lat`+`lng`+`radius` (coordinate search, radius in km, default 50), `interests`, `gender`, `looking_for`, `min_age`, `max_age`, `online_only`, `connection_status`. When `lat`/`lng` are present, uses `ST_DWithin` PostGIS radius search; otherwise falls back to city text match. Excludes banned, deleted, self, blocked (both directions), `enhanced_protection`, and `vulnerable_flag` users at DB level. Returns `status_visible`, `status_message`, `is_online`, `photo_needs_review`, `birthdate` (null when `show_age = false`). Fields masked by `show_*` flags: `bio`, `city`, `gender`, `looking_for` return `null` when hidden; interests return `[]` when `show_interests = false`. |
| POST | `/profile/me/consent/sensitive-data` | JWT | Record AGB consent for sensitive data collection. Returns consent log ID. IP is SHA-256 hashed. |
| POST | `/profile/me/sensitive-data` | JWT | Submit sensitive data (disability type + visibility). Requires valid consent ID. Disability type stored AES-256-CBC encrypted. |
| GET | `/profile/me/blocks` | JWT | List all users blocked by the authenticated user. Returns `[{ block_id, user_id, nickname, photo_url }]`, ordered by block date descending. |
| POST | `/profile/me/block/:userId` | JWT | Block a user. |
| DELETE | `/profile/me/block/:userId` | JWT | Unblock a user. |
| GET | `/profile/user/:userId` | JWT | Get nickname and photo_id for any account UUID. Used by frontend to resolve partner names in chat. |
| GET | `/profile/:nickname` | — | Public profile by nickname (published profiles only). Returns `is_online`, `status_visible`, `status_message`, `last_active_at`, `photo_needs_review`, `gender`, `looking_for`, `birthdate`. Fields masked by `show_*` flags: `bio`, `city`, `gender`, `looking_for`, `birthdate` return `null` when hidden; `audio_url` returns `null` when `show_audio = false`. Interests endpoint (`/:nickname/interests`) returns `[]` when `show_interests = false`. |

---

### Discover / Matching — `/discover`

All routes require JWT.

| Method | Path | Description |
|---|---|---|
| GET | `/discover/deck` | Returns a scored deck of up to 20 candidates for the current user. Excludes self, already-swiped (likes permanent, skips expire after 30 days), banned/deleted users. If the viewer has a location, uses PostGIS `ST_DWithin` for radius-based scoring (distance component). Interest scores: +2 for shared green/red-flag interest, −1 for clash. |
| POST | `/discover/swipe` | Record a swipe. Body: `{ target_user_id: UUID, action: 'like' \| 'skip' }`. On mutual like, creates a `Match` row (canonical pair order: `user_a_id < user_b_id`) and a `Conversation`. Returns `{ matched: boolean, conversation_id: string \| null }`. |
| GET | `/discover/matches` | Returns all mutual matches for the authenticated user, excluding partners who are banned or deleted. Response: `[{ match_id, conversation_id, matched_at, nickname, age, city, photo_url }]` ordered by `matched_at DESC`. |

---

### Chat — `/chat`

All chat routes require JWT.

| Method | Path | Description |
|---|---|---|
| POST | `/chat/requests` | Send a contact request to another user. Returns 403 if either the sender or receiver has `role = 'admin'` — admin accounts cannot participate in regular contact requests. |
| GET | `/chat/requests/incoming` | List incoming pending contact requests. |
| GET | `/chat/requests/outgoing` | List outgoing pending contact requests. |
| PATCH | `/chat/requests/:id/accept` | Accept a contact request. Creates (or restores) conversation. |
| PATCH | `/chat/requests/:id/decline` | Decline a contact request. |
| GET | `/chat/conversations` | List own conversations. Each entry includes `partner_is_online`, `partner_status_visible`, `partner_status_message`, `partner_last_active_at`. |
| GET | `/chat/conversations/:id` | Get a single conversation. Returns `is_blocked: boolean` and `blocked_by: 'me' \| 'them' \| null`. |
| GET | `/chat/conversations/:id/messages` | Get messages for a conversation. |
| POST | `/chat/conversations/:id/messages` | Send a message in a conversation. |
| DELETE | `/chat/messages/:id` | Delete own message. |
| DELETE | `/chat/connections/:userId` | Disconnect from a connected user. Sets `deleted_at_a`, `deleted_at_b`, and `purged_at` on the conversation; reverts the accepted contact request to `declined`. Deletes chat history for both sides. |

---

### Notifications — `/notifications`

All notification routes require JWT.

| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | Get all notifications. |
| PATCH | `/notifications/read-all` | Mark all notifications as read. |
| PATCH | `/notifications/:id/read` | Mark a single notification as read. |
| GET | `/notifications/settings` | Get notification settings. |
| PUT | `/notifications/settings` | Update notification settings. |

---

### Moderation — `/moderation`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/moderation/wordlist` | — | Returns the active profanity word list: `{ words: string[] }`. |
| POST | `/moderation/reports` | JWT | Submit a report against a user or content. After saving, counts distinct reporters against the target; if ≥ 10 unique reporters have open/reviewed reports the user is auto-banned (`ban_reason = 'Auto-Ban: 10 unabhängige Meldungen'`) and receives a system notification. |
| GET | `/moderation/reports` | JWT (admin) | List all reports. |
| GET | `/moderation/reports/:id` | JWT (admin) | Get a single report. |
| POST | `/moderation/strikes` | JWT (admin) | Issue a strike. |
| GET | `/moderation/strikes` | JWT (admin) | List own strikes. |
| PATCH | `/moderation/reports/:id/review` | JWT (admin) | Review/close a report. |
| GET | `/moderation/admin/media/queue` | JWT (admin) | Returns all `media_uploads` with `needs_review = true`, ordered by upload time. Includes `id`, `file_url`, `uploaded_at`, `uploaded_by`, owner `nickname`. |
| PATCH | `/moderation/admin/media/:id/approve` | JWT (admin) | Approve a photo: sets `needs_review = false`, records reviewer + timestamp, deletes the open `admin_ticket`, sends owner notification *"Dein Profilbild wurde genehmigt"*. |
| PATCH | `/moderation/admin/media/:id/reject` | JWT (admin) | Reject a photo. Body: `{ reason: string }`. Records reviewer, timestamp, and reason; deletes the open `admin_ticket`; nulls `profile.photo_id` (removes photo from profile); sends owner notification *"Dein Profilbild wurde abgelehnt: {reason}"*. |

**Profanity filter (`ProfanityService`, internal):**

Uses `leo-profanity` with a German + English custom word list (`PROFANITY_WORDLIST`). Applied automatically in:
- `PUT /profile/me` — bio and `status_message` changes; nickname changes with profanity create an `admin_tickets` row (type `nickname`) for manual review
- `POST /chat/conversations/:id/messages` (REST) and `send_message` (WebSocket) — chat messages
- `POST /media/upload/profile-photo` — always creates an `admin_tickets` row (type `image`) for visual review

Each profanity detection inserts a row into `profanity_flags` (user_id, word, context_type, flagged_at). If a user accumulates ≥ 50 flags within 24 hours a warning is logged server-side.

`profanity_filter` (boolean, default `true`) on the user's profile is a client-side preference; the server always checks and logs regardless of this setting.

**DB (migrations 006–008):** `admin_tickets` (type: `nickname | image | audio | other`, status: `open | reviewed | resolved | dismissed`), `profanity_flags`; `profiles.profanity_filter`; `media_uploads` gains `needs_review` (bool, default `true`), `reviewed_at`, `reviewed_by`, `review_rejected_reason`.

---

### Payment — `/payment`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/payment/subscriptions` | JWT | Get active subscription. |
| POST | `/payment/subscriptions` | JWT | Create a Stripe Embedded Checkout session. Returns `{ clientSecret }`. |
| DELETE | `/payment/subscriptions/:id` | JWT | Cancel a subscription. |
| GET | `/payment/logs` | JWT + Premium | Get payment history. Requires an active premium subscription. |
| POST | `/payment/webhook` | — (Stripe signature) | Stripe webhook receiver. Handles `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`. |

**Webhook events handled:**

| Event | Action |
|---|---|
| `checkout.session.completed` | Creates subscription + payment log. Sends system notification: *"Dein Premium-Abo ist jetzt aktiv!"* |
| `invoice.payment_failed` | Sends system notification: *"Deine Zahlung konnte nicht verarbeitet werden."* |
| `customer.subscription.deleted` | Sets subscription status to `cancelled`. |

**Plans:** `monthly` · `yearly` · `lifetime`

**Premium guard:** `@RequiresPremium()` (from `src/common/decorators/requires-premium.decorator.ts`) applies `JwtGuard` + `PremiumGuard` in one decorator. `PremiumGuard` checks for an active subscription with `expires_at IS NULL OR expires_at > NOW()`. Provided globally via `CommonModule`.

**Subscription expiry cron (daily 08:00):**
- Subscriptions expiring within 3 days → system notification: *"Dein Abo endet in 3 Tagen."*
- Subscriptions already expired → status set to `expired` + system notification: *"Dein Abo ist abgelaufen."*

---

### Admin — `/admin`

All admin routes require JWT with `role: admin`.

**Media moderation**

| Method | Path | Description |
|---|---|---|
| GET | `/admin/media/pending` | List all `media_uploads` with `moderation_status = 'pending'`. Returns `id`, `file_url`, `uploaded_at`, `uploaded_by`, `nickname`. |
| PATCH | `/admin/media/:id/approve` | Approve a photo: sets `moderation_status = approved`, `needs_review = false`, records reviewer + timestamp, deletes open `admin_ticket`, sends owner notification. Returns 204. |
| PATCH | `/admin/media/:id/reject` | Reject a photo. Body: `{ reason: string }`. Records reviewer, timestamp, and reason; deletes open `admin_ticket`; nulls `profile.photo_id`; sends owner notification. Returns 204. |

**User management**

| Method | Path | Description |
|---|---|---|
| POST | `/admin/users/create` | **Owner only.** Create a new admin account. Body: `{ email, password, nickname }`. Returns `{ id, nickname, public_id }`. |
| GET | `/admin/users` | Paginated user list. Query: `role`, `is_banned`, `search` (nickname), `page`, `limit`. Returns `{ data, total, page, limit }`. |
| PATCH | `/admin/users/:id/ban` | Ban a user. Body: `{ duration: '24h' \| '7d' \| '30d' \| 'permanent', reason: string, report_id?: UUID }`. Auto-calculates `ban_expires_at` from `duration`. Auto-creates a strike record. Sends ban email via `MailService`. Emits `user.banned` via EventEmitter → ChatGateway pushes `user.banned` socket event to the target user. Returns `{ success: true, ban_expires_at, type }`. |
| PATCH | `/admin/users/:id/unban` | Lift a ban. Emits `user.unbanned` via EventEmitter → ChatGateway pushes `user.unbanned` socket event to the target user. |
| PATCH | `/admin/users/:id/role` | **Owner only.** Change role. Body: `{ role: 'user' \| 'admin' \| 'org' }`. |
| PATCH | `/admin/users/:id/vulnerable-flag` | Set or unset `vulnerable_flag`. Body: `{ vulnerable_flag: boolean }`. |
| GET | `/admin/users/:id/export` | DSGVO data export for a user. Returns all rows across profiles, interests, sensitive data, consent logs, notifications, reports, strikes, blocks, contact requests, media uploads, and vulnerable flag audit. |
| POST | `/admin/users/:id/send-password-reset` | Trigger a password-reset email for a user. Generates a 1-hour reset token and sends it via `MailService`. Returns `{ message }`. |
| PATCH | `/admin/users/:id/email` | Override a user's email address. Body: `{ new_email: string }`. Updates encrypted email + search hash. |

**Reports**

| Method | Path | Description |
|---|---|---|
| GET | `/admin/reports` | Paginated report list. Query: `status` (`open` \| `reviewed` \| `closed`), `page`, `limit`. |
| PATCH | `/admin/reports/:id` | Update a report. Body: `{ status: string, note?: string }`. Closed reports cannot be updated. |

**Strikes**

| Method | Path | Description |
|---|---|---|
| GET | `/admin/strikes` | Paginated strike list with `user_nickname`. Query: `page`, `limit`. |
| POST | `/admin/strikes` | Create a strike. Body: `{ user_id, type: 'warning' \| 'temp' \| 'permanent', reason, expires_at? }`. `temp` requires `expires_at`; `permanent` must omit it. Automatically bans the user for `temp`/`permanent` strikes. |

**Profanity word list**

| Method | Path | Description |
|---|---|---|
| GET | `/admin/profanity` | List all runtime-added custom profanity words (`word`, `added_by`, `added_at`). |
| POST | `/admin/profanity` | Add a word. Body: `{ word: string }`. Persists to `profanity_words` table and loads into leo-profanity runtime. |
| DELETE | `/admin/profanity/:word` | Remove a word. |

**Dashboard stats**

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard/user-stats` | JWT. Returns `{ pendingRequests, activeConversations, subscription: { plan, status, expires_at } \| null }` for the calling user. Used by the frontend dashboard "Mein Überblick" section. |
| GET | `/admin/dashboard/admin-stats` | JWT (admin). Returns `{ openReports, openTickets, strikesThisWeek, pendingMedia }`. Used by the frontend dashboard "Moderations-Überblick" section. |
| GET | `/admin/dashboard/stats` | JWT (owner). Full platform metrics: `{ totalUsers, activeUsers, bannedUsers, newUsersToday, newUsersThisWeek, activeSubscriptions, totalRevenue, onlineUsers, messagesToday, messagesThisWeek, contactRequestsToday, contactRequestsThisWeek, openReports, strikesThisWeek, openTickets, pendingMedia }`. |

**Admin management (owner only)**

| Method | Path | Description |
|---|---|---|
| GET | `/admin/admins` | **Owner only.** Paginated list of admin accounts with profile info. Query: `page`, `limit`. |

**Conversations**

| Method | Path | Description |
|---|---|---|
| POST | `/admin/conversations` | Create or retrieve a direct conversation between the calling admin and a target user. Body: `{ target_user_id: UUID }`. Returns `{ conversation_id }`. |

**Admin tickets**

| Method | Path | Description |
|---|---|---|
| GET | `/admin/tickets` | Paginated list of admin tickets. Query: `type` (`nickname \| image \| audio \| support_request \| other`), `status` (`open \| reviewed \| resolved \| dismissed`), `page`, `limit`. |
| PATCH | `/admin/tickets/:id/status` | Update a ticket's status. Body: `{ status: string }`. |

**System settings (owner only)**

| Method | Path | Description |
|---|---|---|
| GET | `/admin/settings` | **Owner only.** List all system settings (`key`, `value`, `updated_by`, `updated_at`). |
| PATCH | `/admin/settings/:key` | **Owner only.** Create or update a setting. Body: `{ value: string }`. |

---

### Cities — `/cities`

Public, unauthenticated.

| Method | Path | Description |
|---|---|---|
| GET | `/cities/search?q=&country=` | City autocomplete. `q` (required) — partial name; `country` (optional) — ISO 3166-1 alpha-2 filter. Returns up to 10 cities ordered by population descending: `{ id, name, country, region, lat, lng }[]`. |

---

### System Settings — `/system-settings`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/system-settings/prices` | — | Returns current subscription prices: `{ monthly, yearly, lifetime }` (string values in EUR). Defaults: `9.99` / `49.99` / `149.99`. Used by the frontend to show prices on plan selection buttons. |
| PATCH | `/system-settings/prices` | JWT + Owner | Update one or more subscription prices. Body: `{ monthly?, yearly?, lifetime? }` (all optional strings). Returns the updated price object. |

---

### Setup — `/setup`

Public, unauthenticated. Rate-limited per IP (max 5 attempts in-process).

| Method | Path | Description |
|---|---|---|
| GET | `/setup/status` | Returns `{ setupComplete: boolean }`. `true` once an `owner` account exists. |
| POST | `/setup` | Create the first owner account. Body: `{ email, password, nickname }`. Returns 403 if setup is already complete. Bypasses throttler. |

---

### Support — `/support`

Public, unauthenticated.

| Method | Path | Description |
|---|---|---|
| POST | `/support/contact` | Submit an anonymous support ticket. Body: `{ email, message, nickname?, public_id? }`. Rate-limited to 3 requests/hour per IP. Inserts an `admin_tickets` row with `type = 'support_request'` and `source = 'login_screen'`. Returns `{ message: 'Anfrage übermittelt' }`. |

---

### GDPR — `/gdpr`

All GDPR routes require JWT.

| Method | Path | Description |
|---|---|---|
| GET | `/gdpr/export` | Generate and download a PDF containing all personal data stored for the authenticated user (Art. 15 DSGVO). Rate-limited to once every 30 days via `last_gdpr_export_at` on the `users` table. Returns a streamed `application/pdf` with 14 data sections: account, profile, sensitive data, consent logs, interests, media uploads, subscriptions, payment history, sent messages (max 500), notification settings, contact requests (sent + received), blockings, submitted reports, strikes. Sensitive fields (email, disability type) are AES-256-CBC decrypted before inclusion. `blocked_id` and third-party UUIDs are never exposed. |

---

### Hidden Zone — `/hidden`

All hidden zone routes require JWT. Zone access is enforced client-side only (no server-side unlock flag — JWT is sufficient).

**Coin — `/hidden/coin`**

| Method | Path | Description |
|---|---|---|
| GET | `/hidden/coin/balance` | Own coin balance. First call seeds 100 starting coins (`starting_bonus` transaction). |
| POST | `/hidden/coin/packages/:package` | Purchase coins via Stripe Embedded Checkout. Packages: `sardine` / `thunfisch` / `hai` / `moby_dick`. Returns `{ clientSecret }`. |
| POST | `/hidden/coin/webhook` | Stripe webhook for coin purchase confirmation. |

**Teeth — `/hidden/teeth`**

| Method | Path | Description |
|---|---|---|
| GET | `/hidden/teeth` | List own teeth records. |
| GET | `/hidden/teeth/chains` | List own tooth chains. |
| POST | `/hidden/teeth/transform` | Convert 15 unconverted teeth into a `tooth_chain`. |

**Badge — `/hidden/badge`**

| Method | Path | Description |
|---|---|---|
| GET | `/hidden/badge/mine` | Own active badges (not yet expired). |

**Beef — `/hidden/beef`**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/hidden/beef` | JWT | Create a beef challenge. Burns `entry_cost` coins. Body: `{ target_id, tldr, game_type, duration_seconds?, chat_passage? }`. |
| GET | `/hidden/beef/pending` | JWT (admin) | Beefs awaiting admin approval. |
| GET | `/hidden/beef/incoming` | JWT | Incoming WAITING beefs (caller is target). |
| GET | `/hidden/beef/my-active` | JWT | ACTIVE + game-phase beefs involving the caller. |
| GET | `/hidden/beef/public` | JWT | ACTIVE + game-phase beefs not involving the caller (spectator). |
| GET | `/hidden/beef/highscore` | JWT | Top 20 players by win count. |
| GET | `/hidden/beef/exile/status` | JWT | Own exile status: `{ in_exile, exile_until }`. |
| POST | `/hidden/beef/exile/leave` | JWT | Clear own exile if eligible. |
| GET | `/hidden/beef/:id` | JWT | Beef detail (includes `game_type`, `game_deadline_at`, `pot_coins`). |
| POST | `/hidden/beef/:id/respond` | JWT | Target responds: `{ response: 'fight' \| 'chicken' }`. Chicken → 24h exile for both parties. |
| PATCH | `/hidden/beef/:id/approve` | JWT (admin) | Approve a pending beef. |
| DELETE | `/hidden/beef/:id/reject` | JWT (admin) | Reject and refund entry cost. |
| POST | `/hidden/beef/:id/vote` | JWT | Wager coins on a side. Body: `{ coins_wagered }`. |
| POST | `/hidden/beef/:id/comment` | JWT | Post a comment (open during beef + 5 min post-game window). |
| GET | `/hidden/beef/:id/comments` | JWT | List comments. |
| GET | `/hidden/beef/:id/votes` | JWT | Vote distribution. |
| POST | `/hidden/beef/:id/ready` | JWT | Signal game-ready. GO fires when both players are ready. |
| POST | `/hidden/beef/:id/move` | JWT | Submit a game move. Body: `{ move: {...} }` — see shapes below. |
| GET | `/hidden/beef/:id/game` | JWT | Current game state (board, scores, status). |
| POST | `/hidden/beef/dev/quick-fight` | JWT | **Dev only** (returns 404 in production). Bypasses approval flow; creates a match directly in `game_pending`. |

**Game move shapes:**

| `game_type` | `move` body |
|---|---|
| `rps` | `{ choice: 'rock' \| 'paper' \| 'scissors' \| 'lizard' \| 'spock' }` |
| `tictactoe` | `{ position: 0–8 }` |
| `mastermind` | `{ guess: string[] }` (4-element color code array) |
| `reaction` | No REST move — use `game:reaction_click` on the `/hidden-beef` socket instead |

**Dev endpoints (return 404 in production):**

| Method | Path | Description |
|---|---|---|
| POST | `/hidden/beef/dev/quick-fight` | Bypasses approval/waiting/active flow; creates a beef directly in `game_pending`. Body: `{ targetUserId, gameType }`. Used by the frontend `DevQuickFight` panel. |

**Game handlers** (`src/modules/hidden/beef/games/`):

| Handler | Notes |
|---|---|
| `rps` | 5 choices (RPSLS); each beats exactly 2 others; `BEATS: Record<Choice, [Choice, Choice]>`; 28 unit tests covering all 25 combinations |
| `tictactoe` | Best-of-3 rounds; 25 s turn timer (in-memory Map); timeout places a random empty cell; `round_over`/`round_winner` state fields for inter-round result banner |
| `mastermind` | Code-setter vs guesser assigned randomly; 8 guesses max; exact + color pin feedback; time-based winner if neither solves; gateway sends per-role payloads (opponent rows redacted via `fetchSockets()`) |
| `reaction` | GO delay 200 ms–5 s; `go_sent_at` written to DB **before** broadcasting `game:go`; `game:reaction_ready` handshake — GO only fires after both clients confirm component mount |

---

## WebSocket Events

Gateway runs on the same port as HTTP. Auth via `auth.token` in socket handshake.

| Direction | Event | Payload | Description |
|---|---|---|---|
| Client → Server | `join_conversation` | `conversationId: string` | Subscribe to a conversation room. Admins also auto-join a shared `admin` room on connect (used for `ticket.new` broadcasts). |
| Client → Server | `send_message` | `{ conversationId, content, type }` | Send a message. |
| Client → Server | `typing` | `conversationId: string` | Broadcast typing indicator to other participant. |
| Client → Server | `read_messages` | `conversationId: string` | Mark all messages in conversation as read. |
| Server → Client | `new_message` | `Message` | New message delivered to conversation participants. |
| Server → Client | `user_typing` | `{ userId, conversationId }` | Typing indicator forwarded to other participant. |
| Server → Client | `messages_read` | `{ conversationId, userId }` | Notifies that messages have been read. |
| Server → Client | `notification` | `Notification` | Real-time in-app notification pushed to recipient. |
| Server → Client | `contact_request` | `ContactRequest` | Incoming contact request pushed to recipient. |
| Server → Client | `user.banned` | `{}` | Pushed to the banned user's personal room when an admin bans them or the auto-suspend threshold is reached. Frontend shows the ban screen. |
| Server → Client | `user.unbanned` | `{}` | Pushed to the user's personal room when an admin lifts a ban. Frontend hides the ban screen. |
| Server → Client | `ticket.new` | `{}` | Pushed to all connected admin clients (shared `admin` room) whenever a new `admin_tickets` row is created — from reports, profanity nickname/image tickets, or support contact submissions. |

### Hidden Beef Gateway — `/hidden-beef`

Separate Socket.io namespace. JWT verified on connect (`auth.token` or `query.token` in handshake) — unauthenticated clients are disconnected immediately. `client.data.userId` set from token `sub`. Clients join `beef:{id}` rooms.

| Direction | Event | Payload | Description |
|---|---|---|---|
| Client → Server | `join_beef` | `beefId: string` | Join a beef room (required to receive game events). |
| Client → Server | `leave_beef` | `beefId: string` | Leave a beef room. |
| Client → Server | `game:reaction_ready` | `{ beefId }` | Reaction component mounted; GO fires once both players have signalled. |
| Client → Server | `game:reaction_click` | `{ beefId }` | Reaction click. `userId` resolved from JWT — never from payload. |
| Server → Client | `beef:vote_update` | `{ initiator_coins, target_coins, total_votes }` | Vote distribution updated. |
| Server → Client | `beef:comment_new` | `Comment` | New comment posted. |
| Server → Client | `beef:closed` | `{ winner_id \| null }` | Beef resolved. |
| Server → Client | `game:state_update` | `{ state, game_type, initiator_ready, target_ready }` | Lifecycle change (`waiting` → `in_game` → `finished`). |
| Server → Client | `game:go` | `{ sent_at }` | GO signal for ReactionGame. Fired only after both players send `game:reaction_ready`. |
| Server → Client | `game:board_update` | Board state (game-type-specific) | State after each move. Mastermind: per-socket payload via `fetchSockets()` — each player sees only own rows; opponent rows redacted. |
| Server → Client | `game:finished` | `{ winner_id \| null }` | Game over; winner determined. |

---

## Frontend

The XXX frontend (`xxx-frontend`) runs on port 3001.

- **CORS:** configured for `http://localhost:3001` with `credentials: true` on all HTTP routes and the WebSocket gateway.
- **WebSocket Gateway:** runs on the same port as the HTTP server (3000). Uses socket.io with JWT auth (`auth.token` from the handshake).

---

## Environment

Copy `.env.example` to `.env` and fill in all values.

| Variable | Description |
|---|---|
| `PORT` | HTTP server port (default `3000`) |
| `DB_HOST` | Postgres host |
| `DB_PORT` | Postgres port (default `5432`) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret for signing JWTs |
| `APP_ENCRYPTION_KEY` | 32-byte hex key for AES-256-CBC (email, sensitive data) |
| `EMAIL_SALT` | Salt for email search hash (SHA-256) |
| `APP_URL` | Base URL used in verification email links |
| `BACKEND_URL` | Base URL for file URLs stored in media records (default `http://localhost:3000`) |
| `CORS_ORIGIN` | Allowed CORS origin (e.g. `http://localhost:3001`) — **required** |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `STRIPE_SECRET_KEY` | Stripe secret API key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_RETURN_URL` | URL Stripe redirects to after Embedded Checkout completes (e.g. `http://localhost:3001/settings`) |

---

## Running Locally

```bash
npm install
```

Copy `.env.example` to `.env` and fill in all values.

```bash
# development (watch mode)
npm run start:dev

# production
npm run start:prod
```

Migrations are plain SQL files in `migrations/`. Run them in order against your PostgreSQL database before starting the server.

---

## Changelog

### 2026-06-09 — Matching Feature: Swipe Deck, Swipe Action, Matches List
- feat(matching): new `MatchingModule` (`DiscoverController`, `MatchingService`) wired into `AppModule`
- feat(matching): `GET /discover/deck` — scored candidate deck (interest overlap + PostGIS distance scoring); excludes self, banned/deleted, and already-swiped users (likes permanent, skips expire 30 days)
- feat(matching): `POST /discover/swipe` — records like/skip; mutual like creates `Match` row (canonical pair order: `user_a_id < user_b_id`) + `Conversation`; returns `{ matched, conversation_id }`
- feat(matching): `GET /discover/matches` — returns all mutual matches with partner profile, approved photo, and `conversation_id` (nullable); ordered by `matched_at DESC`
- feat(profile): `PATCH /profile/me/interests/:id` — toggle `is_green` flag on user interests
- feat(seed): expanded interest catalog ~3× + red-flag interests for demo users

### 2026-06-08 — Beef Game System: Bugfixes & Security
- fix(reaction): `go_sent_at` written to `game.state` (new object spread) **before** emitting `game:go` — prevents reaction handler bail-out on click; timing calc is now always valid
- fix(reaction): `reaction.handler.ts` — `'initiator_placeholder'` → `'initiator'`; `initiator_reaction_ms` was never recorded
- fix(gateway): `handleReactionClick` resolves `userId` from `client.data.userId` (JWT), not from untrusted payload
- fix(gateway): `handleConnection` verifies JWT on connect; unauthenticated sockets disconnected immediately; `client.data.userId` set from token `sub`
- feat(tictactoe): turn timer raised from 15 s to 25 s; timeout places a random empty cell instead of forfeiting (in-memory `Map` per beef, cleared/reset on each move and `advanceToNextRound`)
- feat(rps): extended to RPSLS (Rock/Paper/Scissors/Lizard/Spock) — `BEATS` changed to `Record<Choice, [Choice, Choice]>`; `getWinner` uses `BEATS[i].includes(t)`; 28 unit tests for all 25 combinations
- feat(mastermind): gateway emits per-role `game:board_update` payloads via `fetchSockets()` — initiator/target see own rows + opponent attempt count only; `initiatorId`/`targetId` added to `BeefGameBoardUpdateEvent`
- feat(tictactoe): `round_over`/`round_winner` state fields; `advanceToNextRound` fires after 2.5 s server-side delay
- feat(beef): migration 036 — `comment_window_until TIMESTAMPTZ`; `addComment` enforces the 5-min post-game window

### 2026-06-08 — Beef Game System: Realtime & Flow
- fix: migration 035 adds `game_pending` + `in_game` to `chk_beef_status` DB constraint
- fix: `GET /hidden/beef/:id` now includes `game_type`, `game_deadline_at`, `pot_coins` in response
- fix: `getMyActive` includes `game_pending`/`in_game` statuses
- fix: move endpoints require `{ move: {...} }` wrapper in request body
- fix: game lifecycle events (`waiting`/`in_game`/`finished`) correctly typed and emitted via `TypedEventBus`
- fix: `startGamePhase` emits `game:state_update` socket event on game start
- fix: `BeefScheduler` uses `winner_id: IsNull()` guard to prevent re-processing resolved games
- fix: `game:board_update` emitted from `onGameBoardUpdate` for all game types after every move
- fix: TicTacToe `move.index` → `move.position`; Mastermind `move.code` → `move.guess` + `realtime = true`
- feat: `GET /hidden/beef/:id/game` returns current board state (reload/reconnect support)
- feat: `GET /hidden/beef/public` lists `game_pending`/`in_game` beefs as spectatable
- feat: `POST /hidden/beef/dev/quick-fight` — dev-only endpoint, bypasses approval flow (returns 404 in production)

### 2026-06-07 — Beef Game System: Initial Implementation
- feat(beef): full game system — `BeefGameService`, `BeefGameEntity` (JSONB state), game handler interface + `GameRegistry`
- feat(games): `RpsHandler`, `TicTacToeHandler`, `MastermindHandler`, `ReactionHandler`
- feat(beef): coin pot — entry cost burned on create + accept; `BeefResolutionService` distributes pot via 10/30/60 split (`SystemSettings`)
- feat(beef): `POST /hidden/beef/:id/ready` → both ready → game starts → `game:state_update` broadcast
- feat(chat): `GET /chat/conversations/partners` — returns only users with an active conversation (used by beef target search)
- feat(beef): `HiddenBeefGateway` added to `BeefModule`; `JwtModule.registerAsync` registered for socket auth
- fix: migration 034 adds `spent_beef_open` + `spent_beef_accept` to `chk_coin_tx_type` constraint
- fix: `BeefService.create` rolls back beef record if `spendCoins` throws
- feat(migrations): migrations 029–036 (game tables, pot coins, AGB consent, verification tokens, conversation per-user soft-deletes, coin tx types, beef game statuses, comment window)
- test: unit tests for `RpsHandler`, `TicTacToeHandler`, `MastermindHandler`, `BeefResolutionService` coin split
- chore: cities table seeded with 206 entries

### 2026-05-31 (latest)
- Feat (`admin.controller.ts`, `admin.service.ts`): zwei neue Owner-only Endpoints — `GET /admin/owner/coin-transactions` und `GET /admin/owner/cash-transactions`; beide joinen `profiles.nickname` per Raw-SQL und sind durch `OwnerGuard` geschützt

### 2026-05-31
- Fix (`beef.service.ts`, `notifications.service.ts`): Beef-Benachrichtigungen (`notifyBeefRequest`, `notifyBeefAccepted`) enthielten keine Nicknamen — beide Methoden holen jetzt das Profil per gezielter SQL-Query und übergeben den Nickname als `content_vars`
- Feat (`notifications.service.ts`): alle `notify*`-Domain-Methoden speichern jetzt strukturierte i18n-Keys + `content_vars` statt interpolierter deutscher Strings; Migration `028` fügt `content_vars JSONB` zur `notifications`-Tabelle hinzu; Ban-Methode aufgeteilt in `notifyBanTemp` / `notifyBanPermanent` / `notifyBanRevoked`; `admin.service`, `chat.service`, `moderation.service`, `payment.service` angepasst

### 2026-05-31
- Fix (`chat.gateway.ts`): Owner-Rolle wird jetzt ebenfalls in den `admin`-WebSocket-Raum aufgenommen — zuvor erhielt der Platform-Owner keine Admin-Benachrichtigungen (`ticket.new`, `media:pending_review`)

### 2026-05-31
- Fix (`admin.service.ts`): „Aktive Chats" auf dem User-Dashboard zählte auch Gespräche, die der User bereits gelöscht hatte — Query filtert jetzt korrekt nach `deleted_at_a`/`deleted_at_b`

### 2026-05-31
- Feat (`media.service.ts`): nach jedem Profilbild-Upload wird Event `media.pending_review` emitted
- Feat (`chat.gateway.ts`): `@OnEvent('media.pending_review')` leitet Event als `media:pending_review` an den WebSocket-Adminraum weiter

### 2026-05-31
- Fix (`profanity.service.ts`): `check()` erkennt jetzt Leet-Speak (1→i, 3→e, 0→o, …) und mit Leerzeichen/Punkten/Strichen aufgeteilte Wörter (z.B. „n 1 g g 3 r") — normalisierter Text wird intern geprüft, nie gespeichert

### 2026-05-30
- Fix (`coin.service.ts`): `confirmCoinPurchase` — idempotency check was querying `beef_id` (UUID column) with a Stripe session ID string, causing a Postgres type error and 500; now uses `idempotency_key` (text) for both the duplicate check and the saved record
- Fix (`coin.service.ts`): balance update and transaction insert in `confirmCoinPurchase` now run inside a single DB transaction — prevents partial credit if either write fails

### 2026-05-29 (latest)
- Shared: new `SharedModule` (`src/modules/shared/`) — global module exports `TypedEventBus`, `AppEvents` constants, and typed payload interfaces; all cross-module emitters and `@OnEvent` listeners now use strongly-typed keys instead of raw strings
- Events: `TypedEventBus` wraps `EventEmitter2` with generic `emit<K>(event, payload)` / `on<K>(event, handler)` — payload shapes enforced at compile time; `BeefService`, `BeefGateway`, and `ChatService` migrated
- Beef: `BeefStateMachineService` (`beef.statemachine.ts`) — formal state machine with `BeefEvent` enum (`APPROVE`, `ACCEPT`, `CHICKEN`, `CLOSE`) and `BadTransitionError`; `BeefService` delegates all status transitions to it, removing direct `status = X` assignments
- Beef: `BeefResolutionService` — transactional `resolve()` handles winner/loser badge creation, tooth awards, and coin payouts in a single DB transaction; race condition on simultaneous coin spends fixed
- Notifications: `NotificationsService` gains domain-specific helpers (`notifyBan`, `notifyUnban`, `notifyNewMessage`, etc.) — removes raw notification type-string literals from `AdminService`, `ModerationService`, `ChatService`, and `BeefService`
- Profile: `ProfileView` and `PublicProfile` typed interfaces added; `ProfileService.getOwnProfileWithPhoto()` and `getPublicProfile()` return these types explicitly; controller methods annotated accordingly

### 2026-05-28 (latest)
- Notifications: migration `026_notification_beef_types.sql` — adds `beef_request`, `beef_accepted`, `beef_won`, `beef_lost` values to `notification_type` enum
- Beef: `duration_seconds INT NOT NULL DEFAULT 86400` column added to `beefs` table; migration `025_beef_duration.sql`; `Beef` entity updated; `CreateBeefDto` gains optional `duration_seconds` (int, min 900 = 15 min, max 172800 = 48 h)
- Beef: new `BeefScheduler` (`beef.scheduler.ts`) — `@Cron(EVERY_MINUTE)` closes ACTIVE beefs whose `ends_at` has passed (`closeExpiredBeefs`); `@Cron(EVERY_5_MINUTES)` auto-chickens WAITING beefs unanswered for >24 h (`autoChickenExpired`) — marks status `CHICKENED`, increments target's `chicken_count`, sets 24 h exile on both initiator and target; `BeefModule` updated to include `BeefScheduler` in providers
- Beef: `create()` — initiator exile is now auto-cleared (`exile_until → null`) instead of throwing `BadRequestException`; target exile check still throws
- Beef: `getHighscore()` new service method — groups closed beefs by `winner_id`, joins `profiles` for nickname, orders by win count DESC, limit 20; exposed as `GET /hidden/beef/highscore` (added before `@Get(':id')` to prevent routing conflict)
- Badge: new `BadgeController` (`badge.controller.ts`) — `GET /hidden/badge/mine` returns `badgeService.getActiveBadges(req.user.sub)`; `BadgeModule` updated with `JwtModule.registerAsync`, `BadgeController` in controllers, `JwtGuard` in providers

### 2026-05-28
- CoinService: new `ensureBalance(userId)` method — inserts a `user_coin_balance` row with 100 starting coins and a `starting_bonus` transaction on first touch; called at the start of `getBalance()`, `addCoins()`, and `spendCoins()` so every user receives the bonus automatically on their first coin interaction
- CoinService: `addCoins()` and `spendCoins()` rewritten using raw parameterised SQL (`INSERT … ON CONFLICT DO UPDATE` / `UPDATE … SET balance = balance - $1`) — replaces the TypeORM `upsert()` function-expression hack that silently failed in development
- BeefService: `CoinService` injected via constructor; `BeefModule` imports `CoinModule`
- Beef `create()`: after saving the beef, awards the initiator 50 coins (`earned_beef_open`)
- Beef `vote()`: spends `dto.coins_wagered` coins (`spent_vote`) before creating the vote record; throws `BadRequestException` if balance is insufficient
- Beef `addComment()`: awards 5 coins (`earned_comment`) for the user's first 3 comments on a beef (anti-spam cap)
- Migration `024_coin_starting_bonus_type.sql`: drops and recreates `chk_coin_tx_type` constraint on `coin_transactions` to include `starting_bonus` alongside all existing types

### 2026-05-27 (latest)
- Beef: `exile_until TIMESTAMPTZ` column added to `users` table; `User` entity updated; migration `023_user_exile.sql` applied
- Beef: `create()` guards — initiator exile check, target exile check, duplicate active-beef check (either direction, statuses: `pending_approval | waiting | active`); throws `BadRequestException` or `ConflictException` accordingly
- Beef: `respond()` chicken branch — on chicken-out both initiator and target receive a 24 h exile (`exile_until = NOW() + 24h`); `userRepo.update` for each
- Beef: new service methods `leaveExile(userId)` and `getExileStatus(userId)` → `{ in_exile, exile_until }`
- Beef: new service methods `getIncoming(userId)` (WAITING beefs targeting caller), `getMyActive(userId)` (ACTIVE beefs involving caller), `listPublic(userId)` (ACTIVE beefs not involving caller), `getPending()` (PENDING_APPROVAL with initiator/target nicknames via LEFT JOIN on `profiles`)
- Beef: new controller routes — `GET /hidden/beef/pending`, `GET /hidden/beef/incoming`, `GET /hidden/beef/my-active`, `GET /hidden/beef/public`, `GET /hidden/beef/exile/status`, `POST /hidden/beef/exile/leave`; all named routes ordered before bare `@Get()` to prevent routing conflicts

### 2026-05-27
- Hidden Zone: new `BeefModule` (`src/modules/hidden/beef`) — full beef challenge system: `POST /hidden/beef` (create), `POST /hidden/beef/:id/respond` (fight/chicken), `PATCH /hidden/beef/:id/approve` (admin), `GET /hidden/beef` (list active), `POST /hidden/beef/:id/vote`, `POST /hidden/beef/:id/comment`, `GET /hidden/beef/:id/comments`, `GET /hidden/beef/:id/votes`
- Hidden Zone: new `CoinModule` (`src/modules/hidden/coin`) — `GET /hidden/coin/balance`; `CoinService` exports `addCoins()` and `spendCoins()` (atomic upsert on `user_coin_balance` + transaction log)
- Hidden Zone: new `TeethModule` (`src/modules/hidden/teeth`) — `GET /hidden/teeth`, `GET /hidden/teeth/chains`, `POST /hidden/teeth/transform` (converts 15 unconverted teeth into a `tooth_chain`)
- Hidden Zone: new `BadgeModule` (`src/modules/hidden/badge`) — service-only (no controller); `BadgeService.getActiveBadges()` filters by `expires_at > NOW()`; `createBadge()` used internally when beef resolves
- Users: `chicken_count INT NOT NULL DEFAULT 0` column added to `users` table; incremented when a target chickens out of a beef challenge (`respond` endpoint, `response = 'chicken'`)
- Migration `022_hidden_beef_feature.sql` — creates `beefs`, `beef_votes`, `beef_comments`, `coin_transactions`, `user_coin_balance`, `teeth`, `tooth_chains`, `badges` tables with all constraints and FK cascades

### 2026-05-26 (latest)
- Cities: new `CitiesModule` — `GET /cities/search?q=&country=` (public); queries a seeded `cities` table (`id`, `name`, `country`, `region`, `lat`, `lng`, `population`, `is_capital`); returns top 10 results ordered by population descending
- Profile: `GET /profile/search` now accepts `lat`, `lng`, `radius` (km, 1–500, default 50) — uses PostGIS `ST_DWithin` radius search when coordinates are provided; city text search used as fallback
- Profile: `PUT /profile/me` now accepts optional `lat` + `lng` — updates `profiles.location` with `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`
- Notifications: `notifications` table gains `title` (varchar 255, nullable) and `related_id` (text, nullable) columns (migration `021_notification_title_related_id.sql`); `createNotification()` now accepts optional `title` and `relatedId` parameters
- Admin: `PATCH /admin/users/:id/unban` now also sends the unbanned user an in-app notification ("Deine Sperre wurde aufgehoben.")
- Admin: new `GET /admin/dashboard/user-stats` (JWT) — returns pending contact requests, active conversation count, and subscription for the calling user
- Admin: new `GET /admin/dashboard/admin-stats` (admin) — returns open reports, open tickets, strikes this week, pending media count
- Admin: new `GET /admin/dashboard/stats` (owner only) — full platform metrics: users, activity, revenue, and moderation counts
- TypeORM: `package.json` gains `seed:cities`, `migration:run`, `backfill:locations` npm scripts; data source configured with `migrations` path + `migrationsTableName`

### 2026-05-26
- System settings: new `SystemSettingsController` with public `GET /system-settings/prices` (returns `{ monthly, yearly, lifetime }`) and owner-only `PATCH /system-settings/prices`
- System settings: `SystemSettingsService` gains `getString(key, fallback)` method; `20_subscription_prices.sql` seeds default prices
- Admin: `PATCH /admin/users/:id/ban` now rejects attempts to ban an `owner` account (403); admins cannot ban other admins — only the `owner` can
- Admin: `PATCH /admin/users/:id/role` prevents changing one's own role and prevents changing the `owner` role; promoted-to-admin users get `onboarding_completed = true` automatically
- Chat: `POST /chat/requests` now returns 403 if either party has `role = 'admin'`
- Notifications: `createNotification()` now skips users with `role = 'admin'` (admins do not receive system notifications)
- WebSocket: admin clients join a shared `admin` room on connect; `ticket.new` event pushed to all connected admins whenever a new ticket is created (report filed, profanity ticket, support contact)

### 2026-05-24 (latest)
- Auth: `POST /auth/login` now accepts `identifier` (email **or** nickname) instead of email only
- Auth: new `PATCH /auth/change-password` (JWT) — change own password; verifies current password before updating
- Auth: new `PATCH /auth/change-email` (JWT) — change own email; verifies current password; updates encrypted email + search hash
- Roles: new `owner` role added to `user_role` enum (migration `019_owner_role.sql`); partial unique index enforces max-1 owner; `OwnerGuard` added (`src/common/guards/owner.guard.ts`)
- Roles: `RolesGuard` updated — `owner` implicitly inherits all `admin` permissions
- Admin: `POST /admin/users/create` (owner only) — create a verified admin account (email, password, nickname)
- Admin: `POST /admin/users/:id/send-password-reset` — admin-triggered password reset email (1-hour token)
- Admin: `PATCH /admin/users/:id/email` — override a user's encrypted email + search hash
- Admin: `PATCH /admin/users/:id/role` is now **owner-only** (was admin)
- Admin: `GET /admin/admins` (owner only) — paginated list of admin accounts
- Admin: `GET /admin/tickets` — paginated admin ticket list, filterable by `type` and `status`
- Admin: `PATCH /admin/tickets/:id/status` — update a ticket's status
- Admin: `POST /admin/conversations` — create or retrieve a direct conversation between an admin and a user
- Admin: `GET /admin/settings` and `PATCH /admin/settings/:key` are now **owner-only** (changed from `PUT` to `PATCH`)
- Setup: new `SetupModule` — `GET /setup/status`, `POST /setup`; bootstraps the first owner account; IP-rate-limited (max 5 attempts); blocked once setup is complete
- Support: new `SupportModule` — `POST /support/contact`; public anonymous support tickets inserted into `admin_tickets` as `support_request`; rate-limited 3/hour per IP; `admin_tickets.user_id` is now nullable (migration `018_support_tickets.sql`); `source` column added to `admin_tickets`
- Profile: `status_message` column defaults to `'available'`; existing `NULL` rows backfilled (migration `016_profile_status_message_default.sql`)
- Guards: new `OptionalJwtGuard` (`src/common/guards/optional-jwt.guard.ts`) — JWT is decoded if present but never required

### 2026-05-23 (latest)
- Security: removed `DELETE /auth/dev/delete-user` endpoint and `devDeleteUser()` service method — no longer present in any environment
- Crypto: `src/common/crypto/crypto.helper.ts` — added `encryptField(value)` and `decryptField(buf)` shared helpers; removed duplicated AES-256-CBC encrypt/decrypt from `AuthService`, `GdprService`, and `ProfileService`; `APP_ENCRYPTION_KEY` now throws immediately on missing key instead of silently using an empty key
- Media / Profile: hardcoded `http://localhost:3000` URLs in profile photo and audio upload paths replaced with `process.env.BACKEND_URL ?? 'http://localhost:3000'`; `BACKEND_URL` added to `.env.example`
- Admin: `@InjectDataSource()` decorator was missing on `DataSource` in `AdminService` constructor — added
- Cleanup: deleted `src/app.controller.spec.ts` scaffold leftover

### 2026-05-23
- Admin: new `GET /admin/settings` and `PUT /admin/settings/:key` endpoints — read and write key/value pairs from the `system_settings` table
- `SystemSettingsService`: in-memory cache (60 s TTL) for settings reads; cache invalidated on write

### 2026-05-22 (latest)
- Admin: `PATCH /admin/users/:id/ban` reworked — body now `{ duration: '24h'|'7d'|'30d'|'permanent', reason, report_id? }`; `ban_expires_at` calculated server-side; auto-creates a `strikes` row; sends ban email; emits `user.banned` via EventEmitter; returns `{ success, ban_expires_at, type }`.
- Admin: `PATCH /admin/users/:id/unban` now emits `user.unbanned` via EventEmitter.
- Real-time: `ChatGateway` handles `user.banned` / `user.unbanned` EventEmitter events and pushes them to the user's personal socket room.
- Moderation: auto-suspend (`POST /moderation/reports`, threshold ≥ 10) refactored into `checkAutoSuspend()`; now emits `user.banned`, creates a strike with `issued_by = SYSTEM_USER_ID`, and sends an auto-suspend email.
- Mail: new `MailService.sendBanEmail(to, reason, expiresAt)` and `sendAutoSuspendEmail(to)` methods; `MailModule` imported into `AdminModule` and `ModerationModule`.
- Profile: `GET /profile/me` now returns `is_banned: boolean` (fetched from `users` table) — frontend uses this as the source of truth for the ban screen on startup.
- Chat: `acceptContactRequest` now detects an existing soft-deleted conversation and restores it (`deleted_at_a/b`, `purged_at` → `null`) instead of creating a duplicate.
- DB: migration `014_strikes_report_id_nullable.sql` — makes `strikes.report_id` nullable (auto-strikes and admin bans may not have an originating report).
- Common: new `src/common/crypto/crypto.helper.ts` — `decryptEmail(buf)` helper (AES-256-CBC decrypt, returns `null` on failure).

### 2026-05-22
- Chat: new `DELETE /chat/connections/:userId` — disconnect from a connected user; sets `deleted_at_a`, `deleted_at_b`, and `purged_at` on the conversation, reverts the accepted contact request to `declined`. Both sides lose access to the chat history.
- Chat: `GET /chat/conversations/:id` now returns `is_blocked: boolean` and `blocked_by: 'me' | 'them' | null` (checked against the `blocks` table for both directions).
- Chat: `ContactRequestStatus` enum gains `CANCELLED` value.
- Profile: new `GET /profile/me/blocks` — returns all users blocked by the caller (`block_id`, `user_id`, `nickname`, `photo_url`), ordered by block date descending.
- Moderation: `POST /moderation/reports` now counts distinct reporters per target after each submission; automatically bans the target and sends a system notification when ≥ 10 unique open/reviewed reports are found.

### 2026-05-21 (latest)
- Payment: `POST /payment/subscriptions` switched to Stripe Embedded Checkout — session now created with `ui_mode: 'embedded'` and `return_url`; endpoint returns `{ clientSecret }` instead of `{ url }`. `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` env vars replaced by `STRIPE_RETURN_URL`.

### 2026-05-21
- Auth: account reactivation — `POST /auth/login` now finds soft-deleted accounts and, if `deleted_at` is within 30 days, clears it on successful login (account restored). Accounts deleted >30 days ago are treated as non-existent (same `401` as a wrong password — no enumeration).
- Auth: `DELETE /auth/account` now bulk-revokes all active refresh tokens for the user at the time of soft-delete, preventing reuse of previously-issued cookies.
- Real-time: `@nestjs/event-emitter` added (`^3.1.0`); `EventEmitterModule.forRoot()` registered in `AppModule`.
- Real-time: `ChatGateway` — each authenticated user joins a personal room `user:{userId}` on socket connect; `emitToUser(userId, event, data)` helper pushes to that room.
- Real-time: `NotificationsService.createNotification()` emits `notification.created` after saving — `ChatGateway` listens and pushes a `notification` socket event to the recipient in real-time (no polling required).
- Real-time: `ChatService.sendContactRequest()` emits `contact_request.created` after saving — `ChatGateway` listens and pushes a `contact_request` socket event to the recipient in real-time.

### 2026-05-21
- GDPR: new `GdprModule` — `GET /gdpr/export` streams a PDF (Art. 15 DSGVO) with 14 data sections; rate-limited to once per 30 days via new `users.last_gdpr_export_at` column (migration `013_users_last_gdpr_export_at.sql`); decrypts email and disability type in-place; never exposes third-party UUIDs or hashed fields; pdfkit recursion fixed via `bufferPages: true` + post-render footer loop (removes `pageAdded` handler); long text truncated (bio 500 chars, all other free-text 300 chars); empty sections skip `addPage()`; message limit reduced to 100; profile SELECT corrected to actual entity columns
- Profile visibility: 6 new boolean columns on `profiles` (`show_bio`, `show_city`, `show_age`, `show_gender`, `show_interests`, `show_audio`, all `NOT NULL DEFAULT true`) — migration `012_profile_visibility_fields.sql`
- Profile: `PUT /profile/me` now accepts all six `show_*` fields as optional booleans
- Profile: `GET /profile/me` now returns all `show_*` flags and `subscription: { plan, status, current_period_end } | null` (queries `subscriptions` table for the active row)
- Profile: `GET /profile/:nickname` applies visibility masking — `bio`, `city`, `birthdate`, `gender`, `looking_for` return `null` when the corresponding flag is false; `audio_url` is only fetched and returned when `show_audio = true`; now also selects and returns `gender`, `looking_for`, `birthdate`
- Profile: `GET /profile/:nickname/interests` returns `[]` when `show_interests = false` (no interests fetched)
- Profile: `GET /profile/search` selects `birthdate` and all `show_*` flags; returns masked `bio`, `city`, `birthdate`, `gender`, `looking_for` (null when hidden) and masked interests (`[]` when `show_interests = false`)
- Admin: fixed missing `FileType` import in `admin.service.ts` (added to existing `media-upload.entity` import)

### 2026-05-21
- Admin: full admin module rewrite — all admin logic moved from `ModerationController` to a dedicated `AdminController` + `AdminService` under `/admin`
- Admin: `GET /admin/media/pending`, `PATCH /admin/media/:id/approve`, `PATCH /admin/media/:id/reject` — media moderation (returns 204; frontend fix applied for empty-body parsing)
- Admin: `GET /admin/users` — paginated, filterable user list (`role`, `is_banned`, `search`); SQL ENUM casts fixed (`::user_role`)
- Admin: `PATCH /admin/users/:id/ban`, `PATCH /admin/users/:id/unban`, `PATCH /admin/users/:id/role` — user management
- Admin: `GET /admin/reports`, `PATCH /admin/reports/:id` — report management with `note` field; SQL ENUM cast fixed (`::report_status`)
- Admin: `GET /admin/strikes`, `POST /admin/strikes` — admin strike creation (auto-bans user for `temp`/`permanent`)
- Admin: `GET /admin/profanity`, `POST /admin/profanity`, `DELETE /admin/profanity/:word` — runtime profanity word list management; words persisted in new `profanity_words` table (migration `010`)
- Admin: `GET /admin/users/:id/export` — DSGVO data export across all user-linked tables
- Profanity: `ProfanityService` now loads custom words from `profanity_words` DB table on `onModuleInit`; `addCustomWord` / `removeCustomWord` persist to DB and update runtime list
- DB: migration `009_profile_sensitive_data_rls.sql` — RLS on `profile_sensitive_data`; `is_admin_context()` helper function; `own_data`, `admin_access`, `caretaker_access` (placeholder) policies
- DB: migration `010_admin_profanity_words_report_note.sql` — `profanity_words` table; `reports.note` column
- Common: `src/common/database/rls.helper.ts` — `withRls(dataSource, userId, fn)` utility; pins a single QueryRunner, issues `SET LOCAL app.current_user_id` inside a transaction so RLS policies see the correct user context
- Common: `src/common/middleware/rls-context.middleware.ts` — `RlsContextMiddleware` decodes (not verifies) the Bearer token and stores `sub` on `req.rlsUserId` for downstream RLS helpers

### 2026-05-20
**Backend**
- Moderation: `GET /moderation/wordlist` — public endpoint returns `{ words: string[] }` from `PROFANITY_WORDLIST`
- Moderation: three new admin endpoints — `GET /admin/media/queue`, `PATCH /admin/media/:id/approve`, `PATCH /admin/media/:id/reject` (approve/reject sends system notification to owner; reject also nulls `profile.photo_id`)
- Moderation: `ProfanityService.createImageTicket()` — creates `admin_tickets` row on every profile photo upload
- Media: `POST /media/upload/profile-photo` now auto-creates an `admin_ticket` (type `image`) after save
- Media: `media_uploads` gains `needs_review` (bool, default `true`), `reviewed_at`, `reviewed_by`, `review_rejected_reason` (migration `008_media_review.sql`)
- Profile: `GET /profile/me`, `GET /profile/:nickname`, `GET /profile/search` all now return `photo_needs_review: boolean`
- Profanity wordlist: renamed export `CUSTOM_WORDS_DE` → `PROFANITY_WORDLIST`; expanded with EN variants (`fuck`, `nigger`, `bitch`, etc.); removed mild words (`idiot`, `depp`, `trottel`)

**Frontend** _(xxx-frontend)_
- Profanity filter: `lib/profanity.ts` — `leo-profanity` wrapper; `initProfanityFilter()` fetches word list from `GET /moderation/wordlist` on login
- Chat, public profile: `blurText()` applied to messages/bio/status when `profanity_filter = true` on current user
- Settings: "Schimpfwortfilter" toggle added, persists `profanity_filter` via `PUT /profile/me`
- Discover, profile, public profile: photos with `photo_needs_review = true` show blur overlay + "Wird überprüft" badge

### 2026-05-20
- Moderation: new `ProfanityService` — uses `leo-profanity` + German custom word list; `check()`, `blur()`, `flagUser()` (logs to `profanity_flags`), `createNicknameTicket()` (creates `admin_tickets` row)
- Profile: new `profanity_filter` boolean column (default `true`) on `profiles`; `PUT /profile/me` accepts `profanity_filter`
- Chat + Profile: profanity checks wired into bio, `status_message`, nickname changes, REST message send, and WebSocket `send_message`; bio/status/chat detections → `profanity_flags`; profane nickname changes → `admin_tickets`
- DB: migration `006_admin_tickets_profanity_flags.sql` — `admin_tickets` + `profanity_flags` tables; migration `007_profanity_filter.sql` — `profiles.profanity_filter` column

### 2026-05-19
- Profile: new `status_visible` (boolean, default `true`) and `status_message` (enum: `available` · `looking_for_chat` · `looking_for_date` · `busy` · `do_not_disturb`, nullable) columns on `profiles` (migration `003_status_fields.sql`)
- Profile: `PUT /profile/me` accepts `status_visible` and `status_message`
- Profile: `GET /profile/search` returns `status_visible`, `status_message`; `is_online` is now `true` only when `status_visible = true` AND `last_active_at > NOW() - 15min` (previously only the time check)
- Profile: `GET /profile/:nickname` returns `is_online`, `status_visible`, `status_message`, `last_active_at`
- Chat: `GET /chat/conversations` returns `partner_is_online`, `partner_status_visible`, `partner_status_message`, `partner_last_active_at` for each conversation; `ChatModule` now injects `ProfileRepository`

### 2026-05-19
- Auth: new `DELETE /auth/account` (JWT) — DSGVO Art. 17 soft-delete. Sets `deleted_at`, clears `refreshToken` cookie. Returns 400 if already deleted.
- Chat (WebSocket): `typing` event now verifies sender is a member of the conversation before emitting — prevents any authenticated user from sending typing indicators to arbitrary conversations
- Profile: `GET /profile/search` now excludes users with `enhanced_protection = true` or `vulnerable_flag = true` at the database level (WHERE clause, not JS filter)
- User entity: added `enhanced_protection` column mapping (boolean, default false)

### 2026-05-18
- Auth: refresh token moved to HttpOnly cookie — `POST /auth/login` sets cookie + returns `needsConsent` flag; `POST /auth/refresh` reads/rotates cookie; `POST /auth/logout` clears cookie
- Auth: new `GET /auth/agb-versions` (public) — returns all current AGB/privacy versions
- Auth: new `POST /auth/consent` (JWT) — bulk upsert consent logs (`{ consents: [{ agb_version_id, accepted }] }`)
- Auth: `AgbSeedService` seeds AGB v1.0 + Privacy v1.0 on application bootstrap
- Added `.env.example`
- Fixed env var names: `DATABASE_*` → `DB_*`; replaced SMTP vars with `RESEND_API_KEY`; added `CORS_ORIGIN`, `STRIPE_PUBLISHABLE_KEY`
- API global prefix changed to `/api/v1`

### 2026-05-14
- Media: new `MediaModule` — `POST /media/upload/profile-photo` accepts JPEG/PNG/WebP up to 5 MB, resizes to 800×800, converts to WebP via sharp, stores file under `uploads/profiles/`, saves a `MediaUpload` record, and updates `profile.photo_id`
- Profile: `GET /profile/me` now returns `photo_url` (resolved from `media_uploads.file_url` via `photo_id`); `null` when no photo set

### 2026-05-08
- Added Frontend + WebSocket Gateway documentation section

### 2026-05-07
- Profile: added `GET /profile/user/:userId` — looks up nickname + photo_id by account UUID. Required for frontend chat nickname resolution.

### 2026-05-07
- Profile: `GET /profile/search` now returns `user_id` (account UUID) alongside profile fields. Fixes frontend `isOwn` comparison in chat — `message.sender_id` is a user UUID, not a profile UUID.

### 2026-05-04
- Payment: Stripe webhook handlers for `checkout.session.completed` (subscription + payment log + system notification), `invoice.payment_failed` (system notification), `customer.subscription.deleted` (cancel)
- Payment: daily cron job (08:00) — notifies users 3 days before expiry; marks expired subscriptions and notifies users
- Payment: `GET /payment/logs` now requires active premium subscription via `@RequiresPremium()`
- Notifications: added `createNotification(userId, type, content)` shared method; exported from `NotificationsModule`
- Added `PremiumGuard` — checks active subscription with expiry logic; provided globally via `CommonModule`
- Added `@RequiresPremium()` decorator — bundles `JwtGuard` + `PremiumGuard` in one decorator
- Added global `HttpExceptionFilter` — structured error logging via NestJS `Logger`, consistent response shape
- Added `CommonModule` (`src/common/common.module.ts`) — shared module for cross-cutting guards

### 2026-04-29
- Profile: block/unblock (`POST /profile/me/block/:userId`, `DELETE /profile/me/block/:userId`), `Block` entity with unique constraint and CASCADE

### 2026-04-27 (`41c3a74`)
- Chat, Notifications, Moderation, Payment modules added
- Profile auto-created on register with generated nickname

### Earlier
- Auth module: register, login, refresh, logout, email verification, password reset
- Profile module: get/update own profile, publish, interests, search, sensitive data consent + submission
- Admin module: vulnerable-flag endpoint
