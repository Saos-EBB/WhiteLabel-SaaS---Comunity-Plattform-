# Build Log

Ein Eintrag pro Step. Neue Einträge oben.

---

## 2026-07-24 — feat(seed): Subscriptions + Payment-Logs-Seed
**Was:** `seed-subscriptions-payments.ts` gibt ~35% der User (fester Anteil aus der geforderten 30-40%-Spanne, per Nickname-Seed gewuerfelt) eine `subscriptions`-Zeile (Plan/Provider zufaellig, lifetime ohne expires_at wie von `chk_sub_lifetime_no_expiry` gefordert) und dazu 1-3 `payment_logs` (Betrag aus den echten `subscription_price_*`-System-Settings mit Fallback auf die migrations/020-Defaults, da `db/schema.sql` reiner Schema-Dump ohne Daten ist — die System-Settings-Zeilen existieren auf einem frischen Volume also nicht). `payment_logs.subscription_id` ist NOT NULL, daher immer zusammen mit der Subscription erzeugt. Idempotenz-Marker: `provider_subscription_id = "seed-sub-<user_id>"` bzw. `provider_tx_id = "seed-pay-<user_id>-<n>"`. Per Docker-DB-Testlauf verifiziert: Plan/Status-Verteilung plausibel, keine verwaisten payment_logs, Top-up und SEED_RESET (Reihenfolge: payment_logs vor subscriptions wegen FK RESTRICT) funktionieren, zwei unabhaengige Laeufe liefern identische Subscriptions.
**Nicht gebaut:** kein eigener SEED_*-Env-Var fuer den Anteil/die Payment-Anzahl (nicht gefordert, haengt an SEED_RESET wie die anderen Skripte).

---

## 2026-07-24 — feat(seed): Coin-Transaktionen + Balance-Seed
**Was:** `seed-coin-transactions.ts` legt fuer jeden User SEED_TX_PER_USER zufaellige `coin_transactions` an (Typ aus der chk_coin_tx_type-Liste, Vorzeichen passend, beef_id immer NULL) und haelt `user_coin_balance` exakt synchron. Idempotenz-Marker: `idempotency_key = "seed:<user_id>:<n>"`. Zwei Bugs beim Testen gegen eine echte Docker-Postgres-Instanz gefunden und behoben: (1) `chk_coin_balance_non_negative` fehlte in meiner ersten Schema-Lesung — rein zufaellige Betraege koennen den Kontostand unterschreiten, daher Clamp auf den bis dahin aufgelaufenen Betrag. (2) `INSERT ... ON CONFLICT DO UPDATE SET balance = balance + EXCLUDED.balance` scheitert an eben diesem CHECK, sobald das VALUES-Delta selbst negativ ist — Postgres prueft den CHECK-Constraint offenbar gegen den rohen Insert-Kandidaten, bevor die SET-Berechnung greift, unabhaengig vom finalen (positiven) Ergebnis. Fix: Zielbalance komplett in JS berechnen (bestehender Wert + Summe) und als fertigen Wert per `DO UPDATE SET balance = EXCLUDED.balance` schreiben, kein DB-seitiges Increment mehr. Beides per Docker-DB-Testlauf verifiziert (Balance==Summe aller Transaktionen fuer alle User, keine negativen Salden, Top-up und SEED_RESET funktionieren, zwei unabhaengige Laeufe liefern identische Balances).
**Nicht gebaut:** kein Retry/Reroll bei amount=0 (moeglicher Nebeneffekt des Clamps, kein Constraint-Verstoss, kein spezielles Szenario gefordert).

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
