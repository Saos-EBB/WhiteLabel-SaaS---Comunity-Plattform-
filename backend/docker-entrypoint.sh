#!/bin/sh
set -e

# Both seed scripts are idempotent (skip existing nicknames/emails/beef pairs),
# so this is a no-op on a volume that's already seeded — only a fresh
# `docker compose down -v && up --build` actually populates anything.
# Demo beefs get ends_at = NOW() + 8h at seed time, so re-running this on a
# fresh volume always produces currently-active beefs, not stale ones.
npx ts-node -r tsconfig-paths/register src/database/seeds/demo-seed.ts
npx ts-node -r tsconfig-paths/register src/database/seeds/demo-relations-seed.ts

exec npm run start:dev
