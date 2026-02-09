-- ============================================================
-- Migration: Supabase Infrastructure Mocks
-- Description: Creates auth/storage schemas for local testing.
--              On real Supabase, these already exist and will be skipped.
-- Created: 2026-01-03
-- ============================================================

-- Extensions (IF NOT EXISTS = safe on Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

-- Under Supabase CLI the auth/storage schemas already exist and are owned by
-- supabase_admin, so we cannot create objects there.  We detect this by
-- checking whether auth.users already exists: if it does we skip all mocks.
-- For plain PostgreSQL (sqlx::test) we create the full mock infrastructure.
DO $mock$
BEGIN
    -- If auth.users already exists (Supabase CLI), skip mocks entirely.
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'auth' AND table_name = 'users') THEN
        RAISE NOTICE 'auth.users already exists — skipping Supabase mocks';
        RETURN;
    END IF;

    -- Auth users table
    CREATE TABLE auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id UUID,
        aud VARCHAR(255),
        role VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        encrypted_password VARCHAR(255),
        email_confirmed_at TIMESTAMPTZ,
        invited_at TIMESTAMPTZ,
        confirmation_token VARCHAR(255),
        confirmation_sent_at TIMESTAMPTZ,
        recovery_token VARCHAR(255),
        recovery_sent_at TIMESTAMPTZ,
        email_change_token_new VARCHAR(255),
        email_change VARCHAR(255),
        email_change_sent_at TIMESTAMPTZ,
        last_sign_in_at TIMESTAMPTZ,
        raw_app_meta_data JSONB,
        raw_user_meta_data JSONB,
        is_super_admin BOOLEAN,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        phone VARCHAR(255),
        phone_confirmed_at TIMESTAMPTZ,
        phone_change VARCHAR(255),
        phone_change_token VARCHAR(255),
        phone_change_sent_at TIMESTAMPTZ,
        confirmed_at TIMESTAMPTZ,
        email_change_token_current VARCHAR(255),
        email_change_confirm_status SMALLINT,
        banned_until TIMESTAMPTZ,
        reauthentication_token VARCHAR(255),
        reauthentication_sent_at TIMESTAMPTZ,
        is_sso_user BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMPTZ
    );

    -- Storage buckets table
    CREATE TABLE storage.buckets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        owner UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        public BOOLEAN DEFAULT FALSE,
        avif_autodetection BOOLEAN DEFAULT FALSE,
        file_size_limit BIGINT,
        allowed_mime_types TEXT[]
    );

    -- Storage objects table
    CREATE TABLE storage.objects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bucket_id TEXT REFERENCES storage.buckets(id),
        name TEXT,
        owner UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB,
        version TEXT
    );

    -- Auth functions
    CREATE FUNCTION auth.uid() RETURNS UUID AS $fn$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    $fn$ LANGUAGE SQL STABLE;

    CREATE FUNCTION auth.role() RETURNS TEXT AS $fn$
        SELECT NULLIF(current_setting('request.jwt.claim.role', true), '');
    $fn$ LANGUAGE SQL STABLE;

    CREATE FUNCTION auth.email() RETURNS TEXT AS $fn$
        SELECT NULLIF(current_setting('request.jwt.claim.email', true), '');
    $fn$ LANGUAGE SQL STABLE;

    -- Storage functions
    CREATE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] AS $fn$
        SELECT string_to_array(name, '/');
    $fn$ LANGUAGE SQL IMMUTABLE;

    CREATE FUNCTION storage.filename(name TEXT) RETURNS TEXT AS $fn$
        SELECT split_part(name, '/', -1);
    $fn$ LANGUAGE SQL IMMUTABLE;

    CREATE FUNCTION storage.extension(name TEXT) RETURNS TEXT AS $fn$
        SELECT split_part(name, '.', -1);
    $fn$ LANGUAGE SQL IMMUTABLE;
END
$mock$;

-- Roles (idempotent creation, safe under concurrent test execution).
-- We catch both duplicate_object (42710, normal CREATE ROLE conflict) and
-- unique_violation (23505, concurrent INSERT into pg_authid race).
DO $$ BEGIN
    CREATE ROLE authenticated;
EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL;
END $$;

DO $$ BEGIN
    CREATE ROLE anon;
EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL;
END $$;

DO $$ BEGIN
    CREATE ROLE service_role;
EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL;
END $$;
