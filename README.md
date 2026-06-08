
# White-Label Community Platform

> A modular, white-label SaaS community platform — full-stack, real-time, GDPR-compliant, and payment-ready.

![Status](https://img.shields.io/badge/status-in_development-orange)
![Backend](https://img.shields.io/badge/backend-NestJS-red)
![Frontend](https://img.shields.io/badge/frontend-Next.js-black)
![Database](https://img.shields.io/badge/database-PostgreSQL_+_PostGIS-blue)

🔗 **[Live Demo (coming soon)](#)** · **[B2B Showcase Page](#)**

---

## About

The final project of my Junior Full-Stack Developer certification — a production-grade, white-label community platform shipped in three modular tiers (Core, Connect, Premium) and re-skinnable per client.

### Motivation

Built to prove that a developer trained primarily in classical software engineering can ship a modern full-stack web platform end-to-end — real-time, payment-ready, GDPR-compliant, and accessible by design.

---

## What's Inside

The platform comes in two configurations sharing the same backbone:

**Light Mode** — the regulated community side
GDPR-compliant infrastructure (AES-256, pseudonymization, Art. 15 export), accessibility by design (WCAG-oriented), real-time chat, Stripe subscriptions, full moderation suite, PostGIS-based discovery, vulnerable user protection.

**Dark Mode** — the engagement & monetization layer
Live public "beef" battle system (15min–48h), coin economy with Stripe coin packages, weighted lottery payouts, hidden zone access (rotating film passwords), highscore leaderboard, exile mechanic with auto-resolution.

### License Tiers

| Tier | Light Mode | Dark Mode |
|---|---|---|
| **Core** | Auth, profile, chat, moderation, Stripe | Beef battles, voting, exile |
| **Connect** | + push, groups, caretakers, orgs | + coin economy, badges, rewards |
| **Premium** | + video chat, matching, ratings | + distribution engine, hidden zone, analytics |

---

## Tech Stack

- **Backend** — NestJS, TypeORM, EventEmitter2
- **Frontend** — Next.js 16, React, Tailwind
- **Database** — PostgreSQL 16 + PostGIS 3.4
- **Real-time** — Socket.io WebSockets
- **Payments** — Stripe (subscriptions + webhooks)
- **Security** — AES-256-CBC, bcrypt, JWT + HttpOnly refresh tokens, SHA-256+salt email hashing
- **Deployment** — Railway-ready, Docker

---

## Repository Structure

Monorepo combining frontend and backend in subfolders, with the full commit history of both preserved.

```
.
├── frontend/   # Next.js application
└── backend/    # NestJS API + WebSocket gateway
```

For setup, environment variables, and architecture details, see:
- [`frontend/README.md`](./frontend/README.md)
- [`backend/README.md`](./backend/README.md)

---

## Status

Active development. Core feature set is functional; currently in final integration and QA phase.

---

## About the Developer

Built by **Kevin Schaberl** (SaoS) — Junior Full-Stack Developer.

Background in classical software development, around six months into web full-stack with TypeScript, NestJS, and Next.js.

📫 Contact via the [B2B Showcase Page](#) or GitHub.

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
