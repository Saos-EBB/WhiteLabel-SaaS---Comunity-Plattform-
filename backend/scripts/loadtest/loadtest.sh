#!/usr/bin/env bash
#
# YourBrand Loadtest — gewichtete Pipelines statt reinem Random-Pick.
# Jeder simulierte User loggt sich ein und durchläuft wiederholt eine
# zufällig (gewichtet) gewählte Pipeline, mit Delay zwischen den Aktionen.
#
# Voraussetzung: users.csv in diesem Ordner (email,password), z.B. per
#   COUNT=10000 ./generate-users-csv.sh > users.csv
# erzeugt aus den seed_user_*-Fake-Usern (siehe generate-users-csv.sh).
# Läuft bewusst gegen eine eigene Loadtest-DB, NICHT gegen die Demo-DB.
# test-photo.jpg (in diesem Ordner) wird fuer pipeline_media_upload gebraucht
# (echter multipart-Upload, der Server prueft Magic Bytes + dekodiert mit sharp).
#
# Usage:
#   ./loadtest.sh
#   NUM_USERS=200 DURATION_SEC=300 ./loadtest.sh
#
set -uo pipefail   # bewusst KEIN -e: einzelne fehlgeschlagene Requests
                    # sollen geloggt werden, nicht das ganze Script killen

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─────────────────────────────────────────────────────────────
# KONFIGURATION — das hier sind die Stellschrauben für die Nutzerzahl
# ─────────────────────────────────────────────────────────────
# Alle Routen laufen unter globalem Prefix /api/v1 (main.ts: app.setGlobalPrefix('api/v1'))
BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
NUM_USERS="${NUM_USERS:-50}"              # <- Haupt-Variable für Nutzerzahl
DURATION_SEC="${DURATION_SEC:-60}"        # Testdauer in Sekunden
MIN_DELAY_MS="${MIN_DELAY_MS:-200}"       # Denkpause zwischen Aktionen (min)
MAX_DELAY_MS="${MAX_DELAY_MS:-2000}"      # Denkpause zwischen Aktionen (max)
USERS_FILE="${USERS_FILE:-./users.csv}"   # Format: email,password (ohne Header)
TEST_PHOTO="${TEST_PHOTO:-${SCRIPT_DIR}/test-photo.jpg}"  # fuer pipeline_media_upload
RUN_ADMIN_PIPELINE="${RUN_ADMIN_PIPELINE:-true}"  # 1x Owner-Loop parallel laufen lassen
# owner@demo.example.com / Demo1234! ist der einzige role=owner-Account aus
# demo-users.yaml — es gibt nur diese eine Owner-Rolle, nicht N.
ADMIN_EMAIL="${ADMIN_EMAIL:-owner@demo.example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Demo1234!}"

TS="$(date +%s)"
LOG_DIR="./loadtest-logs/${TS}"
mkdir -p "${LOG_DIR}"

# Pipeline-Gewichte (müssen nicht 100 ergeben, werden normalisiert)
declare -A PIPELINE_WEIGHTS=(
  [browse]=50
  [coin_transaction]=30
  [media_upload]=20
)

# ─────────────────────────────────────────────────────────────
# HILFSFUNKTIONEN
# ─────────────────────────────────────────────────────────────

random_delay() {
  local ms=$(( RANDOM % (MAX_DELAY_MS - MIN_DELAY_MS + 1) + MIN_DELAY_MS ))
  sleep "$(awk -v ms="$ms" 'BEGIN{printf "%.3f", ms/1000}')"
}

# Führt einen Request aus, loggt Status-Code + Dauer in die User-Logdatei.
# Args: <user_log_file> <token|-> <METHOD> <path> [json_body]
do_request() {
  local logfile="$1" token="$2" method="$3" path="$4" body="${5:-}"
  local auth_header=()
  [ "$token" != "-" ] && auth_header=(-H "Authorization: Bearer ${token}")

  local start end dur status
  start=$(date +%s%3N)
  if [ -n "$body" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" -m 10 \
      -X "$method" "${BASE_URL}${path}" \
      -H "Content-Type: application/json" \
      "${auth_header[@]}" -d "$body")
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" -m 10 \
      -X "$method" "${BASE_URL}${path}" \
      "${auth_header[@]}")
  fi
  end=$(date +%s%3N)
  dur=$(( end - start ))
  echo "$(date -Iseconds),${method},${path},${status},${dur}" >> "$logfile"
}

# Multipart-Datei-Upload, loggt wie do_request. Args: <logfile> <token> <path> <field> <filepath>
do_upload() {
  local logfile="$1" token="$2" path="$3" field="$4" filepath="$5"
  local start end dur status
  start=$(date +%s%3N)
  status=$(curl -s -o /dev/null -w "%{http_code}" -m 10 \
    -X POST "${BASE_URL}${path}" \
    -H "Authorization: Bearer ${token}" \
    -F "${field}=@${filepath};type=image/jpeg")
  end=$(date +%s%3N)
  dur=$(( end - start ))
  echo "$(date -Iseconds),POST,${path},${status},${dur}" >> "$logfile"
}

login() {
  local email="$1" password="$2"
  curl -s -m 10 -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}" \
    | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4
}

# Gewichtete Zufallsauswahl einer Pipeline
pick_pipeline() {
  local total=0 key
  for key in "${!PIPELINE_WEIGHTS[@]}"; do
    total=$(( total + PIPELINE_WEIGHTS[$key] ))
  done
  local r=$(( RANDOM % total ))
  local acc=0
  for key in "${!PIPELINE_WEIGHTS[@]}"; do
    acc=$(( acc + PIPELINE_WEIGHTS[$key] ))
    if [ "$r" -lt "$acc" ]; then
      echo "$key"
      return
    fi
  done
}

# ─────────────────────────────────────────────────────────────
# PIPELINES — bilden echte Userflows nach, nicht einzelne Aktionen
# TODO: Pfade an eure echten Endpoints anpassen (aktuell Annahmen)
# ─────────────────────────────────────────────────────────────

pipeline_browse() {
  local logfile="$1" token="$2"
  do_request "$logfile" "$token" GET "/discover/deck"
  random_delay
  # Ersatz fuer /profiles/random (existiert nicht, siehe Bericht)
  do_request "$logfile" "$token" GET "/discover/matches"
  random_delay
  do_request "$logfile" "$token" GET "/hidden/coin/balance"
}

pipeline_coin_transaction() {
  local logfile="$1" token="$2"
  do_request "$logfile" "$token" GET "/hidden/coin/balance"
  random_delay
  # Nur erreichbar wenn Backend mit LOADTEST_MODE=true laeuft (siehe CoinModule) —
  # sonst 404. Loest denselben DB-Schreibpfad wie ein echter Stripe-Kauf aus
  # (CoinService.addCoins), ohne echten Stripe-Call.
  do_request "$logfile" "$token" POST "/hidden/coin/test-purchase"
  random_delay
  do_request "$logfile" "$token" GET "/hidden/coin/balance"
}

pipeline_media_upload() {
  local logfile="$1" token="$2"
  do_upload "$logfile" "$token" "/media/upload/profile-photo" "file" "$TEST_PHOTO"
  # GET /media/mine existiert nicht (siehe Bericht) — kein zweiter Call moeglich
}

pipeline_admin_moderate() {
  local logfile="$1" token="$2"
  do_request "$logfile" "$token" GET "/admin/media/pending"
  # PATCH .../approve braucht eine echte Media-ID aus der Response oben —
  # kein "next"-Convenience-Endpoint vorhanden (siehe Bericht)
}

# ─────────────────────────────────────────────────────────────
# SIMULIERTER USER — läuft als Background-Prozess bis Testende
# ─────────────────────────────────────────────────────────────

simulate_user() {
  local idx="$1" email="$2" password="$3" end_ts="$4"
  local logfile="${LOG_DIR}/user_${idx}.csv"
  echo "timestamp,method,path,status,duration_ms" > "$logfile"

  local token
  token=$(login "$email" "$password")
  if [ -z "$token" ]; then
    echo "$(date -Iseconds),LOGIN,-,FAIL,0" >> "$logfile"
    return
  fi

  while [ "$(date +%s)" -lt "$end_ts" ]; do
    local pipeline
    pipeline=$(pick_pipeline)
    "pipeline_${pipeline}" "$logfile" "$token"
    random_delay
  done
}

simulate_admin() {
  local end_ts="$1"
  local logfile="${LOG_DIR}/admin_owner.csv"
  echo "timestamp,method,path,status,duration_ms" > "$logfile"

  local token
  token=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
  if [ -z "$token" ]; then
    echo "$(date -Iseconds),LOGIN,-,FAIL,0" >> "$logfile"
    return
  fi

  while [ "$(date +%s)" -lt "$end_ts" ]; do
    pipeline_admin_moderate "$logfile" "$token"
    random_delay
  done
}

# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if [ ! -f "$USERS_FILE" ]; then
  echo "Fehler: ${USERS_FILE} nicht gefunden (Format: email,password pro Zeile, kein Header)."
  echo "Erzeugen mit: COUNT=10000 ./generate-users-csv.sh > users.csv"
  exit 1
fi

mapfile -t USER_LINES < "$USERS_FILE"
AVAILABLE_USERS="${#USER_LINES[@]}"
if [ "$AVAILABLE_USERS" -lt "$NUM_USERS" ]; then
  echo "Warnung: nur ${AVAILABLE_USERS} User in ${USERS_FILE}, NUM_USERS wird darauf begrenzt."
  NUM_USERS="$AVAILABLE_USERS"
fi

END_TS=$(( $(date +%s) + DURATION_SEC ))

echo "Start: ${NUM_USERS} User, ${DURATION_SEC}s Dauer, Ziel ${BASE_URL}"
echo "Logs: ${LOG_DIR}"

PIDS=()

if [ "$RUN_ADMIN_PIPELINE" = "true" ]; then
  simulate_admin "$END_TS" &
  PIDS+=($!)
fi

for i in $(seq 0 $((NUM_USERS - 1))); do
  IFS=',' read -r email password <<< "${USER_LINES[$i]}"
  simulate_user "$i" "$email" "$password" "$END_TS" &
  PIDS+=($!)
  # kleines Stagger beim Start, damit nicht alle exakt gleichzeitig einloggen
  sleep 0.02
done

# warten bis alle User-Prozesse fertig sind
for pid in "${PIDS[@]}"; do
  wait "$pid"
done

echo "Fertig. Aggregiere Ergebnisse..."

# ─────────────────────────────────────────────────────────────
# AUSWERTUNG
# ─────────────────────────────────────────────────────────────

SUMMARY_FILE="${LOG_DIR}/summary.txt"
{
  echo "=== YourBrand Loadtest Summary ==="
  echo "Zeitpunkt: $(date -Iseconds)"
  echo "NUM_USERS=${NUM_USERS} DURATION_SEC=${DURATION_SEC} BASE_URL=${BASE_URL}"
  echo ""

  ALL_ROWS="${LOG_DIR}/_all_rows.csv"
  echo "timestamp,method,path,status,duration_ms" > "$ALL_ROWS"
  for f in "${LOG_DIR}"/user_*.csv "${LOG_DIR}"/admin_*.csv; do
    [ -f "$f" ] && tail -n +2 "$f" >> "$ALL_ROWS"
  done

  TOTAL=$(($(wc -l < "$ALL_ROWS") - 0))
  echo "Requests gesamt: ${TOTAL}"

  echo ""
  echo "-- Status-Code-Verteilung --"
  awk -F',' 'NR>1 {print $4}' "$ALL_ROWS" | sort | uniq -c | sort -rn

  echo ""
  echo "-- Requests pro Pfad --"
  awk -F',' 'NR>1 {print $3}' "$ALL_ROWS" | sort | uniq -c | sort -rn

  echo ""
  echo "-- Latenz pro Pfad (avg / p95 / max, ms) --"
  awk -F',' 'NR>1 {print $3","$5}' "$ALL_ROWS" | sort -t',' -k1,1 | \
  awk -F',' '
    {
      path=$1; dur=$2+0
      arr[path][n[path]++] = dur
      sum[path] += dur
      if (dur > max[path]) max[path] = dur
    }
    END {
      for (p in arr) {
        # simple sort für p95
        m = n[p]
        for (i=0;i<m;i++) for (j=i+1;j<m;j++) if (arr[p][i]>arr[p][j]) {t=arr[p][i];arr[p][i]=arr[p][j];arr[p][j]=t}
        p95idx = int(m*0.95); if (p95idx>=m) p95idx=m-1
        printf "%-30s avg=%.0f p95=%.0f max=%.0f n=%d\n", p, sum[p]/m, arr[p][p95idx], max[p], m
      }
    }'
} | tee "$SUMMARY_FILE"

echo ""
echo "Zusammenfassung gespeichert in: ${SUMMARY_FILE}"
