-- db/schema.sql (updated)
-- Run this to (re)create the syncward schema in a fresh database.

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

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('viewer', 'operator', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);