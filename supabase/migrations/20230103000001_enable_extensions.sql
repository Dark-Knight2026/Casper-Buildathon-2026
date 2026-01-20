-- ============================================================
-- Migration: Enable Required PostgreSQL Extensions
-- Description: Enable UUID generation and other required extensions
-- Created: 2026-01-03
-- ============================================================

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable postgis for geospatial queries (optional, for property coordinates)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Comments
COMMENT ON EXTENSION "uuid-ossp" IS 'Provides functions to generate UUIDs';
COMMENT ON EXTENSION "pgcrypto" IS 'Provides cryptographic functions';
COMMENT ON EXTENSION "postgis" IS 'Provides geospatial data types and functions';
COMMENT ON EXTENSION "pg_trgm" IS 'Provides trigram matching for fuzzy text search';