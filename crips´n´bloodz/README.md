# Paarship – Projektdokumentation

> Dating-App für Menschen mit Behinderung  
> PostgreSQL 16 + PostGIS 3.4 · DSGVO-konform · AES-256 + bcrypt · SHA-256+Salt

---

## Stack

| Schicht | Technologie |
|---|---|
| Datenbank | PostgreSQL 16 + PostGIS 3.4 |
| Verschlüsselung | pgcrypto (AES-256), bcrypt (Backend), SHA-256+Salt |
| Container | Docker + pgAdmin 4 |
| Backend | Node.js / NestJS |

---

## Docker Setup

```bash
# Container starten
docker compose up -d

# DB-Verbindung
Host:     localhost
Port:     5432
DB:       paarship
User:     paarship_user
Password: paarship_dev_2026   # ⚠️ nur dev – .env für Produktion

# pgAdmin
URL:      http://localhost:5050
Email:    admin@paarship.dev
Password: admin123            # ⚠️ nur dev
```

---

## Schema einspielen

```bash
docker exec -i paarship_db psql -U paarship_user -d paarship < schema_v2.sql
```

---

## Datenbankschema v3

### Übersicht

**40 Tabellen** – davon 28 aktiv im SQL, 12 als FUTURE geplant.

### Sektionen

| Sektion | Tabellen |
|---|---|
| Auth & Account | `users`, `refresh_tokens`, `managed_accounts` + 4 FUTURE |
| Profil & Sozial | `profiles`, `profile_sensitive_data`, `interests`, `user_interests`, `media_uploads`, `blocks` + 2 FUTURE |
| Messaging & Chat | `contact_requests`, `conversations`, `messages` + 3 FUTURE |
| Benachrichtigungen | `notification_settings`, `notifications` + 1 FUTURE |
| Moderation & Safety | `reports`, `strikes` + 3 FUTURE |
| Payment & Legal | `subscriptions`, `payment_logs`, `agb_versions`, `consent_logs` + 1 FUTURE |
| Organisationen | `organizations`, `org_members` |

### FUTURE-Tabellen (noch nicht im SQL)

Diese Tabellen sind in den Diagrammen dokumentiert aber noch nicht eingespielt:

- `account_status` – ausgelagerte Status-Felder
- `account_audit_log` – Änderungshistorie für User-Felder
- `accessibility_settings` – ausgelagerte Barrierefreiheits-Settings
- `caretaker_audit_log` – Aktionslog für Betreuer
- `conversation_members` – für Gruppen-Chats
- `message_deletions` – granulares Lösch-Tracking
- `video_sessions` – Video-Call Infrastruktur
- `push_tokens` – FCM Push Notifications
- `user_ratings` – Bewertungssystem
- `match_scores` – Matching-Algorithmus Ergebnisse
- `invoices` – Rechnungsstellung
- `moderation_keywords` + `moderation_hits` – automatische Keyword-Moderation
- `strike_appeals` – Ban-Einsprüche

---

## DSGVO & Datenschutz

### Verschlüsselungsstrategie

| Feld | Methode | Grund |
|---|---|---|
| `users.email` | AES-256 (pgcrypto, BYTEA) | PII, muss entschlüsselbar bleiben |
| `users.email_search_hash` | SHA-256 + App-Salt | Unique-Check ohne Klartext |
| `users.google_id_hash` | SHA-256 + App-Salt | Unique-Check ohne Klartext |
| `users.password_hash` | bcrypt (Backend) | Passwort, nie reversibel |
| `refresh_tokens.token_hash` | SHA-256 | Token nie im Klartext speichern |
| `consent_logs.ip_hash` | SHA-256 + App-Salt | IP nicht reversibel speichern |
| `profile_sensitive_data.disability_type` | AES-256 (pgcrypto, BYTEA) | Art. 9 DSGVO Gesundheitsdatum |

### Encryption Key

```bash
# Key wird per Session gesetzt – NIEMALS hardcoded
SET app.encryption_key = 'dein-secret-key';

# Verschlüsseln (Backend)
pgp_sym_encrypt(value, current_setting('app.encryption_key'))

# Entschlüsseln (Backend)
pgp_sym_decrypt(value, current_setting('app.encryption_key'))
```

> **Produktion:** HashiCorp Vault oder AWS Secrets Manager verwenden.  
> Key-Rotation erfordert einen Migration-Job der alle BYTEA-Felder neu verschlüsselt.

### DSGVO Art. 9 – Gesundheitsdaten

`disability_type` und `disability_visible` sind in `profile_sensitive_data` ausgelagert.

**Pflicht beim Speichern:**
1. Eigene explizite Einwilligung einholen (Typ `sensitive_data` in `agb_versions`)
2. Einwilligung in `consent_logs` speichern
3. `consent_id` FK in `profile_sensitive_data` setzen
4. Nur mit entschlüsseltem Key im Backend lesbar

### vulnerable_flag / enhanced_protection

- Darf **nur** von Admin oder verifiziertem Caretaker gesetzt werden
- **Backend-Enforcement zwingend** – DB hat keine Row-Level-Security dafür (noch)
- Zugriff über `managed_accounts.can_set_protection`

### Löschkonzept (DSGVO Art. 17)

```
1. User löscht Account
   → users.deleted_at = NOW()          (Soft Delete)

2. Nach 30 Tagen (Cronjob)
   → users.email = NULL
   → users.email_search_hash = NULL
   → profiles.nickname = 'Gelöschter User'
   → profile_sensitive_data: DELETE
   → users.pseudonymized_at = NOW()

3. consent_logs: NIEMALS löschen
   → nur user_id pseudonymisieren (DSGVO Nachweispflicht)

4. payment_logs: 7 Jahre aufbewahren (§ 147 AO)
```

### Auskunftsrecht (DSGVO Art. 15)

Alle Tabellen mit `user_id` können per JOIN für die Auskunft exportiert werden.  
`profile_sensitive_data` nur nach Entschlüsselung mit App-Key.

---

## Wichtige Constraints

### conversations – keine Duplikate

```sql
-- Backend muss beim Erstellen sortieren:
user_a_id = MIN(user1_id, user2_id)  -- UUID-Vergleich
user_b_id = MAX(user1_id, user2_id)

-- CHECK Constraint im Schema:
CHECK (user_a_id < user_b_id)
UNIQUE (user_a_id, user_b_id)
```

### users – Email ohne Klartext suchen

```sql
-- Suche / Login:
WHERE email_search_hash = sha256(lower(trim(email)) || app_salt)

-- Klartext nur nach Entschlüsselung:
SELECT pgp_sym_decrypt(email, current_setting('app.encryption_key')) FROM users WHERE id = $1
```

---

## Diagrams

| File | Inhalt |
|---|---|
| `paarship_db_schema_v3.html` | Tabellen-Übersicht mit Feldern, Badges, Filter |
| `paarship_erd_v3.html` | Entity Relationship Diagram (Crow's Foot), Filter + FUTURE toggle |

---

## Offene TODOs

- [ ] `.env` für Docker Credentials (Produktion)
- [ ] `app.encryption_key` Secret Management einrichten
- [ ] Schema einspielen: `docker exec -i paarship_db psql -U paarship_user -d paarship < schema_v2.sql`
- [ ] Seed mit realistischen Testdaten
- [x] Backend aufsetzen (NestJS) — siehe `/XXX`
- [ ] Row-Level Security für `profile_sensitive_data` und `vulnerable_flag`
- [ ] DSGVO Lösch-Cronjob implementieren
- [ ] FUTURE-Tabellen ins SQL aufnehmen wenn Feature gebaut wird

---

## Sicherheits-Hinweise

> ⚠️ `paarship_dev_2026` und `admin123` sind Dev-Credentials.  
> Vor Go-Live: `.env` mit echten Secrets, docker-compose.yml aus Git-History entfernen oder `.gitignore` setzen.

```bash
# .gitignore mindestens:
.env
docker-compose.prod.yml
*.key
```