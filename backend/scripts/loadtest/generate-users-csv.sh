#!/usr/bin/env bash
#
# Erzeugt users.csv (email,password) fuer den Loadtest — NICHT fuer die Demo.
#
# Nutzt bewusst NICHT demo-users.yaml (die 46 kuratierten Demo-User bleiben
# fuer den Docker-Demo-Build unangetastet), sondern die deterministischen
# seed_user_*-Fake-User aus src/database/seeds/seed-extra-users.ts:
#   E-Mail:    seed_user_0001@seed.local ... seed_user_NNNN@seed.local
#   Passwort:  feste Konstante "SeedUser1234!" fuer alle (siehe seed-extra-users.ts)
#
# Voraussetzung: die Fake-User muessen VORHER in der Loadtest-DB angelegt sein
# (separate DB/Container empfohlen, nicht die Demo-DB):
#   SEED_USERS=10000 npx ts-node -r tsconfig-paths/register \
#     src/database/seeds/seed-extra-users.ts
#
# Usage:
#   COUNT=10000 ./generate-users-csv.sh > users.csv
#   COUNT muss zum SEED_USERS-Wert passen, mit dem oben geseedet wurde.
#
set -euo pipefail

COUNT="${COUNT:-1000}"
PASSWORD="SeedUser1234!"   # muss exakt zum Hash in seed-extra-users.ts passen

for i in $(seq 1 "$COUNT"); do
  printf 'seed_user_%04d@seed.local,%s\n' "$i" "$PASSWORD"
done
