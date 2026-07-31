#!/usr/bin/env bash
#
# Wrapper fuer die komplette Loadtest-Kette in einem Befehl: Health-Check auf
# den Loadtest-Stack -> users.csv erzeugen -> loadtest.sh starten -> Summary
# ausgeben.
#
# Usage:
#   ./run-loadtest.sh [NUM_USERS] [DURATION_SEC]
#   ./run-loadtest.sh 100 60
#   (ohne Argumente: NUM_USERS=100 DURATION_SEC=60)
#
# Voraussetzung: Loadtest-Stack laeuft bereits, z.B.
#   docker compose -f docker-compose.yml -f docker-compose.loadtest.yml up -d \
#     XXX_db_load XXX_backend_load
#
set -uo pipefail   # bewusst KEIN -e, siehe loadtest.sh — klare Fehlermeldung statt Abbruch

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"   # users.csv/loadtest-logs liegen relativ zu diesem Ordner (siehe loadtest.sh)

NUM_USERS="${1:-100}"
DURATION_SEC="${2:-60}"
LOADTEST_BASE_URL="http://localhost:3100/api/v1"

echo "=== 1/4: Health-Check auf ${LOADTEST_BASE_URL} ==="
# Kein dedizierter /health-Endpoint im Backend, und AppController (GET /) ist
# nirgends registriert (curl liefert hier reproduzierbar 404). Jeder HTTP-
# Statuscode beweist trotzdem, dass Nest antwortet — nur "000" (curl kommt
# gar nicht durch: Connection refused/Timeout) zaehlt hier als "nicht da".
status=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "${LOADTEST_BASE_URL}" 2>/dev/null)
if [ "$status" = "000" ]; then
  echo "Fehler: Loadtest-Stack unter ${LOADTEST_BASE_URL} nicht erreichbar."
  echo "Starten mit:"
  echo "  docker compose -f docker-compose.yml -f docker-compose.loadtest.yml up -d XXX_db_load XXX_backend_load"
  exit 1
fi
echo "OK (HTTP ${status})"

echo ""
echo "=== 2/4: users.csv fuer ${NUM_USERS} User erzeugen ==="
COUNT="$NUM_USERS" ./generate-users-csv.sh > users.csv
echo "-> ${SCRIPT_DIR}/users.csv ($(wc -l < users.csv) Zeilen)"

echo ""
echo "=== 3/4: loadtest.sh (NUM_USERS=${NUM_USERS} DURATION_SEC=${DURATION_SEC}) ==="
BASE_URL="$LOADTEST_BASE_URL" NUM_USERS="$NUM_USERS" DURATION_SEC="$DURATION_SEC" ./loadtest.sh
loadtest_exit=$?

echo ""
echo "=== 4/4: Summary ==="
latest_log_dir=$(ls -1dt loadtest-logs/*/ 2>/dev/null | head -1)
if [ -z "$latest_log_dir" ]; then
  echo "Keine Logs gefunden — loadtest.sh ist vermutlich fehlgeschlagen."
  exit "$loadtest_exit"
fi

summary_file="${latest_log_dir}summary.txt"
echo "Summary: ${SCRIPT_DIR}/${summary_file}"
echo ""
cat "$summary_file"

exit "$loadtest_exit"
