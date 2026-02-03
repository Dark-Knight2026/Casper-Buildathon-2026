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

-- Auth users table (Supabase schema)
CREATE TABLE IF NOT EXISTS auth.users (
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
CREATE TABLE IF NOT EXISTS storage.buckets (
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
CREATE TABLE IF NOT EXISTS storage.objects (
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

-- Roles (idempotent creation)
DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
    END IF;
END $$;

-- Auth functions (only create if not exists - don't override Supabase's real functions)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uid' AND pronamespace = 'auth'::regnamespace) THEN
        CREATE FUNCTION auth.uid() RETURNS UUID AS $fn$
            SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
        $fn$ LANGUAGE SQL STABLE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'role' AND pronamespace = 'auth'::regnamespace) THEN
        CREATE FUNCTION auth.role() RETURNS TEXT AS $fn$
            SELECT NULLIF(current_setting('request.jwt.claim.role', true), '');
        $fn$ LANGUAGE SQL STABLE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'email' AND pronamespace = 'auth'::regnamespace) THEN
        CREATE FUNCTION auth.email() RETURNS TEXT AS $fn$
            SELECT NULLIF(current_setting('request.jwt.claim.email', true), '');
        $fn$ LANGUAGE SQL STABLE;
    END IF;
END $$;

-- Storage functions (only create if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'foldername' AND pronamespace = 'storage'::regnamespace) THEN
        CREATE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] AS $fn$
            SELECT string_to_array(name, '/');
        $fn$ LANGUAGE SQL IMMUTABLE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'filename' AND pronamespace = 'storage'::regnamespace) THEN
        CREATE FUNCTION storage.filename(name TEXT) RETURNS TEXT AS $fn$
            SELECT split_part(name, '/', -1);
        $fn$ LANGUAGE SQL IMMUTABLE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'extension' AND pronamespace = 'storage'::regnamespace) THEN
        CREATE FUNCTION storage.extension(name TEXT) RETURNS TEXT AS $fn$
            SELECT split_part(name, '.', -1);
        $fn$ LANGUAGE SQL IMMUTABLE;
    END IF;
END $$;
