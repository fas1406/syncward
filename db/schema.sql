CREATE TABLE IF NOT EXISTS servers (
  id            SERIAL PRIMARY KEY,
  name          TEXT UNIQUE NOT NULL,
  host          TEXT NOT NULL,
  remote_path   TEXT NOT NULL,
  backup_path   TEXT,
  service_name  TEXT,
  role          TEXT DEFAULT 'secondary',
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);