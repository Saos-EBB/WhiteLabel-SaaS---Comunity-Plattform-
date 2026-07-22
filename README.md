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
Live public "beef" battle system (15min–48h), coin economy with Stripe coin packages, weighted lottery payouts, hidden zone access (rotating film passwords), highscore leaderboard, exile mechanic with auto-resolution. Hidden Zone also exposes a live CSS theme editor (Colors panel) directly in the sidebar.

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

For environment variables and architecture details, see:
- [`frontend/README.md`](./frontend/README.md)
- [`backend/README.md`](./backend/README.md)

---

## Running Locally

```bash
cp .env.example .env               # DB/pgAdmin/JWT values used by docker-compose.yml
cp backend/.env.example backend/.env       # fill in Stripe/Resend/encryption/CORS values
cp frontend/.env.example frontend/.env

docker compose up --build
```

Starts four containers: Postgres+PostGIS (`XXX_db`, port 5432), pgAdmin (port 5050), the NestJS API (`XXX_backend`, port 3000) and the Next.js app (`XXX_frontend`, port 3001) — both app containers run in dev mode with hot-reload via bind mounts, so source changes on the host are picked up immediately.

`.env` (root) and `backend/.env` both define `DB_NAME`/`DB_USER`/`DB_PASSWORD`/`JWT_SECRET` — keep them in sync, the root copy is what `docker-compose.yml` substitutes into the Postgres/pgAdmin/backend service definitions.

The database starts empty. Load `backend/schema_v4.sql` for a quick baseline, or run the `backend/migrations/*.sql` files in order for the fully up-to-date schema (`schema_v4.sql` predates the newest migrations).

---

## Status

Active development. Core feature set is functional; currently in final integration and QA phase.

---

## Attribution

- **GeoNames Geographical Database** von [GeoNames](https://www.geonames.org/) ist lizenziert unter [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
  - Quelle: https://www.geonames.org/
  - Änderungen: auf Europa erweitert, Spalten angepasst
  - Datei im Projekt: [`backend/src/database/seeds/cities.csv`](backend/src/database/seeds/cities.csv)

---

## Changelog

### 2026-07-22
- Theme: Zwei neue Farbschemata "lavender" und "darkPink" im Color Panel (Dev-Tool) verfügbar — übernommen aus dem b2b-cv/Whitelabel-Showcase (helles Purple-Theme + dunkles Pink-Theme)
- Docker: Seed-Reihenfolge im Entrypoint ergänzt — `seed-cities` läuft jetzt vor `backfill-profile-locations`, da Letzteres Lat/Lng aus der Cities-Tabelle nachschlägt

### 2026-06-14
- Fix: Chat-Kopfzeile in der Web-Ansicht klebt jetzt ganz oben (war vorher 64px zu tief, weil die mobile TopNav auf Desktop versteckt ist)
- Fix: Interessen-Namen mit Umlauten (ü, ö, ä, ß) waren durch falsche Encoding beim Seed korrumpiert — Migration 041 korrigiert alle 11 betroffenen Einträge direkt in der DB

### 2026-06-13
- Hidden Zone: Master-Passwort auf "YourBrand" geändert
- Docker: `DEMO_MEDIA_PATH=/app` im nestjs-Service eingetragen — Demo-Medien (Profilbilder, Audio) werden vom Seed-Script gefunden

### 2026-06-10
- Discover: Radius-Filter auf max. 5000 km erhöht (vorher 500 km) — Frontend-Slider und Backend-Validierung
- Docs: Alle 40 Migrations-Dateien haben jetzt einen Kommentar-Header der kurz erklärt was die Migration macht
- Migration 040: fehlende Interessen (~80 neue Einträge) nachträglich in die DB eingefügt — kompletter Katalog jetzt verfügbar
- Fix: PostGIS-Location-Filter im Matching-Deck repariert — Profile ohne gesetzten Standort wurden fälschlicherweise komplett ausgeblendet (45 von 49 Profilen betroffen); Deck zeigt jetzt alle published Profile, Distanz wird nur angezeigt wenn vorhanden
- Fix: Reset-Button löscht jetzt alle Swipes (Likes + Skips), nicht nur Skips; Endpoint umbenannt zu `DELETE /discover/swipes`
- Backfill: `npm run backfill:locations` ausgeführt — 39/45 Profile mit PostGIS-Koordinaten befüllt; Discover-Radius-Filter funktioniert jetzt korrekt
- Matching: "Ablehnungen zurücksetzen"-Button im leeren Deck-State (löscht eigene Skips, nicht Likes) + Backend-Endpoint `DELETE /discover/swipes/skips`
- Bug fix: Request-Notification-Badge zeigte falsche Zahl — ID-Mismatch zwischen Socket-Event und Page behoben, Notifications werden beim Öffnen der Anfragen-Seite korrekt geleert
- Öffentliche Profilseite zeigt jetzt 💚/🚩 Flags bei Interessen (Green-/Red-Flag-System)
- Migration 039: setzt alle User mit abgeschlossenem Onboarding auf `is_published = true`

### 2026-06-09
- Custom-Theme wird jetzt sofort beim Seitenstart wiederhergestellt, nicht erst wenn das Color-Panel geöffnet wird
- Selbst gespeicherte Custom-Themes im Color-Panel bleiben nach F5 und Re-Login aktiv (aktives Theme wird in localStorage gemerkt und beim Start wiederhergestellt)
- Beim Löschen oder Zurücksetzen wird das aktive Theme sauber aufgeräumt
- Hidden Zone Theme und "einmal besucht"-Flag werden jetzt dauerhaft in localStorage gespeichert (überleben F5 und Re-Login)
- Colors-Tab in der Sidebar bleibt sichtbar, sobald man die Hidden Zone mindestens einmal betreten hat

---

## About the Developer

Built by **Kevin Schaberl** (SaoS) — Junior Full-Stack Developer.

Background in classical software development, around six months into web full-stack with TypeScript, NestJS, and Next.js.

📫 Contact via the [B2B Showcase Page](#) or GitHub.
