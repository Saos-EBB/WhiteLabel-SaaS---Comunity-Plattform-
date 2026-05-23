# XXX — Backend API

NestJS REST API + WebSocket gateway for the XXX platform.

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
| `CommonModule` | `src/common` | `PremiumGuard`, `@RequiresPremium()`, `HttpExceptionFilter`, RLS helpers |

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
- PostGIS radius search on `profiles.location`
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
- `system_settings` table — admin-editable key/value pairs
- `SystemSettingsService.getNumber(key, fallback)` with 60 s in-memory cache
- Admin endpoints: `GET /admin/settings`, `PUT /admin/settings/:key`

### Multi-tenant / Licensing
- `role` column on `users`: `user | admin | org`
- `managed_accounts` table present; `org` role reserved for licensed operators
- `caretaker_access` RLS policy placeholder on `profile_sensitive_data`

---

## API Reference

All routes are prefixed `/api/v1`. Protected routes require `Authorization: Bearer <accessToken>`.

### Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register. Creates profile, sends verification email. |
| POST | `/auth/login` | — | Login. Returns `{ accessToken, needsConsent }`. Sets `refreshToken` HttpOnly cookie. Reactivates soft-deleted accounts within 30 days. |
| POST | `/auth/refresh` | — (cookie) | Rotate refresh token. Returns `{ accessToken }` + new cookie. |
| POST | `/auth/logout` | — (cookie) | Revoke refresh token, clear cookie. |
| GET | `/auth/me` | JWT | Returns current JWT payload. |
| GET | `/auth/verify?token=` | — | Verify email address. |
| POST | `/auth/forgot-password` | — | Send password reset email. |
| POST | `/auth/reset-password` | — | Reset password with token (valid 1 hour). |
| GET | `/auth/agb-versions` | — | List all AGB/privacy policy versions. |
| POST | `/auth/consent` | JWT | Bulk upsert consent logs. |
| DELETE | `/auth/account` | JWT | Soft-delete own account (Art. 17). |

### Media — `/media`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/media/upload/profile-photo` | JWT | Upload profile photo (JPEG/PNG/WebP, max 5 MB). Resizes to 800×800, converts to WebP. Creates `admin_ticket` for review. |

### Profile — `/profile`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/profile/interests` | — | List all interests. |
| GET | `/profile/me` | JWT | Own profile. Includes `photo_url`, `audio_url`, all `show_*` flags, `subscription`, `is_banned`. |
| PUT | `/profile/me` | JWT | Update profile. Accepts all profile fields + visibility flags. |
| PATCH | `/profile/me/publish` | JWT | Publish profile (requires onboarding complete). |
| GET | `/profile/me/interests` | JWT | Own selected interests. |
| POST | `/profile/me/interests/:id` | JWT | Add interest. |
| DELETE | `/profile/me/interests/:id` | JWT | Remove interest. |
| GET | `/profile/search` | JWT | Search published profiles. PostGIS radius + filters. Masked by `show_*` flags. |
| POST | `/profile/me/consent/sensitive-data` | JWT | Record sensitive-data consent. |
| POST | `/profile/me/sensitive-data` | JWT | Submit sensitive data (AES-256-CBC encrypted). |
| GET | `/profile/me/blocks` | JWT | List blocked users. |
| POST | `/profile/me/block/:userId` | JWT | Block a user. |
| DELETE | `/profile/me/block/:userId` | JWT | Unblock a user. |
| GET | `/profile/user/:userId` | JWT | Resolve nickname + photo by account UUID. |
| GET | `/profile/:nickname` | — | Public profile. Masked by `show_*` flags. |

### Chat — `/chat`

All routes require JWT.

| Method | Path | Description |
|---|---|---|
| POST | `/chat/requests` | Send contact request. |
| GET | `/chat/requests/incoming` | Incoming pending requests. |
| GET | `/chat/requests/outgoing` | Outgoing pending requests. |
| PATCH | `/chat/requests/:id/accept` | Accept request. Creates (or restores) conversation. |
| PATCH | `/chat/requests/:id/decline` | Decline request. |
| GET | `/chat/conversations` | List conversations with partner online status. |
| GET | `/chat/conversations/:id` | Single conversation. Includes `is_blocked`, `blocked_by`. |
| GET | `/chat/conversations/:id/messages` | Messages. |
| POST | `/chat/conversations/:id/messages` | Send message. |
| DELETE | `/chat/messages/:id` | Delete own message. |
| DELETE | `/chat/connections/:userId` | Disconnect — purges conversation for both sides. |

### Notifications — `/notifications`

All routes require JWT.

| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | All notifications. |
| PATCH | `/notifications/read-all` | Mark all read. |
| PATCH | `/notifications/:id/read` | Mark one read. |
| GET | `/notifications/settings` | Notification settings. |
| PUT | `/notifications/settings` | Update settings. |

### Moderation — `/moderation`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/moderation/wordlist` | — | Active profanity word list. |
| POST | `/moderation/reports` | JWT | Submit report. Auto-bans target at ≥ 10 unique reporters. |
| PATCH | `/moderation/admin/media/:id/approve` | JWT (admin) | Approve photo. |
| PATCH | `/moderation/admin/media/:id/reject` | JWT (admin) | Reject photo. Nulls `profile.photo_id`. |

### Admin — `/admin`

All routes require JWT with `role: admin`.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/users` | Paginated user list. Filters: `role`, `is_banned`, `search`. |
| PATCH | `/admin/users/:id/ban` | Ban user. Body: `{ duration, reason, report_id? }`. |
| PATCH | `/admin/users/:id/unban` | Lift ban. |
| PATCH | `/admin/users/:id/role` | Change role. |
| PATCH | `/admin/users/:id/vulnerable-flag` | Set/unset vulnerable flag. |
| GET | `/admin/users/:id/export` | DSGVO data export for a user. |
| GET | `/admin/reports` | Paginated reports. |
| PATCH | `/admin/reports/:id` | Update report status/note. |
| GET | `/admin/strikes` | Paginated strikes. |
| POST | `/admin/strikes` | Create strike. Auto-bans for `temp`/`permanent`. |
| GET | `/admin/media/pending` | Pending media moderation queue. |
| PATCH | `/admin/media/:id/approve` | Approve photo. |
| PATCH | `/admin/media/:id/reject` | Reject photo. |
| GET | `/admin/profanity` | Custom profanity words. |
| POST | `/admin/profanity` | Add word (persists to DB + runtime). |
| DELETE | `/admin/profanity/:word` | Remove word. |
| GET | `/admin/settings` | All system settings. |
| PUT | `/admin/settings/:key` | Update a system setting. |

### Payment — `/payment`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/payment/subscriptions` | JWT | Active subscription. |
| POST | `/payment/subscriptions` | JWT | Create Stripe Embedded Checkout session. Returns `{ clientSecret }`. |
| DELETE | `/payment/subscriptions/:id` | JWT | Cancel subscription. |
| GET | `/payment/logs` | JWT + Premium | Payment history. |
| POST | `/payment/webhook` | — (Stripe sig) | Stripe webhook receiver. |

### GDPR — `/gdpr`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/gdpr/export` | JWT | Stream PDF with 14 data sections. Rate-limited to once per 30 days. |

---

## WebSocket Events

Gateway runs on the same port as HTTP. Auth via `auth.token` in socket handshake.

| Direction | Event | Payload | Description |
|---|---|---|---|
| Client → Server | `join_conversation` | `conversationId` | Subscribe to conversation room. |
| Client → Server | `send_message` | `{ conversationId, content, type }` | Send message. |
| Client → Server | `typing` | `conversationId` | Broadcast typing indicator. |
| Client → Server | `read_messages` | `conversationId` | Mark messages read. |
| Server → Client | `new_message` | `Message` | New message in a conversation. |
| Server → Client | `user_typing` | `{ userId, conversationId }` | Typing indicator. |
| Server → Client | `messages_read` | `{ conversationId, userId }` | Read receipt. |
| Server → Client | `notification` | `Notification` | Real-time in-app notification. |
| Server → Client | `contact_request` | `ContactRequest` | Incoming contact request. |
| Server → Client | `user.banned` | `{}` | Pushed to banned user's personal room. |
| Server → Client | `user.unbanned` | `{}` | Pushed when ban is lifted. |

---

## Environment

Copy `.env.example` to `.env` and fill in all values.

| Variable | Description |
|---|---|
| `PORT` | HTTP server port (default `3000`) |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default `5432`) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret for signing JWTs |
| `APP_ENCRYPTION_KEY` | 32-byte hex key for AES-256-CBC field encryption |
| `EMAIL_SALT` | Salt for email search hash (SHA-256) |
| `APP_URL` | Base URL for email verification links |
| `CORS_ORIGIN` | Allowed CORS origin (e.g. `http://localhost:3001`) |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `STRIPE_SECRET_KEY` | Stripe secret API key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_RETURN_URL` | URL Stripe redirects to after Embedded Checkout (e.g. `http://localhost:3001/settings`) |

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
