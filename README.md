

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

| Variable | Description |
|---|---|
| `DATABASE_HOST` | Postgres host |
| `DATABASE_PORT` | Postgres port |
| `DATABASE_NAME` | Database name |
| `DATABASE_USER` | Database user |
| `DATABASE_PASSWORD` | Database password |
| `JWT_SECRET` | Secret for signing JWTs |
| `APP_ENCRYPTION_KEY` | 32-byte hex key for AES-256-CBC (email, sensitive data) |
| `EMAIL_SALT` | Salt for email search hash (SHA-256) |
| `APP_URL` | Base URL used in verification links |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USER` / `MAIL_PASS` | SMTP credentials |
| `STRIPE_SECRET_KEY` | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_SUCCESS_URL` | Redirect URL after successful checkout |
| `STRIPE_CANCEL_URL` | Redirect URL after cancelled checkout |

---

## Security

- **JWT**: access token 15 min, refresh token 30 days (single-use rotation, stored as SHA-256 hash)
- **Passwords**: bcrypt cost 12
- **Email**: stored AES-256-CBC encrypted, looked up via SHA-256 hash
- **Sensitive data**: disability type stored AES-256-CBC encrypted
- **Rate limiting**: global 10 req/60s; login 5/60s; forgot-password & reset-password 3/60s
- **Soft deletes**: users have `deleted_at`, excluded from all queries
- **Global exception filter**: all errors are caught, logged via NestJS `Logger` (timestamp, method, URL, status, userId), and returned in a consistent `{ statusCode, error, message }` shape. Request body, tokens, passwords, emails, and IPs are never logged.

---

## API Reference

All protected routes require `Authorization: Bearer <accessToken>`.

---

### Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register with email + password. Creates profile, sends verification email. |
| POST | `/auth/login` | — | Login. Returns `accessToken` (15 min) + `refreshToken` (30 days). Blocked if `is_banned`. |
| POST | `/auth/refresh` | — | Rotate refresh token. Old token is revoked. |
| POST | `/auth/logout` | — | Revoke refresh token. |
| GET | `/auth/me` | JWT | Returns current JWT payload (`sub`, `role`). |
| GET | `/auth/verify?token=` | — | Verify email address via token from email link. |
| POST | `/auth/forgot-password` | — | Send password reset email. Always returns same message (no email enumeration). |
| POST | `/auth/reset-password` | — | Reset password with token. Token valid 1 hour. |
| DELETE | `/auth/dev/delete-user` | — | **Dev only — remove before production.** Hard-delete user by email. |

---

### Profile — `/profile`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/profile/interests` | — | List all available interests. |
| GET | `/profile/me` | JWT | Get own profile. |
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

## Changelog

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
