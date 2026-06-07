# Known Errors & Solutions

Wiederkehrende Fehler mit Ursache und Fix. Neue Einträge oben anhängen.

---

## [FE] TypeError: Failed to fetch — useBootstrap

**Wann:** Frontend startet, sofort im Browser-Console.

**Stack:** `fetchApi → useBootstrap.useEffect`

**Ursache:** Backend (NestJS) läuft nicht oder ist noch nicht hochgefahren.
`useBootstrap` macht beim App-Start einen Fetch auf `/api/v1/...` und bekommt keine Antwort.

**Fix:**
```bash
cd backend
npm run start:dev
```
Dann Frontend neu laden. Tritt auch kurz auf wenn Backend noch bootet — einfach warten.

---

## [BE] QueryFailedError: column Conversation.deleted_at_a does not exist

**Wann:** Chat-Seite / WebSocket-Connect / Admin Dashboard schlägt mit 500 fehl.

**Ursache:** `conversations`-Tabelle hatte noch das alte `deleted_at` (single column). Entity und Service erwarten `deleted_at_a` + `deleted_at_b` (per-User Soft-Delete). Migration fehlte.

**Fix:** Migration 033 laufen lassen:
```bash
npx ts-node -r tsconfig-paths/register src/database/seeds/run-sql.ts migrations/033_conversations_deleted_at_per_user.sql
```
Migration migriert alten `deleted_at`-Wert nach `deleted_at_a` und droppt die alte Spalte.

---

## [Seed] new row for relation "media_uploads" violates check constraint "chk_media_file_url"

**Wann:** Demo-Seed mit `DEMO_MEDIA_PATH` auf lokalem Dev-System.

**Ursache:** `media_uploads.file_url` hat `CHECK (file_url ~ '^https://')`, aber `BACKEND_URL` ist lokal `http://localhost:3000`.

**Fix:** Seed handled das automatisch — droppt die Constraint vor dem Media-Insert und warnt danach.
Constraint ist aktuell **entfernt** (Stand: 2026-06-07).
Wiederherstellen (nur wenn alle Einträge https:// haben):
```sql
ALTER TABLE media_uploads
  ADD CONSTRAINT chk_media_file_url CHECK (file_url ~ '^https://');
```
