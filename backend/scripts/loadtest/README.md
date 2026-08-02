# Loadtest

Two independent modes (see each script's header comment for usage/env vars):

- **Mode 1 — login capacity:** `login-capacity.sh`. Stepped-ramp test
  against only `POST /auth/login`, to find how many logins/sec the backend
  (bcrypt) sustains. Terminal-only, its own summary table — not tracked by
  the dashboard.
- **Mode 2 — prefetch + endpoint load:** `generate-users-csv.sh` ->
  `prefetch-tokens.sh` (logs every user in once, writes `tokens.csv`) ->
  `loadtest.sh` (flat random-action loop over all known endpoints, reads
  tokens from `tokens.csv`, no login in the loop). `run-loadtest.sh`
  orchestrates all three end to end. This README's dashboard section covers
  Mode 2 only.

Run Mode 1 first to find a safe login rate, then pass it to Mode 2's
prefetch step, e.g. `BATCH_SIZE=30 BATCH_PAUSE=1 ./run-loadtest.sh 1000 300`.

## Dashboard

A live view onto Mode 2's logs — plain Node, no dependencies, no build
step. It does not run the loadtest itself; it tails
`loadtest-logs/<ts>/*.csv` while `run-loadtest.sh` runs, and can start/stop
that script for you.

**Start:**

```bash
cd dashboard
npm start
```

**Open:** http://127.0.0.1:4300 (binds to localhost only).

Requirements for the parts you actually use:
- Live docker stats (CPU/Mem for `XXX_backend_load` / `XXX_db_load`) need
  those containers running and the `docker` CLI on `PATH`; if not, that
  panel just stays empty.
- The Start button runs `run-loadtest.sh <numUsers> <durationSec>`, so the
  loadtest backend stack needs to be up first (same requirement as running
  `run-loadtest.sh` directly — see its own health-check step).
