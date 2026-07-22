#!/bin/sh
set -e

# All four seed scripts are idempotent (skip existing nicknames/emails/beef
# pairs/city rows/already-backfilled locations), so this is a no-op on a
# volume that's already seeded — only a fresh `docker compose down -v && up
# --build` actually populates anything.
# Demo beefs get ends_at = NOW() + 8h at seed time, so re-running this on a
# fresh volume always produces currently-active beefs, not stale ones.
# seed-cities must run before backfill-profile-locations, which looks up
# lat/lng from the cities table to set profiles.location.
npx ts-node -r tsconfig-paths/register src/database/seeds/demo-seed.ts
npx ts-node -r tsconfig-paths/register src/database/seeds/demo-relations-seed.ts
npx ts-node -r tsconfig-paths/register src/database/seeds/seed-cities.ts
npx ts-node -r tsconfig-paths/register src/database/seeds/backfill-profile-locations.ts

exec npm run start:dev
