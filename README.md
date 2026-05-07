# XXX — Frontend

Next.js 15 app (App Router) for the XXX platform. Connects to the XXX NestJS backend at `http://localhost:3000`.

---

## Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| State | Zustand (auth store, JWT) |
| Real-time | Socket.io client |
| Icons | Lucide React |

---

## Setup

```bash
npm install
npm run dev
```

App runs on `http://localhost:3001` (or the next available port).

The backend must be running on `http://localhost:3000`.

---

## Pages

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
| `/discover` | Browse published profiles. Filter by city (text) or interest (dropdown). Connect button sends a contact request. |
| `/requests` | Incoming and outgoing contact requests. Accept/decline. |
| `/chat` | Conversation list. |
| `/chat/[id]` | Conversation detail. Real-time messaging via WebSocket. |

---

## Key features

### Auth
- JWT access token stored in Zustand memory (not persisted to localStorage).
- `accessToken` persisted to localStorage via Zustand `persist` middleware.
- `AuthProvider` (`components/AuthProvider.tsx`) fetches `/profile/me` once on mount and populates `user` in the store. Uses a `hasFetched` ref to prevent double-calls in React StrictMode.
- Automatic token refresh on 401 — `fetchApi` retries the original request with a fresh token before giving up.

### Chat
- Message history loaded on mount via `GET /chat/conversations/:id/messages`.
- Real-time via Socket.io (`lib/socket.ts`): singleton connection, JWT passed as `auth.token`.
- **Events emitted:** `join_conversation`, `send_message`, `typing` (debounced, max 1/2s), `read_messages`.
- **Events received:** `new_message` (appended or replaces optimistic), `user_typing` (typing indicator shown for 3s then hidden).
- Optimistic message send: message appears immediately with a pending indicator, replaced by the confirmed message from the `new_message` event.
- Typing indicator: bouncing-dots bubble, hidden immediately when a message arrives.
- Own messages right-aligned (dark bubble), incoming left-aligned (green bubble).
- Long-press or right-click own message to delete.

### Discover
- Calls `GET /profile/search` on mount.
- Profile cards show nickname, age (calculated from birthdate), and city.
- "Verbinden" button posts to `POST /chat/requests` with the profile's `user_id` as `receiver_id`.

---

## Auth store

`lib/store/authStore.ts` — Zustand store.

| Field | Type | Persisted |
|---|---|---|
| `accessToken` | `string \| null` | Yes (localStorage) |
| `user` | `User \| null` | No (memory only) |

`User` shape (from `/profile/me`): `id` (profile UUID), `user_id` (account UUID), `email`, plus any other fields returned by the API.

> `sender_id` on messages is the account UUID. Always use `user.user_id` (not `user.id`) for `isOwn` comparisons.

---

## Socket

`lib/socket.ts` — singleton Socket.io client.

```ts
connect()     // creates socket with auth token, returns it (no-op if already connected)
disconnect()  // tears down the socket
getSocket()   // returns the current Socket | null
```

The socket is connected on conversation page mount and disconnected on unmount.

---

## Changelog

### 2026-05-07
- Chat page: WebSocket support — real-time messages, typing indicator, read receipts, optimistic sends
- Chat page: message alignment fixed (own right, incoming left); `isOwn` now uses `user.user_id` (account UUID) not `user.id` (profile UUID)
- Chat page: guard against rendering messages before `currentUserId` is hydrated (prevents all-left-aligned flash on reload)
- `AuthProvider`: fixed double-fetch — now runs once on mount with `hasFetched` ref (React StrictMode-safe)
- `lib/socket.ts`: new singleton Socket.io client module
- `lib/store/authStore.ts`: added `user_id?: string` to `User` interface
- Discover page: contact request now sends `user_id` (account UUID) as `receiver_id`, not profile `id`

### 2026-05-04 (`c084690`)
- Initial setup: Next.js, Tailwind v4, navigation, auth flow (login/register/verify), Zustand auth store, dashboard, discover page, chat list, requests page
