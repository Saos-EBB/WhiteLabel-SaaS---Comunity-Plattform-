#!/usr/bin/env bash
#
# Mode 1 — login capacity test. Hits ONLY POST /auth/login (bcrypt compare
# is the expensive part of that request) with a stepped ramp, to find how
# many logins/sec the backend sustains before success rate drops or
# latency runs away. Does not touch any other endpoint and does not write
# anything under loadtest-logs/ — standalone, terminal-only, own summary.
#
# users.csv wird bei Bedarf selbst erzeugt (email,password), genau wie
# run-loadtest.sh das fuer Mode 2 tut — keine manuelle Vorbereitung noetig.
# Login attempts cycle through all available users so the ramp isn't
# hammering a handful of accounts (bcrypt cost is per-request either way,
# not per-account, but real traffic wouldn't repeat one identifier either).
#
# Usage:
#   ./login-capacity.sh
#   START_RATE=10 RATE_STEP=10 STEP_SEC=15 MAX_RATE=100 ./login-capacity.sh
#   AUTO_STOP=true SUCCESS_THRESHOLD=95 ./login-capacity.sh
#
set -uo pipefail   # bewusst KEIN -e: einzelne fehlgeschlagene Logins sollen
                    # gezaehlt werden, nicht das Script abbrechen

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
USERS_FILE="${USERS_FILE:-./users.csv}"

START_RATE="${START_RATE:-5}"     # Logins/Sekunde in Step 1
RATE_STEP="${RATE_STEP:-5}"       # Steigerung pro Step
STEP_SEC="${STEP_SEC:-10}"        # Dauer eines Steps in Sekunden
MAX_RATE="${MAX_RATE:-50}"        # Ramp stoppt, sobald target rate das ueberschreitet

AUTO_STOP="${AUTO_STOP:-false}"           # bei true: Ramp stoppt, sobald success% < SUCCESS_THRESHOLD
SUCCESS_THRESHOLD="${SUCCESS_THRESHOLD:-95}"

# users.csv braucht mindestens so viele Zeilen wie der teuerste Step
# (MAX_RATE Logins/Sekunde ueber STEP_SEC Sekunden) an Logins ausloest,
# sonst wiederholt sich derselbe Account mehrfach pro Step. Genau wie
# run-loadtest.sh: eine vorhandene users.csv mit genug Zeilen bleibt
# unangetastet, nur bei zu wenigen wird neu erzeugt.
NEEDED_USERS=$(( MAX_RATE * STEP_SEC ))
EXISTING_USERS=0
[ -f "$USERS_FILE" ] && EXISTING_USERS=$(wc -l < "$USERS_FILE")
if [ "$EXISTING_USERS" -lt "$NEEDED_USERS" ]; then
  echo "Erzeuge ${USERS_FILE} mit ${NEEDED_USERS} Usern (vorhanden: ${EXISTING_USERS})..."
  COUNT="$NEEDED_USERS" ./generate-users-csv.sh > "$USERS_FILE"
fi

mapfile -t USER_LINES < "$USERS_FILE"
AVAILABLE_USERS="${#USER_LINES[@]}"
if [ "$AVAILABLE_USERS" -eq 0 ]; then
  echo "Fehler: ${USERS_FILE} ist leer."
  exit 1
fi

TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/login-capacity.XXXXXX")"
trap 'rm -rf "$TMP_ROOT"' EXIT

echo "Login-Capacity-Test gegen ${BASE_URL}/auth/login"
echo "START_RATE=${START_RATE} RATE_STEP=${RATE_STEP} STEP_SEC=${STEP_SEC} MAX_RATE=${MAX_RATE} AUTO_STOP=${AUTO_STOP}"
echo ""

# Führt einen einzelnen Login durch, schreibt "RESULT,duration_ms" in out_file.
# RESULT ist OK nur wenn HTTP 200 UND ein accessToken im Body steht.
attempt_login() {
  local out_file="$1" email="$2" password="$3"
  local start end dur raw status body result
  start=$(date +%s%3N)
  raw=$(curl -s -m 10 -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"identifier\":\"${email}\",\"password\":\"${password}\"}" \
    -w $'\n%{http_code}' 2>/dev/null)
  end=$(date +%s%3N)
  dur=$(( end - start ))

  body="${raw%$'\n'*}"
  status="${raw##*$'\n'}"
  [ -z "$status" ] && status="000"

  if [ "$status" = "200" ] && printf '%s' "$body" | grep -q '"accessToken"'; then
    result="OK"
  else
    result="FAIL"
  fi
  printf '%s,%s\n' "$result" "$dur" > "$out_file"
}

# Aggregiert result-Dateien eines Steps zu attempts/successes/avg/p95/max.
aggregate_step() {
  local dir="$1"
  cat "$dir"/*.csv 2>/dev/null | awk -F',' '
    {
      n++
      if ($1 == "OK") { ok++; sum+=$2; dur[ok_n++]=$2; if ($2>max) max=$2 }
      else fail++
    }
    END {
      printf "%d\t%d\t%d\n", n+0, ok+0, fail+0
      if (ok_n > 0) {
        for (i=0;i<ok_n;i++) for (j=i+1;j<ok_n;j++) if (dur[i]>dur[j]) {t=dur[i];dur[i]=dur[j];dur[j]=t}
        p95idx = int(ok_n*0.95); if (p95idx>=ok_n) p95idx=ok_n-1
        printf "%.0f\t%d\t%d\n", sum/ok_n, dur[p95idx], max
      } else {
        printf "0\t0\t0\n"
      }
    }'
}

printf '%-6s %-12s %-10s %-10s %-10s %-8s %-8s %-8s\n' \
  "step" "target/s" "attempts" "success" "success%" "avg_ms" "p95_ms" "max_ms"

USER_CURSOR=0
RESULTS=()   # kept for the final re-printed table
STEP_NUM=0
RATE="$START_RATE"

while [ "$RATE" -le "$MAX_RATE" ]; do
  STEP_NUM=$((STEP_NUM + 1))
  STEP_DIR="${TMP_ROOT}/step_${STEP_NUM}"
  mkdir -p "$STEP_DIR"

  PIDS=()
  REQ_NUM=0
  for (( sec=0; sec<STEP_SEC; sec++ )); do
    tick_start=$(date +%s%3N)
    for (( r=0; r<RATE; r++ )); do
      REQ_NUM=$((REQ_NUM + 1))
      idx=$(( (USER_CURSOR + REQ_NUM) % AVAILABLE_USERS ))
      IFS=',' read -r email password <<< "${USER_LINES[$idx]}"
      attempt_login "${STEP_DIR}/req_${REQ_NUM}.csv" "$email" "$password" &
      PIDS+=($!)
    done
    tick_end=$(date +%s%3N)
    elapsed=$(( tick_end - tick_start ))
    remaining=$(( 1000 - elapsed ))
    if [ "$remaining" -gt 0 ]; then
      sleep "$(awk -v ms="$remaining" 'BEGIN{printf "%.3f", ms/1000}')"
    fi
  done
  USER_CURSOR=$(( USER_CURSOR + REQ_NUM ))

  # Step-Dauer ist um, aber einzelne Requests koennen laenger brauchen
  # (das ist ja genau das, was wir hier messen wollen) — auf alle warten.
  for pid in "${PIDS[@]}"; do wait "$pid" 2>/dev/null; done

  mapfile -t stat_lines < <(aggregate_step "$STEP_DIR")
  IFS=$'\t' read -r attempts successes failures <<< "${stat_lines[0]}"
  IFS=$'\t' read -r avg_ms p95_ms max_ms <<< "${stat_lines[1]}"

  success_pct="0.0"
  if [ "$attempts" -gt 0 ]; then
    success_pct=$(awk -v ok="$successes" -v n="$attempts" 'BEGIN{printf "%.1f", (ok/n)*100}')
  fi

  row=$(printf '%-6s %-12s %-10s %-10s %-10s %-8s %-8s %-8s' \
    "$STEP_NUM" "${RATE}/s" "$attempts" "$successes" "${success_pct}%" "$avg_ms" "$p95_ms" "$max_ms")
  echo "$row"
  RESULTS+=("$row")

  rm -rf "$STEP_DIR"

  if [ "$AUTO_STOP" = "true" ]; then
    below=$(awk -v p="$success_pct" -v t="$SUCCESS_THRESHOLD" 'BEGIN{print (p+0 < t+0) ? 1 : 0}')
    if [ "$below" = "1" ]; then
      echo ""
      echo "AUTO_STOP: success% (${success_pct}) fiel unter SUCCESS_THRESHOLD (${SUCCESS_THRESHOLD}) bei ${RATE}/s — Ramp gestoppt."
      break
    fi
  fi

  RATE=$(( RATE + RATE_STEP ))
done

echo ""
echo "=== Zusammenfassung ==="
printf '%-6s %-12s %-10s %-10s %-10s %-8s %-8s %-8s\n' \
  "step" "target/s" "attempts" "success" "success%" "avg_ms" "p95_ms" "max_ms"
for row in "${RESULTS[@]}"; do echo "$row"; done
echo ""
echo "Kapazitaetsgrenze: der Step, ab dem success% einbricht bzw. p95 stark ansteigt."
