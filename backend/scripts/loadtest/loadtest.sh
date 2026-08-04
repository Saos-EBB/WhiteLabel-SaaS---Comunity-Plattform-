#!/usr/bin/env bash
#
# YourBrand Loadtest — flaches Random-Action-Modell. Jeder simulierte User
# waehlt pro Tick EINE zufaellige Aktion aus einer flachen Liste aller
# bekannten Endpoints, fuehrt sie aus, schlaeft 2-25s, waehlt neu. Kein
# Login im Loop, kein Per-User-State (auf IDs angewiesene Aktionen holen
# sich per Quick-GET eine, sonst zaehlt der GET-Call selbst schon als
# Aktion).
#
# Tokens werden WIEDERVERWENDET, nicht 1:1 an NUM_USERS gebunden: Worker i
# bekommt Token (i % Anzahl verfuegbarer Tokens) aus tokens.csv — mehrere
# gleichzeitige Worker koennen also denselben Account/JWT benutzen. Fuer
# reine Lasttests ohne Per-User-Korrektheitsziel (kein Dedup, kein State-
# Tracking, siehe oben) ist das unproblematisch: ein JWT authentifiziert
# beliebig viele parallele Requests. Das entkoppelt NUM_USERS (= Anzahl
# gleichzeitiger Worker, also die eigentliche Last) von der Anzahl
# tatsaechlich in der DB angelegter/prefetchter Accounts — siehe
# run-loadtest.sh fuer den Token-Pool-Size-Kalkul (~NUM_USERS/10).
#
# Voraussetzung: tokens.csv in diesem Ordner (email,token), erzeugt per
#   ./prefetch-tokens.sh
# (das wiederum users.csv voraussetzt, siehe generate-users-csv.sh).
# Laeuft bewusst gegen eine eigene Loadtest-DB, NICHT gegen die Demo-DB.
# test-photo.jpg (in diesem Ordner) wird fuer action_media_upload gebraucht
# (echter multipart-Upload, der Server prueft Magic Bytes + dekodiert mit sharp).
#
# admin_pending ist Teil der flachen Liste wie jede andere Aktion — hat
# der Token in tokens.csv keine owner-Rolle (Normalfall, seed_user_* sind
# alle role=user), liefert das 403 und zaehlt als EXPECTED-REJECT, kein
# Bug. Um echte 200er auf dieser Aktion zu sehen, den Owner-Account
# (owner@demo.example.com) mit in users.csv aufnehmen, bevor prefetch
# laeuft.
#
# Usage:
#   ./loadtest.sh
#   NUM_USERS=200 DURATION_SEC=300 RAMP_SEC=60 ./loadtest.sh
#
set -uo pipefail   # bewusst KEIN -e: einzelne fehlgeschlagene Requests
                    # sollen geloggt werden, nicht das ganze Script killen

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─────────────────────────────────────────────────────────────
# KONFIGURATION
# ─────────────────────────────────────────────────────────────
# Alle Routen laufen unter globalem Prefix /api/v1 (main.ts: app.setGlobalPrefix('api/v1'))
BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
NUM_USERS="${NUM_USERS:-0}"                # 0 = alle Tokens aus TOKENS_FILE nutzen
DURATION_SEC="${DURATION_SEC:-60}"         # Testdauer in Sekunden
MIN_DELAY_SEC="${MIN_DELAY_SEC:-2}"        # Denkpause zwischen Aktionen (min)
MAX_DELAY_SEC="${MAX_DELAY_SEC:-25}"       # Denkpause zwischen Aktionen (max)
RAMP_SEC="${RAMP_SEC:-30}"                 # alle User werden ueber dieses Fenster verteilt gestartet,
                                            # unabhaengig von NUM_USERS (ersetzt festes Stagger-Sleep)
TOKENS_FILE="${TOKENS_FILE:-./tokens.csv}" # Format: email,token (ohne Header), siehe prefetch-tokens.sh
TEST_PHOTO="${TEST_PHOTO:-${SCRIPT_DIR}/test-photo.jpg}"  # fuer action_media_upload
# Vom Aufrufer (run-loadtest.sh) durchgereichter Hinweis, wie gross der
# Token-Pool eigentlich sein sollte — nur fuer die WARNUNG-Zeile unten,
# wenn der Prefetch weniger geliefert hat. 0 = nicht gesetzt (z.B. bei
# direktem, manuellem Aufruf ohne run-loadtest.sh) -> keine Pruefung.
TOKEN_POOL_TARGET="${TOKEN_POOL_TARGET:-0}"

TS="$(date +%s)"
LOG_DIR="./loadtest-logs/${TS}"
mkdir -p "${LOG_DIR}"
ERRORS_FILE="${LOG_DIR}/errors.log"

# ─────────────────────────────────────────────────────────────
# HILFSFUNKTIONEN
# ─────────────────────────────────────────────────────────────

random_delay() {
  local sec=$(( RANDOM % (MAX_DELAY_SEC - MIN_DELAY_SEC + 1) + MIN_DELAY_SEC ))
  sleep "$sec"
}

# 4xx sind bei diesem Lastansatz erwartet (z.B. "Anfrage bereits gesendet",
# "insufficient coins", 403 auf admin_pending fuer Nicht-Owner) und werden
# NICHT hier geloggt — nur echte Fehler: 5xx oder eine tote Verbindung
# (curl liefert dann "000", siehe do_request).
# Args: <METHOD> <path> <status> <response_body>
log_error_if_needed() {
  local method="$1" path="$2" status="$3" body="$4"
  if [ "$status" = "000" ] || { [[ "$status" =~ ^[0-9]+$ ]] && [ "$status" -ge 500 ]; }; then
    local snippet="${body:0:500}"
    snippet="${snippet//$'\n'/ }"
    snippet="${snippet//$'\t'/ }"
    printf '%s\t%s\t%s\t%s\t%s\n' "$(date -Iseconds)" "$method" "$path" "$status" "$snippet" >> "$ERRORS_FILE"
  fi
}

# Führt einen Request aus, loggt Status-Code + Dauer in die User-Logdatei.
# Args: <user_log_file> <token|-> <METHOD> <path> [json_body]
# Setzt RESPONSE_BODY als Nebeneffekt — fuer Aktionen, die die Antwort
# auswerten muessen (z.B. eine ID fuer den naechsten Call brauchen), ohne
# dafuer einen zweiten curl-Call nur zum Parsen zu brauchen.
do_request() {
  local logfile="$1" token="$2" method="$3" path="$4" body="${5:-}"
  local auth_header=()
  [ "$token" != "-" ] && auth_header=(-H "Authorization: Bearer ${token}")

  local start end dur raw status
  start=$(date +%s%3N)
  if [ -n "$body" ]; then
    raw=$(curl -s -m 10 -X "$method" "${BASE_URL}${path}" \
      -H "Content-Type: application/json" \
      "${auth_header[@]}" -d "$body" -w $'\n%{http_code}')
  else
    raw=$(curl -s -m 10 -X "$method" "${BASE_URL}${path}" \
      "${auth_header[@]}" -w $'\n%{http_code}')
  fi
  end=$(date +%s%3N)
  dur=$(( end - start ))

  RESPONSE_BODY="${raw%$'\n'*}"
  status="${raw##*$'\n'}"
  [ -z "$status" ] && status="000"   # curl killed/no response at all -> treat like connection failure

  echo "$(date -Iseconds),${method},${path},${status},${dur}" >> "$logfile"
  log_error_if_needed "$method" "$path" "$status" "$RESPONSE_BODY"
}

# Multipart-Datei-Upload, loggt wie do_request. Args: <logfile> <token> <path> <field> <filepath>
do_upload() {
  local logfile="$1" token="$2" path="$3" field="$4" filepath="$5"
  local start end dur raw status body
  start=$(date +%s%3N)
  raw=$(curl -s -m 10 -X POST "${BASE_URL}${path}" \
    -H "Authorization: Bearer ${token}" \
    -F "${field}=@${filepath};type=image/jpeg" \
    -w $'\n%{http_code}')
  end=$(date +%s%3N)
  dur=$(( end - start ))

  body="${raw%$'\n'*}"
  status="${raw##*$'\n'}"
  [ -z "$status" ] && status="000"

  echo "$(date -Iseconds),POST,${path},${status},${dur}" >> "$logfile"
  log_error_if_needed POST "$path" "$status" "$body"
}

# ─────────────────────────────────────────────────────────────
# AKTIONEN — je eine pro bekanntem Endpoint, gleichgewichtet in ACTIONS
# ─────────────────────────────────────────────────────────────

action_discover_deck() {
  do_request "$1" "$2" GET "/discover/deck"
}

action_discover_matches() {
  do_request "$1" "$2" GET "/discover/matches"
}

action_coin_balance() {
  do_request "$1" "$2" GET "/hidden/coin/balance"
}

# Nur erreichbar wenn Backend mit LOADTEST_MODE=true laeuft (siehe CoinModule) —
# sonst 404 (zaehlt als EXPECTED-REJECT, nicht als Bug).
action_coin_test_purchase() {
  do_request "$1" "$2" POST "/hidden/coin/test-purchase"
}

action_media_upload() {
  do_upload "$1" "$2" "/media/upload/profile-photo" "file" "$TEST_PHOTO"
}

action_chat_conversations_list() {
  do_request "$1" "$2" GET "/chat/conversations"
}

# Quick-GET auf /chat/conversations um eine ID zu holen; ohne Conversation
# bleibt es bei diesem einen GET (kein Fallback-Call moeglich).
action_chat_messages_list() {
  local logfile="$1" token="$2"
  do_request "$logfile" "$token" GET "/chat/conversations"
  local conv_id
  conv_id=$(printf '%s' "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  [ -n "$conv_id" ] && do_request "$logfile" "$token" GET "/chat/conversations/${conv_id}/messages"
}

action_chat_messages_post() {
  local logfile="$1" token="$2"
  do_request "$logfile" "$token" GET "/chat/conversations"
  local conv_id
  conv_id=$(printf '%s' "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$conv_id" ]; then
    do_request "$logfile" "$token" POST "/chat/conversations/${conv_id}/messages" \
      "{\"content\":\"loadtest message $(date +%s%N)\"}"
  fi
}

# Quick-GET aufs Deck um einen Kandidaten zu holen, dann Kontaktanfrage.
# 409 heisst "gab's schon" — erwartet unter Last, kein Bug.
action_contact_request_send() {
  local logfile="$1" token="$2"
  do_request "$logfile" "$token" GET "/discover/deck"
  local ids=()
  while IFS= read -r id; do
    [ -n "$id" ] && ids+=("$id")
  done < <(printf '%s' "$RESPONSE_BODY" | grep -o '"user_id":"[^"]*"' | cut -d'"' -f4)
  if [ "${#ids[@]}" -gt 0 ]; then
    local target="${ids[$((RANDOM % ${#ids[@]}))]}"
    do_request "$logfile" "$token" POST "/chat/requests" "{\"receiver_id\":\"${target}\"}"
  fi
}

action_contact_request_incoming() {
  do_request "$1" "$2" GET "/chat/requests/incoming"
}

# Quick-GET auf die eigenen Incoming-Requests, erste (falls vorhanden)
# annehmen. PATCH .../accept 409t, wenn der Request inzwischen von
# woanders schon beantwortet wurde — erwartet unter Last, kein Bug.
action_contact_request_accept() {
  local logfile="$1" token="$2"
  do_request "$logfile" "$token" GET "/chat/requests/incoming"
  local first_id
  first_id=$(printf '%s' "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  [ -n "$first_id" ] && do_request "$logfile" "$token" PATCH "/chat/requests/${first_id}/accept"
}

action_admin_pending() {
  do_request "$1" "$2" GET "/admin/media/pending"
}

ACTIONS=(
  action_discover_deck
  action_discover_matches
  action_coin_balance
  action_coin_test_purchase
  action_media_upload
  action_chat_conversations_list
  action_chat_messages_list
  action_chat_messages_post
  action_contact_request_send
  action_contact_request_incoming
  action_contact_request_accept
  action_admin_pending
)

# ─────────────────────────────────────────────────────────────
# SIMULIERTER USER — läuft als Background-Prozess bis Testende
# ─────────────────────────────────────────────────────────────

simulate_user() {
  local idx="$1" token="$2" end_ts="$3"
  local logfile="${LOG_DIR}/user_${idx}.csv"
  echo "timestamp,method,path,status,duration_ms" > "$logfile"

  # Leerer Token heisst: Prefetch hat fuer diesen Slot keinen Token
  # geliefert (siehe prefetch-tokens.sh "X of Y tokens acquired") — kein
  # Login-Fehler im Loop, sondern eine Prefetch-Luecke.
  if [ -z "$token" ]; then
    echo "$(date -Iseconds),LOGIN,-,FAIL,0" >> "$logfile"
    return
  fi

  while [ "$(date +%s)" -lt "$end_ts" ]; do
    local action="${ACTIONS[$((RANDOM % ${#ACTIONS[@]}))]}"
    "$action" "$logfile" "$token"
    random_delay
  done
}

# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if [ ! -f "$TOKENS_FILE" ]; then
  echo "Fehler: ${TOKENS_FILE} nicht gefunden (Format: email,token pro Zeile, kein Header)."
  echo "Erzeugen mit: COUNT=1000 ./generate-users-csv.sh > users.csv && ./prefetch-tokens.sh"
  exit 1
fi

mapfile -t TOKEN_LINES < "$TOKENS_FILE"
AVAILABLE_TOKENS="${#TOKEN_LINES[@]}"
if [ "$AVAILABLE_TOKENS" -eq 0 ]; then
  echo "Fehler: ${TOKENS_FILE} ist leer."
  exit 1
fi

# NUM_USERS=0 (Standalone-Aufruf ohne run-loadtest.sh, kein expliziter
# Wunsch) heisst weiterhin "ein Worker pro verfuegbarem Token" — sonst
# laeuft NUM_USERS UNVERAENDERT, auch wenn es AVAILABLE_TOKENS uebersteigt:
# Worker teilen sich dann Tokens (siehe Token-Zuweisung unten), es wird
# nicht mehr stillschweigend heruntergerechnet.
if [ "$NUM_USERS" -eq 0 ]; then
  NUM_USERS="$AVAILABLE_TOKENS"
fi

END_TS=$(( $(date +%s) + DURATION_SEC ))
RAMP_INTERVAL=$(awk -v r="$RAMP_SEC" -v n="$NUM_USERS" 'BEGIN{ v = n>0 ? r/n : 0; printf "%.3f", v }')

echo "Start: ${NUM_USERS} User (${AVAILABLE_TOKENS} Tokens im Pool, wiederverwendet), ${DURATION_SEC}s Dauer, Ramp ueber ${RAMP_SEC}s, Ziel ${BASE_URL}"
echo "Logs: ${LOG_DIR}"

PIDS=()

for (( i=0; i<NUM_USERS; i++ )); do
  # Token-Pool wiederverwendet, sobald NUM_USERS > AVAILABLE_TOKENS —
  # mehrere Worker benutzen dann denselben Account/JWT gleichzeitig, siehe
  # Header-Kommentar oben.
  token_idx=$(( i % AVAILABLE_TOKENS ))
  IFS=',' read -r email token <<< "${TOKEN_LINES[$token_idx]}"
  simulate_user "$i" "$token" "$END_TS" &
  PIDS+=($!)
  sleep "$RAMP_INTERVAL"
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
  # NUM_USERS selbst lief immer vollstaendig (siehe oben) — das hier ist
  # KEIN "lief mit weniger Usern"-Fehler mehr, sondern nur ein Hinweis,
  # dass der Account-Pool kleiner als geplant ist (weniger Account-
  # Vielfalt unter den wiederverwendeten Tokens), z.B. durch einzelne
  # fehlgeschlagene Logins trotz Retries beim Prefetch.
  if [ "$TOKEN_POOL_TARGET" -gt 0 ] && [ "$AVAILABLE_TOKENS" -lt "$TOKEN_POOL_TARGET" ]; then
    echo "WARNUNG: Token-Pool kleiner als geplant — nur ${AVAILABLE_TOKENS} von ${TOKEN_POOL_TARGET} vorgesehenen Accounts hatten einen Token (siehe prefetch-tokens.sh-Ausgabe fuer uebersprungene Logins). Alle ${NUM_USERS} Worker liefen trotzdem, teilen sich aber einen kleineren Pool."
  fi
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
