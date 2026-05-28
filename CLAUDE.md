# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## Commands

```bash
npm run start:dev        # dev server (watch mode), port 3000
npm run build            # compile to dist/
npm run start:prod       # run compiled build
npm run lint             # ESLint --fix across src/ and test/
npm run test             # Jest unit tests (rootDir: src, matches *.spec.ts)
npm run test:watch       # Jest in watch mode
npm run test:e2e         # Jest e2e (test/jest-e2e.json)
npm run seed:cities      # seed cities table from CSV
npm run migration:run    # run TypeORM migrations via data-source.ts
npm run backfill:locations  # backfill PostGIS location column on profiles
```

Migrations are plain SQL files in `migrations/`, numbered sequentially (e.g. `022_hidden_beef_feature.sql`). They are **not** auto-run on startup — run them manually against PostgreSQL in order. `migration:run` uses TypeORM's data source at `src/database/data-source.ts`.

All routes are prefixed `/api/v1` (set globally in `main.ts`). Frontend runs on port 3001.

---

## Architecture

```
src/
├── main.ts                    # bootstrap: CORS, helmet, cookie-parser, ValidationPipe, static /uploads
├── app.module.ts              # root module
├── common/
│   ├── common.module.ts       # exports PremiumGuard + @RequiresPremium() globally
│   ├── crypto/crypto.helper.ts  # AES-256-CBC encrypt/decrypt, SHA-256 email hash
│   ├── guards/                # JwtGuard, RolesGuard, PremiumGuard, OwnerGuard, OptionalJwtGuard
│   ├── decorators/            # @RequiresPremium(), @Roles()
│   ├── filters/               # HttpExceptionFilter (global)
│   ├── middleware/            # RlsContextMiddleware — decodes JWT → req.rlsUserId
│   ├── database/rls.helper.ts # withRls(dataSource, userId, fn) — SET LOCAL app.current_user_id
│   └── mail/                  # MailService (Resend)
├── modules/
│   ├── core/                  # auth, profile, chat, notifications, moderation, admin,
│   │                          # gdpr, media, payment, system-settings, setup, support, cities
│   └── hidden/                # beef, coin, teeth, badge  (Hidden Zone features)
└── database/
    ├── data-source.ts         # TypeORM DataSource used by migration:run
    └── seeds/                 # seed-cities.ts, backfill-profile-locations.ts
```

### Module conventions

Each module lives in `src/modules/<zone>/<name>/` with its own controller, service, entities, and DTOs. Modules declare their own `JwtModule.registerAsync` when they need JWT — there's no shared auth module export. `CommonModule` is global and provides `PremiumGuard` + `@RequiresPremium()`.

### Cross-module real-time events

Modules communicate via `@nestjs/event-emitter`, not direct service injection. Pattern:

1. Service emits: `this.eventEmitter.emit('user.banned', { userId })`
2. `ChatGateway` listens with `@OnEvent('user.banned')` and pushes to the user's personal socket room `user:{userId}`

There are two WebSocket gateways:
- `ChatGateway` — default namespace `/`, owns all core chat/notification real-time events. Never inject this into other services.
- `HiddenBeefGateway` — namespace `/hidden-beef`, handles beef vote/comment/closed events. Clients join `beef:{id}` rooms.

### Email storage

Emails are **never stored in plaintext**. Storage: AES-256-CBC encrypted blob. Lookups: SHA-256 hash (`EMAIL_SALT`). Both helpers live in `src/common/crypto/crypto.helper.ts` (`encryptField`, `decryptField`).

### RLS

`withRls(dataSource, userId, fn)` wraps a callback in a transaction, issues `SET LOCAL app.current_user_id = $1`, then runs the callback. Used for `profile_sensitive_data` which has RLS policies. `RlsContextMiddleware` decodes the Bearer token and sets `req.rlsUserId` for downstream use — it does **not** verify the token.

### Route ordering

NestJS matches routes top-to-bottom. Always declare named routes (e.g. `@Get('pending')`, `@Get('exile/status')`) **before** parametric routes (`@Get(':id')`) in the same controller, or they'll never be reached.

### Stripe webhooks

`NestFactory.create` is called with `{ rawBody: true }` — required for Stripe signature verification. The webhook endpoint must receive the raw body, not parsed JSON.

### Hidden Zone

`src/modules/hidden/` contains beef/coin/teeth/badge. These share the same JWT auth as core modules. Beef drives coin awards/spends via `CoinService` injection. Badge records are created internally by `BeefService` when a beef resolves — `BadgeModule` has no public write endpoints.

**Beef state machine:** `pending_approval → waiting → active → closed | chickened`
- Admin approval moves `pending_approval → waiting`; target accepting moves `waiting → active`
- `BeefScheduler` (every 1 min) closes `active` beefs where `ends_at < now`
- `BeefScheduler` (every 5 min) auto-chickens `waiting` beefs older than 24h: increments `chicken_count` on target, sets `exile_until = now+24h` on both parties
- An exiled user's `exile_until` is auto-cleared on their next beef creation attempt if the timestamp has passed

**Teeth:** winners collect individual `Tooth` records; 15 unconverted teeth can be transformed into a `ToothChain`.

**Coin packages** are hardcoded constants in `CoinService` (sardine/thunfisch/hai/moby_dick) — not in system settings.

### User roles

`users.role` enum: `user` | `admin` | `org` | `owner`. The `owner` role is the platform owner (set via `/api/v1/setup`).

### Rate limiting

Global throttler: 100 requests per 60 seconds per IP (`ThrottlerGuard` applied via `APP_GUARD`).

### Tests

No `.spec.ts` files exist yet. Jest is configured (`rootDir: src`, `testRegex: *.spec.ts`) and `@nestjs/testing` is installed — write tests in the same directory as the file under test.

### System settings

`SystemSettingsService.getNumber(key, fallback)` / `getString(key, fallback)` — 60 s in-memory cache, invalidated on write. Use these for any owner-configurable value (subscription prices, thresholds) instead of hardcoding.

---

## Environment

Copy `.env.example` to `.env`. `CORS_ORIGIN` is required — the app throws immediately on startup if it's missing.

```
# PostgreSQL
DB_NAME=
DB_USER=
DB_PASSWORD=

# pgAdmin (Docker)
PGADMIN_EMAIL=
PGADMIN_PASSWORD=

# JWT + encryption
JWT_SECRET=                  # any long random string
EMAIL_SALT=                  # random salt for SHA-256 email hash
APP_ENCRYPTION_KEY=          # 32 bytes = 64 hex chars, for AES-256-CBC

# App URLs
APP_URL=http://localhost:3001          # used in email verification links
BACKEND_URL=http://localhost:3000     # used in media file_url storage
CORS_ORIGIN=http://localhost:3001     # required — app throws on startup if missing

# Email
RESEND_API_KEY=

# Stripe
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SUCCESS_URL=http://localhost:3001/payment/success
STRIPE_CANCEL_URL=http://localhost:3001/payment/cancel
```
