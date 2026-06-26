-- Drop unused user_agent and ip columns from refresh_tokens.
--
-- The original migration (20260422000003_create_refresh_tokens_table.sql)
-- provisioned these as audit columns "populated from the request that
-- issued the token" - the intent was to back a future sessions-list UI
-- that shows "Logged in from Firefox on 1.2.3.4". Nothing actually
-- populates them today: every `INSERT INTO refresh_tokens` in the
-- codebase passes only (user_id, family_id, token_hash, expires_at) via
-- `db::insert_refresh_token`, leaving user_agent and ip NULL on every
-- single row.
--
-- Holding NULL columns is space-cheap but actively misleading: a
-- `SELECT * FROM refresh_tokens` shows fields that look like they
-- should answer "where was this session opened" and silently lie. A
-- security incident response that trusts those values would chase
-- ghosts.
--
-- Drop both columns now. They will be re-introduced together with the
-- matching INSERT path (and the `axum::extract::ConnectInfo` / `User-Agent`
-- header capture in the login + rotate handlers) when the
-- session-listing feature actually ships.
--
-- This supersedes the "-- Audit (populated from the request that issued
-- the token)" section of migration 20260422000003.

ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS user_agent;
ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS ip;
