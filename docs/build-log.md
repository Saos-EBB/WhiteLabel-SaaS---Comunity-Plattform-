# Build Log

Ein Eintrag pro Step. Neue Einträge oben.

---

## 2026-07-22 — fix(auth): abgelaufenen/gelöschten Account beim Bootstrap sauber ausloggen
**Was:** `useBootstrap` behandelt ein 404 "Profil nicht gefunden" von `/profile/me` jetzt wie eine abgelaufene Session — Store leeren, Redirect auf `/login`. Vorher blieb der Client hängen: gültiger Access Token, aber der zugehörige User/Profil-Datensatz existiert nicht mehr (z.B. hart gelöscht via `delete-user.ts`), `isReady` wurde nie `true`, kein Cleanup, kein Redirect.
**Nicht gebaut:** kein DB-Existenz-Check im `JwtGuard` pro Request — der Client-seitige Cleanup beim Bootstrap reicht, um den hängenden Zustand aufzulösen, ohne jeden Request eine zusätzliche Query zu kosten.

---

## 2026-07-21 — fix(auth): refreshToken-Cookie bei fehlgeschlagenem Refresh löschen
**Was:** `AuthController.refresh()` löscht den `refreshToken`-Cookie jetzt in einem `catch`, wenn `authService.refresh()` wirft — vorher blieb ein toter/fremder Cookie für immer im Browser stehen und löste bei jedem Seitenaufruf denselben 401-Loop erneut aus.
**Nicht gebaut:** kein Umbau der Frontend-Retry-Logik (Single-Flight, Refresh-Ausschluss aus 401-Retry, Hard-Redirect bei Fehlschlag existierten bereits und waren nicht die Ursache).
