ALTER TABLE users
  ADD COLUMN IF NOT EXISTS exile_until TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_users_exile_until
  ON users(exile_until) WHERE exile_until IS NOT NULL;
