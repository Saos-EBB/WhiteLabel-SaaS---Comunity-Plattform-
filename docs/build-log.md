# Build Log

Ein Eintrag pro Step. Neue Einträge oben.

---

## 2026-07-24 — feat(seed): Fake-User-Generator fuer Coin/Cash/Media-Testdaten
**Was:** `seed-extra-users.ts` legt SEED_USERS zusaetzliche User+Profile (Nickname-Praefix `seed_user_`) on top der 45 YAML-Demo-User an, als Volumen fuer die kommenden Coin/Cash/Media-Seeds. Idempotent (Top-up auf hoehere SEED_USERS-Werte moeglich), SEED_RESET=true loescht+baut neu. Fester Random-Seed pro Nickname (`seed-shared.ts`, FNV-1a-Hash aus Nickname+Namespace) statt eines fortlaufenden RNG — sonst kollidieren Top-up-Laeufe mit bereits vergebenen Werten aus frueheren Laeufen (per Docker-DB-Test verifiziert). `DELETE ... RETURNING` liefert bei TypeORMs `query()` ein Tupel `[rows, rowCount]` zurueck (anders als `INSERT ... RETURNING`) — beim Reset-Logging entsprechend destrukturiert.
**Nicht gebaut:** kein individueller Passwort-Hash pro Fake-User (ein gemeinsamer bcrypt-Hash reicht, diese User werden nicht eingeloggt), keine Interessen/Media fuer die Fake-User in diesem Script (kommt mit dem Media-Seed), kein gender/looking_for/bio (nicht gefordert, Felder sind nullable).

## 2026-07-22 — fix(auth): abgelaufenen/gelöschten Account beim Bootstrap sauber ausloggen
**Was:** `useBootstrap` behandelt ein 404 "Profil nicht gefunden" von `/profile/me` jetzt wie eine abgelaufene Session — Store leeren, Redirect auf `/login`. Vorher blieb der Client hängen: gültiger Access Token, aber der zugehörige User/Profil-Datensatz existiert nicht mehr (z.B. hart gelöscht via `delete-user.ts`), `isReady` wurde nie `true`, kein Cleanup, kein Redirect.
**Nicht gebaut:** kein DB-Existenz-Check im `JwtGuard` pro Request — der Client-seitige Cleanup beim Bootstrap reicht, um den hängenden Zustand aufzulösen, ohne jeden Request eine zusätzliche Query zu kosten.

---

## 2026-07-21 — fix(auth): refreshToken-Cookie bei fehlgeschlagenem Refresh löschen
**Was:** `AuthController.refresh()` löscht den `refreshToken`-Cookie jetzt in einem `catch`, wenn `authService.refresh()` wirft — vorher blieb ein toter/fremder Cookie für immer im Browser stehen und löste bei jedem Seitenaufruf denselben 401-Loop erneut aus.
**Nicht gebaut:** kein Umbau der Frontend-Retry-Logik (Single-Flight, Refresh-Ausschluss aus 401-Retry, Hard-Redirect bei Fehlschlag existierten bereits und waren nicht die Ursache).
