# Loadtest

The generator is `loadtest.sh` / `run-loadtest.sh` / `generate-users-csv.sh`
(see their header comments for usage). This README only covers the dashboard.

## Dashboard

A live view onto the generator's logs — plain Node, no dependencies, no
build step. It does not run the loadtest itself; it tails
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
