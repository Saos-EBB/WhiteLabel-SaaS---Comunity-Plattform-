# Bakes the full current schema into /docker-entrypoint-initdb.d/ so a fresh
# volume auto-provisions on first boot. Postgres only runs these on an empty
# data directory — a populated volume (anything short of `docker compose down -v`)
# is left untouched.
#
# db/schema.sql is a `pg_dump --schema-only` snapshot of a fully-migrated dev
# database, NOT schema_v4.sql + migrations/*.sql replayed in order — schema_v4.sql
# predates several migrations (019_owner_role, 022_hidden_beef_feature, etc.) while
# also already baking in a few others (004_nickname_unique), so replaying both
# together produces "already exists" conflicts. Regenerate db/schema.sql with
# `pg_dump -U $DB_USER -d $DB_NAME --schema-only --no-owner --no-privileges`
# whenever the schema changes.
FROM postgis/postgis:16-3.4

COPY db/schema.sql /docker-entrypoint-initdb.d/000_schema.sql
