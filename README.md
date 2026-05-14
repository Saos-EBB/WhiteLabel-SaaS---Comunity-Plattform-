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

| Route | Description |
|---|---|
| `/dashboard` | Home screen after login. |
| `/discover` | Browse published profiles. Filter by city or interest. Connect button sends a contact request. |
| `/requests` | Incoming and outgoing contact requests. Accept / decline. |
| `/chat` | Conversation list. |
| `/chat/[id]` | Real-time conversation via WebSocket. |
| `/notifications` | Full notification center with type filters. |
| `/profile` | View and edit own profile, manage interests, publish. Clickable avatar uploads a profile photo (JPEG/PNG/WebP, max 5 MB). Photo is displayed immediately after upload and restored on page refresh. |
| `/settings` | Accessibility, notifications, privacy, account, DSGVO. |
| `/onboarding` | Profile setup wizard (required before accessing the app). |

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

## Key notes

- `sender_id` on messages is the account UUID. Always use `user.user_id` (not `user.id`) for `isOwn` comparisons.
- Optimistic message send: message appears immediately with a pending indicator, replaced by the confirmed message on `new_message`.

---

## Changelog

### 2026-05-14 (latest)
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
