

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
- **Soft deletes**: users have `deleted_at`, excluded from all queries
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
| DELETE | `/auth/dev/delete-user` | JWT (admin) | **Dev only — remove before production.** Hard-delete user by email. |

---

### Media — `/media`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/media/upload/profile-photo` | JWT | Upload a profile photo. Accepts `multipart/form-data` with field `file` (JPEG, PNG, WebP, max 5 MB). Resizes to max 800×800 and converts to WebP via sharp. Saves to `uploads/profiles/`, stores a `MediaUpload` record, updates `profile.photo_id`. Returns `{ file_url, id }`. |

---

### Profile — `/profile`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/profile/interests` | — | List all available interests. |
| GET | `/profile/me` | JWT | Get own profile. Includes `photo_url` (full URL from `media_uploads`, or `null`). |
| PUT | `/profile/me` | JWT | Update own profile (nickname, bio, city, settings). Triggers onboarding check. |
| PATCH | `/profile/me/publish` | JWT | Publish profile. Requires onboarding completed (nickname + birthdate + city + ≥1 interest + verified email). |
| GET | `/profile/me/interests` | JWT | Get own selected interests. |
| POST | `/profile/me/interests/:interestId` | JWT | Add an interest. Triggers onboarding check. |
| DELETE | `/profile/me/interests/:interestId` | JWT | Remove an interest. |
| GET | `/profile/search?city=&interests=` | JWT | Search published profiles. Filters by city (partial, case-insensitive) and/or interest IDs. Excludes banned, deleted, self, and blocked users (both directions). |
| POST | `/profile/me/consent/sensitive-data` | JWT | Record AGB consent for sensitive data collection. Returns consent log ID. IP is SHA-256 hashed. |
| POST | `/profile/me/sensitive-data` | JWT | Submit sensitive data (disability type + visibility). Requires valid consent ID. Disability type stored AES-256-CBC encrypted. |
| POST | `/profile/me/block/:userId` | JWT | Block a user. |
| DELETE | `/profile/me/block/:userId` | JWT | Unblock a user. |
| GET | `/profile/user/:userId` | JWT | Get nickname and photo_id for any account UUID. Used by frontend to resolve partner names in chat. |
| GET | `/profile/:nickname` | — | Public profile by nickname (published profiles only). |

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
| GET | `/chat/conversations` | List own conversations. |
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

All moderation routes require JWT.

| Method | Path | Description |
|---|---|---|
| POST | `/moderation/reports` | Submit a report against a user or content. |
| GET | `/moderation/reports` | Get own submitted reports. |
| GET | `/moderation/reports/:id` | Get a single report. |
| GET | `/moderation/strikes` | Get own strikes. |

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

| Method | Path | Auth | Description |
|---|---|---|---|
| PATCH | `/admin/users/:id/vulnerable-flag` | JWT (role: admin) | Set or unset the `vulnerable_flag` on a user. |

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

### 2026-05-18 (latest)
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
