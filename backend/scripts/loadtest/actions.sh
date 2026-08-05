#!/usr/bin/env bash
#
# Shared endpoint actions — sourced (not executed) by loadtest.sh (Mode 2,
# flat random-action model) and endpoint-rate.sh (Mode 3, stepped rate ramp
# against a chosen subset of these same actions). Single source of truth so
# the two modes can never drift apart on what an endpoint call actually
# does. Extracted from loadtest.sh unchanged — see git history there for
# the original per-action commentary.
#
# Requires from the sourcing script, set before any action actually runs
# (defining these functions doesn't need them yet, only calling one does):
#   ERRORS_FILE   — log_error_if_needed() appends here
# Optional, have their own defaults if unset:
#   BASE_URL, TEST_PHOTO
#
# admin_pending is part of the flat list like any other action — a token
# without the owner role (the normal case, seed_user_* are all role=user)
# gets 403 and counts as EXPECTED-REJECT, not a bug. To see real 200s on
# this action, add the owner account (owner@demo.example.com) to users.csv
# before prefetch runs.

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
ACTIONS_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_PHOTO="${TEST_PHOTO:-${ACTIONS_SCRIPT_DIR}/test-photo.jpg}"  # fuer action_media_upload

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
# AKTIONEN — je eine pro bekanntem Endpoint, gleichgewichtet in ACTIONS.
# Der Schluessel fuer Endpoint-Auswahl (z.B. endpoint-rate.sh's ENDPOINTS=)
# ist der Funktionsname ohne "action_"-Praefix, z.B. "discover_deck".
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
