#!/usr/bin/env bash
#
# Mode 2, Teil A — loggt jeden User aus users.csv GENAU EINMAL ein und
# schreibt email,token nach tokens.csv. loadtest.sh liest daraus (kein
# Login mehr im Last-Loop selbst). Throttled in Batches (BATCH_SIZE +
# BATCH_PAUSE), damit dieser Schritt selbst nicht schon die in
# login-capacity.sh gefundene Kapazitaetsgrenze reisst.
#
# users.csv ist hier der TOKEN-POOL, nicht mehr zwingend ein Eintrag pro
# spaeter simuliertem User — loadtest.sh weist Tokens per Round-Robin an
# seine Worker zu (siehe dort), von run-loadtest.sh typischerweise auf
# ~NUM_USERS/10 dimensioniert. Fuer dieses Skript selbst aendert sich
# dadurch nichts: es loggt einfach jede Zeile in users.csv genau einmal ein.
#
# Defaults (BATCH_SIZE=20, BATCH_PAUSE=0) sind so aggressiv wie gegen
# diesen Stack noch verlustfrei moeglich — mit login-capacity.sh
# nachgemessen (2026-08-05, aktuelle Hardware/UV_THREADPOOL_SIZE):
# 5..25 parallele Logins liefen bei 100% Erfolgsrate (p95 bei 25/s aber
# schon 5.6s — nah am 10s-curl-Timeout unten), 30/s brach auf 98%, 35/s
# auf 88.6% ein. 20 gewaehlt als Default mit klarem Sicherheitsabstand
# (p95 bei 20/s: 2.8s). Die fruehere Messung hier (20 parallel ~12%
# Erfolgsrate) war fuer eine andere Hardware/einen anderen
# UV_THREADPOOL_SIZE gueltig — bei erneuter Aenderung von Hardware/
# Threadpool-Groesse neu gegenmessen, nicht blind hochdrehen.
#
# Usage:
#   ./prefetch-tokens.sh
#   BATCH_SIZE=30 BATCH_PAUSE=1 ./prefetch-tokens.sh   # nur mit frischer Messung, siehe oben
#
set -uo pipefail   # bewusst KEIN -e: einzelne fehlgeschlagene Logins sollen
                    # geloggt und uebersprungen werden, nicht das Script killen

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
USERS_FILE="${USERS_FILE:-./users.csv}"
TOKENS_FILE="${TOKENS_FILE:-./tokens.csv}"
BATCH_SIZE="${BATCH_SIZE:-20}"    # parallele Logins pro Batch
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
# Machine-readable progress line, one per batch (see dashboard/lib/runner.js,
# which tails this script's stdout the same way it already tails for the
# "Logs: <dir>" line). Deliberately just IDX/TOTAL — processed, not
# acquired, so a run with a few skipped logins still reaches 100%.
echo "PREFETCH 0/${TOTAL}"

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

  echo "PREFETCH ${IDX}/${TOTAL}"

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
