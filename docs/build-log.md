# Build Log

Ein Eintrag pro Step. Neue Einträge oben.

---

## 2026-07-21 — fix(auth): refreshToken-Cookie bei fehlgeschlagenem Refresh löschen
**Was:** `AuthController.refresh()` löscht den `refreshToken`-Cookie jetzt in einem `catch`, wenn `authService.refresh()` wirft — vorher blieb ein toter/fremder Cookie für immer im Browser stehen und löste bei jedem Seitenaufruf denselben 401-Loop erneut aus.
**Nicht gebaut:** kein Umbau der Frontend-Retry-Logik (Single-Flight, Refresh-Ausschluss aus 401-Retry, Hard-Redirect bei Fehlschlag existierten bereits und waren nicht die Ursache).
