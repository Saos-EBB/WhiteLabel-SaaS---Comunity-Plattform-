

# XXX — Backend API

NestJS + PostgreSQL REST API.

---

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the values (see [Environment](#environment)).

```bash
# development (watch mode)
npm run start:dev

# production
npm run start:prod
```

---

## Environment

Copy `.env.example` to `.env` and fill in all values.

| Variable | Description |
|---|---|
| `DB_HOST` | Postgres host |
| `DB_PORT` | Postgres port (default `5432`) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret for signing JWTs |
| `APP_ENCRYPTION_KEY` | 32-byte hex key for AES-256-CBC (email, sensitive data) |
| `EMAIL_SALT` | Salt for email search hash (SHA-256) |
| `APP_URL` | Base URL used in verification email links |
| `CORS_ORIGIN` | Allowed CORS origin (e.g. `http://localhost:3001`) — **required** |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `STRIPE_SECRET_KEY` | Stripe secret API key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_SUCCESS_URL` | Redirect URL after successful checkout |
| `STRIPE_CANCEL_URL` | Redirect URL after cancelled checkout |
| `PORT` | HTTP server port (default `3000`) |

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
| POST | `/auth/login` | — | Login. Returns `{ accessToken, needsConsent }`. Sets `refreshToken` HttpOnly cookie (30 days). Blocked if `is_banned`. |
| POST | `/auth/refresh` | — (cookie) | Rotate refresh token using `refreshToken` cookie. Old token is revoked. Returns `{ accessToken }` + new cookie. |
| POST | `/auth/logout` | — (cookie) | Revoke refresh token from cookie and clear cookie. |
| GET | `/auth/me` | JWT | Returns current JWT payload (`sub`, `role`). |
| GET | `/auth/verify?token=` | — | Verify email address via token from email link. |
| POST | `/auth/forgot-password` | — | Send password reset email. Always returns same message (no email enumeration). |
| POST | `/auth/reset-password` | — | Reset password with token. Token valid 1 hour. |
| GET | `/auth/agb-versions` | — | List all current AGB/privacy policy versions. Used by frontend to display consent. |
| POST | `/auth/consent` | JWT | Bulk upsert consent logs. Body: `{ consents: [{ agb_version_id, accepted }] }`. |
| DELETE | `/auth/account` | JWT | Soft-delete own account (DSGVO Art. 17). Sets `deleted_at`. Clears `refreshToken` cookie. Idempotent — returns 400 if already deleted. |
| DELETE | `/auth/dev/delete-user` | JWT (admin) | **Dev only — remove before production.** Hard-delete user by email. |

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
| GET | `/profile/me` | JWT | Get own profile. Returns `photo_url`, `photo_needs_review`, `audio_url`, `audio_moderation_status`, all six `show_*` visibility flags (`show_bio`, `show_city`, `show_age`, `show_gender`, `show_interests`, `show_audio`), and `subscription: { plan, status, current_period_end } \| null` (active subscription row, or `null`). |
| PUT | `/profile/me` | JWT | Update own profile (nickname, bio, city, birthdate, gender, looking_for, `is_published`, `status_visible`, `status_message`, `profanity_filter`, `show_bio`, `show_city`, `show_age`, `show_gender`, `show_interests`, `show_audio`). Triggers onboarding check. Nickname changes containing profanity create an admin ticket for review; bio, `status_message`, and chat messages with profanity are silently logged to `profanity_flags`. |
| PATCH | `/profile/me/publish` | JWT | Publish profile. Requires onboarding completed (nickname + birthdate + city + ≥1 interest + verified email). |
| GET | `/profile/me/interests` | JWT | Get own selected interests. |
| POST | `/profile/me/interests/:interestId` | JWT | Add an interest. Triggers onboarding check. |
| DELETE | `/profile/me/interests/:interestId` | JWT | Remove an interest. |
| GET | `/profile/search?city=&interests=` | JWT | Search published profiles. Filters by city, interests, gender, looking_for, age range, online_only. Excludes banned, deleted, self, blocked (both directions), `enhanced_protection`, and `vulnerable_flag` users at DB level. Returns `status_visible`, `status_message`, `is_online`, `photo_needs_review`, `birthdate` (null when `show_age = false`). Fields masked by `show_*` flags: `bio`, `city`, `gender`, `looking_for` return `null` when hidden; interests return `[]` when `show_interests = false`. |
| POST | `/profile/me/consent/sensitive-data` | JWT | Record AGB consent for sensitive data collection. Returns consent log ID. IP is SHA-256 hashed. |
| POST | `/profile/me/sensitive-data` | JWT | Submit sensitive data (disability type + visibility). Requires valid consent ID. Disability type stored AES-256-CBC encrypted. |
| POST | `/profile/me/block/:userId` | JWT | Block a user. |
| DELETE | `/profile/me/block/:userId` | JWT | Unblock a user. |
| GET | `/profile/user/:userId` | JWT | Get nickname and photo_id for any account UUID. Used by frontend to resolve partner names in chat. |
| GET | `/profile/:nickname` | — | Public profile by nickname (published profiles only). Returns `is_online`, `status_visible`, `status_message`, `last_active_at`, `photo_needs_review`, `gender`, `looking_for`, `birthdate`. Fields masked by `show_*` flags: `bio`, `city`, `gender`, `looking_for`, `birthdate` return `null` when hidden; `audio_url` returns `null` when `show_audio = false`. Interests endpoint (`/:nickname/interests`) returns `[]` when `show_interests = false`. |

---

### Chat — `/chat`

All chat routes require JWT.

| Method | Path | Description |
|---|---|---|
| POST | `/chat/requests` | Send a contact request to another user. |
| GET | `/chat/requests/incoming` | List incoming pending contact requests. |
| GET | `/chat/requests/outgoing` | List outgoing pending contact requests. |
| PATCH | `/chat/requests/:id/accept` | Accept a contact request. Creates conversation. |
| PATCH | `/chat/requests/:id/decline` | Decline a contact request. |
| GET | `/chat/conversations` | List own conversations. Each entry includes `partner_is_online`, `partner_status_visible`, `partner_status_message`, `partner_last_active_at`. |
| GET | `/chat/conversations/:id` | Get a single conversation. |
| GET | `/chat/conversations/:id/messages` | Get messages for a conversation. |
| POST | `/chat/conversations/:id/messages` | Send a message in a conversation. |
| DELETE | `/chat/messages/:id` | Delete own message. |

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
| POST | `/moderation/reports` | JWT | Submit a report against a user or content. |
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
| POST | `/payment/subscriptions` | JWT | Create a Stripe Checkout session. Returns `{ url }`. |
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
| GET | `/admin/users` | Paginated user list. Query: `role`, `is_banned`, `search` (nickname), `page`, `limit`. Returns `{ data, total, page, limit }`. |
| PATCH | `/admin/users/:id/ban` | Ban a user. Body: `{ reason: string, expires_at?: ISO date }`. |
| PATCH | `/admin/users/:id/unban` | Lift a ban. |
| PATCH | `/admin/users/:id/role` | Change role. Body: `{ role: 'user' \| 'admin' \| 'org' }`. |
| PATCH | `/admin/users/:id/vulnerable-flag` | Set or unset `vulnerable_flag`. Body: `{ vulnerable_flag: boolean }`. |
| GET | `/admin/users/:id/export` | DSGVO data export for a user. Returns all rows across profiles, interests, sensitive data, consent logs, notifications, reports, strikes, blocks, contact requests, media uploads, and vulnerable flag audit. |

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

---

## Frontend

The XXX frontend (`xxx-frontend`) runs on port 3001.

- **CORS:** configured for `http://localhost:3001` with `credentials: true` on all HTTP routes and the WebSocket gateway.
- **WebSocket Gateway:** runs on the same port as the HTTP server (3000). Uses socket.io with JWT auth (`auth.token` from the handshake).
- **Socket events:**

| Direction | Event | Payload | Description |
|---|---|---|---|
| Client → Server | `join_conversation` | `conversationId: string` | Subscribe to a conversation room. |
| Client → Server | `send_message` | `{ conversationId, content, type }` | Send a message. |
| Client → Server | `typing` | `conversationId: string` | Broadcast typing indicator to other participant. |
| Client → Server | `read_messages` | `conversationId: string` | Mark all messages in conversation as read. |
| Server → Client | `new_message` | `Message` | New message delivered to conversation participants. |
| Server → Client | `user_typing` | `{ userId, conversationId }` | Typing indicator forwarded to other participant. |
| Server → Client | `messages_read` | `{ conversationId, userId }` | Notifies that messages have been read. |

---

## Changelog

### 2026-05-21 (latest)
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
