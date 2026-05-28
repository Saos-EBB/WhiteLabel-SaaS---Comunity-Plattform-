# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## Commands

```bash
npm run dev      # dev server on port 3001
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

No test runner is configured. Backend runs on port 3000, this app on port 3001.

---

## Architecture

Next.js 16 App Router. All routes live under `app/`:

| Route group | Path | Purpose |
|---|---|---|
| `(app)` | `/dashboard`, `/chat`, `/discover`, `/profile`, `/notifications`, `/settings`, `/requests`, `/admin` | Authenticated pages — wrapped in `AuthProvider` + `TopNav`/`BottomNav` |
| `(auth)` | `/login`, `/register`, `/verify`, `/consent`, `/setup` | Unauthenticated auth flows |
| `(onboarding)` | — | Onboarding wizard |
| `(public)` | `/impressum`, `/datenschutz`, `/agb`, `/b2b` | Public static pages |
| `beef/` | `/beef`, `/beef/[id]` | Hidden Zone beef challenge pages |

### API layer — `lib/api.ts`

Single `fetchApi<T>(path, options)` wrapper. Reads `accessToken` from Zustand, injects `Authorization` header, retries once on 401 via `POST /auth/refresh`. All API calls go through this — never use raw `fetch` for backend calls.

Base URL: `NEXT_PUBLIC_API_URL` env var, falls back to `http://localhost:3000/api/v1`.

### WebSocket — `lib/socket.ts`

Module-level singleton (not React context). Two sockets:
- `connect()` / `disconnect()` — main socket.io connection to `http://localhost:3000`
- `connectHiddenBeef()` / `disconnectHiddenBeef()` — `/hidden-beef` namespace

Auth token passed via `auth: { token }` in the handshake. **The backend URL is hardcoded** — not driven by an env var.

### State — `lib/store/`

Zustand stores, all with `persist` middleware where noted:

| Store | Persisted | Contents |
|---|---|---|
| `authStore` | yes (`xxx-auth`) | `accessToken`, `user`, `isBanned`. Role decoded client-side from JWT payload. |
| `themeStore` | yes (`xxx-theme`) | `theme: 'dark' \| 'light'` |
| `hiddenStore` | yes | `isHidden`, `theme: 'brick' \| 'neon'`, `isUnlocked` |
| `conversationStore` | no | active conversation + messages |
| `notificationStore` | no | notifications list |
| `languageStore` | yes | selected language code |
| `accessibilityStore` | yes | `fontSizeClass`, `highContrast` |
| `toastStore` | no | toast queue |

### i18n — `lib/i18n/`

Translation files: `de`, `en`, `es`, `fr`, `it`, `ja`, `ru`, `de_easy` (plain-language German), `leet`. Loaded via `lib/i18n/index.ts`. The app default language is German (`lang="de"` in root layout).

### Hidden Zone

The Hidden Zone is an Easter-egg underground mode gated by `hiddenStore.isHidden`.

- **`HiddenInitializer`** (in root layout) — watches `isHidden` + `theme` and toggles `underground-brick` / `underground-neon` CSS classes on `<html>`. Saves/restores the normal theme via `html.dataset.savedTheme`. Locks the zone on logout.
- **`HiddenEntryOverlay`** (in `(app)` layout) — entry gate UI
- **`lib/hiddenAudio.ts`** — background audio controls
- **`lib/physics/`** — physics effects used in the zone
- **`app/beef/`** — beef challenge pages (route accessible when unlocked)

### Theme

FOUC prevention: root `layout.tsx` injects an inline `<script>` that reads `localStorage['xxx-theme']` and adds `dark` or `light` to `<html>` before React hydrates. `ThemeInitializer` component syncs the Zustand store with the DOM after mount.

### Image proxying

`next.config.ts` rewrites `/uploads/:path*` → `http://localhost:3000/uploads/:path*`. Always use `/uploads/...` paths for profile photos — never hardcode the backend host in image `src`.

---

## Environment

Only one variable in `.env.example`:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Two additional vars used in `(app)/layout.tsx` (set them for production):

```
NEXT_PUBLIC_COPYRIGHT_YEAR=2026
NEXT_PUBLIC_BRAND_NAME=XXX
```

The WebSocket URL (`http://localhost:3000`) is hardcoded in `lib/socket.ts` and the uploads proxy in `next.config.ts` — update both when deploying.

---

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — one `CONTEXT.md` + `docs/adr/` at the root. See `docs/agents/domain.md`.
