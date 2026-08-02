#!/usr/bin/env bash
#
# Mode 2, Teil A — loggt jeden User aus users.csv GENAU EINMAL ein und
# schreibt email,token nach tokens.csv. loadtest.sh liest daraus (kein
# Login mehr im Last-Loop selbst). Throttled in Batches (BATCH_SIZE +
# BATCH_PAUSE), damit dieser Schritt selbst nicht schon die in
# login-capacity.sh gefundene Kapazitaetsgrenze reisst.
#
# Defaults (BATCH_SIZE=10, BATCH_PAUSE=0) sind so aggressiv wie gegen
# diesen Stack noch verlustfrei moeglich — mit login-capacity.sh
# nachgemessen: 20 parallele Logins lassen die Erfolgsrate schon auf
# ~12% einbrechen (bcrypt verstopft den libuv-Threadpool, Requests
# laufen in den curl-Timeout), 10 parallele liefen bei 100%. Bei
# anderer Hardware/anderem UV_THREADPOOL_SIZE neu gegenmessen, nicht
# blind hochdrehen.
#
# Usage:
#   ./prefetch-tokens.sh
#   BATCH_SIZE=20 BATCH_PAUSE=1 ./prefetch-tokens.sh   # gedrosselt
#
set -uo pipefail   # bewusst KEIN -e: einzelne fehlgeschlagene Logins sollen
                    # geloggt und uebersprungen werden, nicht das Script killen

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
USERS_FILE="${USERS_FILE:-./users.csv}"
TOKENS_FILE="${TOKENS_FILE:-./tokens.csv}"
BATCH_SIZE="${BATCH_SIZE:-10}"    # parallele Logins pro Batch
BATCH_PAUSE="${BATCH_PAUSE:-0}"   # Sekunden Pause zwischen Batches
RETRIES="${RETRIES:-2}"          # zusaetzliche Versuche nach dem ersten fehlgeschlagenen

if [ ! -f "$USERS_FILE" ]; then
  echo "Fehler: ${USERS_FILE} nicht gefunden (Format: email,password pro Zeile, kein Header)."
  echo "Erzeugen mit: COUNT=1000 ./generate-users-csv.sh > users.csv"
  exit 1
fi

mapfile -t USER_LINES < "$USERS_FILE"
TOTAL="${#USER_LINES[@]}"
if [ "$TOTAL" -eq 0 ]; then
  echo "Fehler: ${USERS_FILE} ist leer."
  exit 1
fi

SKIPPED_FILE="$(mktemp "${TMPDIR:-/tmp}/prefetch-skipped.XXXXXX")"

: > "$TOKENS_FILE"

echo "Prefetch: ${TOTAL} User aus ${USERS_FILE}, Batches von ${BATCH_SIZE} (Pause ${BATCH_PAUSE}s)"

# Login mit Retries. Args: <email> <password> <out_file>
# Schreibt "email,token" nach out_file bei Erfolg, sonst nichts (leer).
login_with_retry() {
  local email="$1" password="$2" out_file="$3"
  local attempt raw body status token
  for (( attempt=0; attempt<=RETRIES; attempt++ )); do
    raw=$(curl -s -m 10 -X POST "${BASE_URL}/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"identifier\":\"${email}\",\"password\":\"${password}\"}" \
      -w $'\n%{http_code}' 2>/dev/null)
    body="${raw%$'\n'*}"
    status="${raw##*$'\n'}"
    if [ "$status" = "200" ]; then
      token=$(printf '%s' "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
      if [ -n "$token" ]; then
        printf '%s,%s\n' "$email" "$token" > "$out_file"
        return 0
      fi
    fi
  done
  echo "$email" >> "$SKIPPED_FILE"
  return 1
}

BATCH_DIR="$(mktemp -d "${TMPDIR:-/tmp}/prefetch-batch.XXXXXX")"
trap 'rm -rf "$BATCH_DIR"; rm -f "$SKIPPED_FILE"' EXIT

ACQUIRED=0
IDX=0
while [ "$IDX" -lt "$TOTAL" ]; do
  PIDS=()
  BATCH_START="$IDX"
  for (( i=0; i<BATCH_SIZE && IDX<TOTAL; i++, IDX++ )); do
    IFS=',' read -r email password <<< "${USER_LINES[$IDX]}"
    login_with_retry "$email" "$password" "${BATCH_DIR}/${IDX}.csv" &
    PIDS+=($!)
  done
  for pid in "${PIDS[@]}"; do wait "$pid" 2>/dev/null; done

  for (( j=BATCH_START; j<IDX; j++ )); do
    if [ -f "${BATCH_DIR}/${j}.csv" ]; then
      cat "${BATCH_DIR}/${j}.csv" >> "$TOKENS_FILE"
      ACQUIRED=$((ACQUIRED + 1))
      rm -f "${BATCH_DIR}/${j}.csv"
    fi
  done

  if [ "$IDX" -lt "$TOTAL" ]; then
    sleep "$BATCH_PAUSE"
  fi
done

SKIPPED_COUNT=0
if [ -f "$SKIPPED_FILE" ]; then
  SKIPPED_COUNT=$(wc -l < "$SKIPPED_FILE" | tr -d ' ')
  if [ "$SKIPPED_COUNT" -gt 0 ]; then
    echo ""
    echo "Uebersprungen (Login nach ${RETRIES} Retries fehlgeschlagen):"
    cat "$SKIPPED_FILE"
  fi
fi

echo ""
echo "${ACQUIRED} of ${TOTAL} tokens acquired -> ${TOKENS_FILE}"

[ "$ACQUIRED" -gt 0 ]
