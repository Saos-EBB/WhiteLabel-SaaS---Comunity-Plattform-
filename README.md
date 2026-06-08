# WhiteLabel SaaS — Community Platform

Full-stack community platform with a Hidden Zone, real-time chat, gamification, and a coin-based mini-game system.

- **Frontend** — Next.js 16 (App Router), Tailwind CSS v4, Zustand, socket.io-client → port 3001
- **Backend** — NestJS, TypeORM, PostgreSQL 16 + PostGIS, socket.io → port 3000

---

## Quick Start

```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev -- --port 3001
```

Copy `.env.example` → `.env` in both `backend/` and `.env.local` in `frontend/`.

---

## Feature Overview

### Core Platform

| Feature | Where |
|---|---|
| JWT Auth (access 15min + refresh cookie) | `backend/src/modules/core/auth` |
| Multi-step onboarding wizard | `frontend/app/(onboarding)` |
| Discover grid with PostGIS radius search | `backend/src/modules/core/profile` |
| Real-time chat + contact requests | `backend/src/modules/core/chat` |
| In-app notifications (WebSocket) | `backend/src/modules/core/notifications` |
| Stripe subscriptions + webhooks | `backend/src/modules/core/payment` |
| GDPR data export PDF (Art. 15) | `backend/src/modules/core/gdpr` |
| Moderation + auto-ban + profanity filter | `backend/src/modules/core/moderation` |
| Admin panel (user mgmt, reports, media queue) | `backend/src/modules/core/admin` |
| Owner setup endpoint (one-time bootstrap) | `backend/src/modules/core/setup` |
| System settings (admin-editable KV cache) | `backend/src/modules/core/system-settings` |
| City autocomplete (seeded PostGIS table) | `backend/src/modules/core/cities` |
| AES-256-CBC field encryption for emails | `backend/src/common/crypto` |
| Row-level security (RLS) for sensitive data | `backend/src/common/database` |
| i18n (de, en, es, fr, it, ja, ru, de_easy, leet) | `frontend/lib/i18n` |
| Multi-tenant / white-label config | `frontend/config/public.config.ts` |

---

### Hidden Zone

The Hidden Zone is an Easter-egg underground mode unlocked in-app. It has its own UI theme (brick / neon), background audio, physics effects, and the full Beef Game System.

| Feature | Where |
|---|---|
| Hidden Zone entry gate + theme switcher | `frontend/components/hidden/` |
| Beef challenges (state machine) | `backend/src/modules/hidden/beef` |
| Coin balance + ledger | `backend/src/modules/hidden/coin` |
| Tooth collection + ToothChain crafting | `backend/src/modules/hidden/teeth` |
| Badges (winner / loser / chicken + expiry) | `backend/src/modules/hidden/badge` |

#### Beef State Machine

```
pending_approval → waiting → active → closed
                                    ↘ chickened
```

- Admin approves: `pending_approval → waiting`
- Target accepts: `waiting → active`
- `BeefScheduler` (1 min): closes `active` beefs past `ends_at`
- `BeefScheduler` (5 min): auto-chickens `waiting` beefs older than 24h; exile both parties for 24h

---

### Beef Game System *(feat/beef-game-system)*

Each beef challenge includes a mini-game that both parties play to decide the winner.

#### Games

| Game | Mode | Logic |
|---|---|---|
| Rock Paper Scissors | Best-of-1 | Both submit simultaneously, result immediate |
| TicTacToe | Best-of-3 | Turn-based, winner takes best of 3 rounds |
| Mastermind | Shared code + time-based | Both guess each other's code; time determines winner on tie |
| Reaction | Random delay 0.2–5s | First to tap after stimulus wins |

#### Economy

- **Entry cost** — coins are burned into a pot on beef creation (amount configurable via SystemSettings)
- **Pot split** — winner takes 10 / 30 / 60 split (configurable via SystemSettings)
- **Coin packages** — sardine / thunfisch / hai / moby_dick (hardcoded in `CoinService`)

#### Frontend Components

| Component | Path |
|---|---|
| Game Overlay (wrapper) | `frontend/app/beef/components/GameOverlay.tsx` |
| RPS | `frontend/app/beef/components/games/RockPaperScissors.tsx` |
| TicTacToe | `frontend/app/beef/components/games/TicTacToe.tsx` |
| Mastermind | `frontend/app/beef/components/games/Mastermind.tsx` |
| Reaction | `frontend/app/beef/components/games/Reaction.tsx` |
| "Beef starten" button on public profile | `frontend/app/(public)/profile/[id]/BeefStartButton.tsx` |
| Create beef form (target search, TLDR, game picker) | `frontend/app/beef/create/` |

#### Backend Handlers & Services

| File | Responsibility |
|---|---|
| `beef.controller.ts` | REST endpoints (create, accept, chicken, vote, comment) |
| `beef.service.ts` | State transitions, coin pot logic, badge creation on resolve |
| `beef.scheduler.ts` | Cron: auto-close + auto-chicken |
| `resolution.service.ts` | Coin split calculation on beef resolution |
| `games/rps.handler.ts` | RPS result logic |
| `games/tictactoe.handler.ts` | TicTacToe best-of-3 |
| `games/mastermind.handler.ts` | Mastermind code comparison + time tiebreak |
| `games/reaction.handler.ts` | Reaction time comparison |

---

## Database Migrations

Migrations are plain SQL files in `backend/migrations/`, run in order:

```bash
cd backend && npm run migration:run
```

| # | File | What it does |
|---|---|---|
| 031 | `031_agb_consent_tables.sql` | AGB versions + consent_logs tables |
| 032 | `032_auth_token_columns.sql` | email_verification + password_reset token columns on users |
| 033 | `033_conversations_deleted_at.sql` | deleted_at_a / deleted_at_b on conversations |

---

## Seeds

```bash
cd backend && npx ts-node src/database/seeds/demo-seed.ts
```

Seeded data: 45 demo user profiles, media, conversations, beef challenges, contacts, blocks.

---

## WebSocket Namespaces

| Namespace | Gateway | Events |
|---|---|---|
| `/` | `ChatGateway` | chat, notifications, user.banned |
| `/hidden-beef` | `HiddenBeefGateway` | beef vote, comment, closed |

---

## Docs

- `backend/docs/known-errors.md` — known runtime errors with fixes
- `backend/docs/adr/` — architecture decision records
- `CONTEXT.md` — domain language and data model

---

## Changelog

### 2026-06-08 (6)
- fix: ReactionGame funktioniert jetzt vollständig — 3 Bugs behoben: (1) GO-Signal kommt jetzt erst nachdem beide Komponenten gemounted sind (`game:reaction_ready` Handshake), (2) `initiator_reaction_ms` wurde nie gesetzt (`initiator_placeholder` → `initiator`), (3) Click-Event hatte keine Payload (jetzt `{ beefId }`) + `go_sent_at` wird vor dem GO-Signal in den Game-State geschrieben
- fix: `/hidden-beef` WebSocket authentifiziert jetzt den JWT aus dem Handshake — unauthentifizierte Verbindungen werden getrennt; `userId` kommt vom Token, nie vom Client
- feat: TicTacToe Turn-Timer auf 25s erhöht; Timeout löst jetzt einen zufälligen Zug aus statt Forfeit — 25s In-Memory-Timer pro Zug, BeefScheduler als Restart-Fallback
- feat: RPS zu Rock/Paper/Schere/Eidechse/Spock (5 Optionen) erweitert — korrektes Win-Matrix mit je 2 Gewinnern pro Wahl; 28 Unit Tests für alle 25 Kombinationen
- feat: Mastermind sendet rollenspezifische Board-Payloads — Spieler sehen nur eigene Rateversuche + Pins; Gegner-Board kommt nur als Versuchsanzahl (keine Rows/Feedback über die Leitung); Zuschauer sehen beide Boards; `MAX_GUESSES` Frontend 10→8 (Sync mit Backend)

### 2026-06-08 (5)
- feat: TicTacToe zeigt Runden-Ergebnis-Banner (wer hat gewonnen / Unentschieden) für 2.5s zwischen den Runden bevor das Spielfeld zurückgesetzt wird
- fix: GameOverlay startet den 5s-Countdown jetzt nur einmal (beim Übergang von "waiting" → "in_game"), nicht bei jedem Board-Update
- fix: TicTacToe Timer pausiert während der Rundenauswertung und springt nicht mehr falsch zurück
- refactor: `round_over` + `round_winner` als explizite State-Felder in TicTacToe-Handler; `advanceToNextRound` läuft serverseitig mit 2.5s Delay

### 2026-06-08 (4)
- feat: 5-Minuten-Kommentar-Fenster nach Beef-Ende — `comment_window_until` Spalte (Migration 036), Kommentare bleiben für 5 min nach Spielende offen, dann schließt sich der Bereich automatisch
- feat: Beefers werden nach dem Schließen des WinnerScreens direkt zur Profilseite (Exil) redirected
- refactor: `useCountdown` aus der Beef-Seite extrahiert als eigenen Hook (`lib/hooks/useCountdown.ts`) — wird jetzt in Beef-Seite und WinnerScreen wiederverwendet
- fix: WinnerScreen nutzt jetzt `useCountdown` statt manuellem `setInterval`/`secondsLeft`

### 2026-06-08 (3)
- refactor: Game-Overlay sperrt den Bildschirm nicht mehr — wird jetzt inline auf der Beef-Seite gerendert (kein `fixed inset-0` mehr)
- feat: TicTacToe 15-Sekunden-Timer pro Zug mit Millisekunden-Anzeige und Fortschrittsbalken (wird rot unter 5s)
- feat: TicTacToe zeigt über dem Spielfeld prominent wer dran ist, mit farbiger Hervorhebung wenn du am Zug bist

### 2026-06-08 (2)
- fix: Spiel-Züge werden jetzt via `game:board_update` Socket-Event in Echtzeit verteilt — RPS, TicTacToe und Mastermind zeigen den Spielstand nach jedem Zug live an
- fix: TicTacToe `move.index` → `move.position` (Feld-Name-Mismatch zwischen Frontend und Backend behoben)
- fix: Mastermind `move.code` → `move.guess` + `realtime = true` (Züge waren geblockt)
- fix: RPS `realtime = true` war korrekt — Board-Update fehlte; jetzt enthüllt der Gegner bei beiden Einreichungen
- fix: `getGame`-Endpoint gibt jetzt den aktuellen Spielstand zurück (für Reload-Fälle)
- feat: Blur-Effekt hinter dem Game-Overlay (`backdrop-blur-md`)

### 2026-06-08
- fix: Migration 035 — `game_pending` + `in_game` zum `chk_beef_status` DB-Constraint hinzugefügt (Scheduler konnte Beefs nie in die Game-Phase überführen)
- fix: `GET /hidden/beef/:id` gibt jetzt `game_type`, `game_deadline_at`, `pot_coins` zurück — Game-Overlay konnte nie rendern weil `game_type` null war
- fix: `getMyActive` zeigt jetzt auch Beefs in `game_pending` + `in_game` — Beefs verschwanden nach Timer-Ablauf aus der Liste
- fix: Spiel-Moves (RPS, TicTacToe, Mastermind) korrekt in `{ move: {...} }` gewrappt — alle Game-Aktionen warfen 400-Fehler
- fix: Game-Lifecycle-Events (`waiting`/`in_game`/`finished`) korrekt typisiert und emittiert — Overlay blieb ewig auf "Warten"
- fix: `startGamePhase` emittiert jetzt Socket-Event damit das Overlay sich automatisch öffnet
- fix: Scheduler `winner_id: IsNull()` statt `undefined` — beendete Spiele wurden erneut verarbeitet
- fix: Konflikt-Check bei Beef-Erstellung schließt jetzt auch `game_pending`/`in_game` Beefs ein

### 2026-06-07 (4)
- fix: Online-Status-Punkt im Chat-Header war immer grau — falsches Feldnamen-Format (snake_case statt camelCase) beim Profil-Fetch korrigiert

### 2026-06-07 (3)
- feat: Beef-Suche zeigt nur verknüpfte User — neuer Endpoint `GET /chat/conversations/partners`
- refactor: Suche im Beef-Create-Tab ist jetzt lokal (kein API-Call beim Tippen)

### 2026-06-07 (2)
- fix: Beef-Modal im Chat hat jetzt Schritt 3 (Spiel-Auswahl) — `game_type` wird mitgeschickt
- fix: `target_user_id` → `target_id` in Beef-Create-Page korrigiert
- fix: Migration 034 — `spent_beef_open` + `spent_beef_accept` zu `chk_coin_tx_type` Constraint hinzugefügt
- fix: Beef-Service rollback — wenn `spendCoins` fehlschlägt wird der Beef-Record wieder gelöscht
- feat: 1-Min DEV-Dauer in beiden Beef-Create-Flows (TODO: Delete Before Shipment)
- feat: Duration-Picker in Beef-Create-Tab (`/beef`) ergänzt
- chore: Cities-Tabelle mit 206 Städten befüllt

### 2026-06-07
- Beef Game System komplett implementiert: RPS, TicTacToe (Best-of-3), Mastermind (shared code + time-based), Reaction (random delay 0.2–5s)
- Entry Cost: Coins verbrennen beim Beef erstellen in einen Pot; 10/30/60 Split via SystemSettings
- Game Overlay in Beef-Detailseite eingebunden
- "Beef starten"-Button auf Public Profile mit URL-Param-Prefill
- Create-Tab: Target-Suche, TLDR, Chat-Passage als Conversation-Picker, Game-Type-Picker
- Unit Tests für RPS, TicTacToe, Mastermind Handler und ResolutionService Coin-Split
- Migration 033: deleted_at_a/deleted_at_b auf Conversations
- Migration 032: email_verification + password_reset Token-Spalten auf users
- Migration 031: agb_versions + consent_logs Tabellen
- Demo-Relations Seed: Beefs, Conversations, Contacts, Blocks
- Demo-Users YAML mit 45 Profilen + Media-Seeding
- known-errors.md: useBootstrap fetch error + media_uploads Constraint
