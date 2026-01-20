-- ============================================================================
-- COMPLETE DATABASE SETUP SCRIPT
-- Property Management Platform - Profiles Table
-- ============================================================================
-- Version: 1.0
-- Date: 2026-01-06
-- Author: Bob (Architect)
-- Description: Complete SQL script to set up the profiles table with RLS
-- ============================================================================

-- ============================================================================
-- SECTION 1: CLEANUP (Optional - Use with caution in production)
-- ============================================================================

-- Drop existing table and related objects (CAUTION: This will delete all data)
-- Uncomment the following lines only if you want to start fresh

-- DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
-- DROP TRIGGER IF EXISTS sync_profiles_email ON profiles;
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP FUNCTION IF EXISTS sync_email_from_auth();
-- DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================================
-- SECTION 2: CREATE PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  -- Primary Key (links to Supabase Auth)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'tenant' 
    CHECK (role IN ('tenant', 'landlord', 'agent', 'broker', 'buyer', 'seller')),
  
  -- Personal Information
  full_name VARCHAR(255),
  phone VARCHAR(20),
  avatar_url TEXT,
  bio TEXT,
  
  -- Address Information
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United States',
  
  -- Additional Information
  date_of_birth DATE,
  
  -- Status Flags
  profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Activity Tracking
  last_login_at TIMESTAMPTZ,
  
  -- Flexible Data Storage
  preferences JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SECTION 3: CREATE INDEXES
-- ============================================================================

-- Primary index (automatically created with PRIMARY KEY)
-- CREATE UNIQUE INDEX profiles_pkey ON profiles(id);

-- Email index for fast lookups during login
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email);

-- Role index for filtering by user type
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles(role);

-- Active users index (partial index for better performance)
CREATE INDEX IF NOT EXISTS idx_profiles_is_active 
ON profiles(is_active) 
WHERE is_active = TRUE;

-- Email verification index (partial index)
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified 
ON profiles(email_verified) 
WHERE email_verified = FALSE;

-- Composite index for role + active status (common query pattern)
CREATE INDEX IF NOT EXISTS idx_profiles_role_active 
ON profiles(role, is_active);

-- Created date index for sorting and analytics
CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
ON profiles(created_at DESC);

-- Last login index for user activity tracking
CREATE INDEX IF NOT EXISTS idx_profiles_last_login 
ON profiles(last_login_at DESC) 
WHERE last_login_at IS NOT NULL;

-- JSONB GIN indexes for flexible querying (optional, add if needed)
-- CREATE INDEX IF NOT EXISTS idx_profiles_preferences 
-- ON profiles USING GIN (preferences);
-- 
-- CREATE INDEX IF NOT EXISTS idx_profiles_metadata 
-- ON profiles USING GIN (metadata);

-- ============================================================================
-- SECTION 4: CREATE TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before every UPDATE
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Function to sync email from auth.users (if needed)
-- This ensures email stays in sync with Supabase Auth
CREATE OR REPLACE FUNCTION sync_email_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Get email from auth.users table
  SELECT email INTO NEW.email 
  FROM auth.users 
  WHERE id = NEW.id;
  
  -- If email not found, keep the provided email
  IF NEW.email IS NULL THEN
    NEW.email = OLD.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Trigger to sync email (uncomment if needed)
-- DROP TRIGGER IF EXISTS sync_profiles_email ON profiles;
-- CREATE TRIGGER sync_profiles_email
--   BEFORE INSERT OR UPDATE ON profiles
--   FOR EACH ROW
--   EXECUTE FUNCTION sync_email_from_auth();

-- ============================================================================
-- SECTION 5: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 6: CREATE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users" ON profiles;

-- Policy 1: Allow users to INSERT their own profile
CREATE POLICY "Users can create their own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy 2: Allow users to SELECT (read) their own profile
CREATE POLICY "Users can read their own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy 3: Allow users to UPDATE their own profile
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: Allow users to DELETE their own profile
CREATE POLICY "Users can delete their own profile"
ON profiles
FOR DELETE
USING (auth.uid() = id);

-- Policy 5 (Optional): Allow authenticated users to view public profiles
-- Uncomment this if you want landlords/agents to have public profiles
/*
CREATE POLICY "Public profiles viewable by authenticated users"
ON profiles
FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND is_active = TRUE 
  AND profile_completed = TRUE
  AND role IN ('landlord', 'agent', 'broker')
);
*/

-- ============================================================================
-- SECTION 7: GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO service_role;

-- ============================================================================
-- SECTION 8: VERIFICATION QUERIES
-- ============================================================================

-- Verify table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
) AS profiles_table_exists;

-- Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- List all indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
ORDER BY indexname;

-- List all triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- Count existing profiles
SELECT COUNT(*) as total_profiles FROM profiles;

-- ============================================================================
-- SECTION 9: SAMPLE DATA (Optional - For Testing)
-- ============================================================================

-- Uncomment to insert sample test data
-- Note: Replace UUIDs with actual user IDs from auth.users

/*
-- Sample Tenant Profile
INSERT INTO profiles (
  id, 
  email, 
  role, 
  full_name, 
  phone, 
  city, 
  state, 
  profile_completed
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::UUID,
  'tenant@example.com',
  'tenant',
  'John Tenant',
  '+1-555-0101',
  'Los Angeles',
  'CA',
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- Sample Landlord Profile
INSERT INTO profiles (
  id, 
  email, 
  role, 
  full_name, 
  phone, 
  city, 
  state, 
  profile_completed,
  metadata
) VALUES (
  'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::UUID,
  'landlord@example.com',
  'landlord',
  'Jane Landlord',
  '+1-555-0102',
  'San Francisco',
  'CA',
  TRUE,
  '{"company_name": "Prime Properties", "license_number": "CA-12345"}'::JSONB
) ON CONFLICT (id) DO NOTHING;

-- Sample Agent Profile
INSERT INTO profiles (
  id, 
  email, 
  role, 
  full_name, 
  phone, 
  city, 
  state, 
  profile_completed,
  metadata
) VALUES (
  'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa'::UUID,
  'agent@example.com',
  'agent',
  'Mike Agent',
  '+1-555-0103',
  'San Diego',
  'CA',
  TRUE,
  '{"agency_name": "Best Realty", "license_number": "CA-67890"}'::JSONB
) ON CONFLICT (id) DO NOTHING;
*/

-- ============================================================================
-- SECTION 10: MAINTENANCE QUERIES
-- ============================================================================

-- Query to find incomplete profiles
-- SELECT id, email, role, profile_completed, created_at
-- FROM profiles
-- WHERE profile_completed = FALSE
-- ORDER BY created_at DESC;

-- Query to find unverified emails
-- SELECT id, email, role, email_verified, created_at
-- FROM profiles
-- WHERE email_verified = FALSE
-- ORDER BY created_at DESC;

-- Query to find inactive users
-- SELECT id, email, role, is_active, last_login_at
-- FROM profiles
-- WHERE is_active = FALSE
-- ORDER BY last_login_at DESC NULLS LAST;

-- Query to get user statistics by role
-- SELECT 
--   role,
--   COUNT(*) as total_users,
--   COUNT(CASE WHEN profile_completed THEN 1 END) as completed_profiles,
--   COUNT(CASE WHEN email_verified THEN 1 END) as verified_emails,
--   COUNT(CASE WHEN is_active THEN 1 END) as active_users
-- FROM profiles
-- GROUP BY role
-- ORDER BY total_users DESC;

-- ============================================================================
-- SECTION 11: PERFORMANCE MONITORING
-- ============================================================================

-- Query to check index usage
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE tablename = 'profiles'
-- ORDER BY idx_scan DESC;

-- Query to check table statistics
-- SELECT
--   schemaname,
--   tablename,
--   n_live_tup as live_rows,
--   n_dead_tup as dead_rows,
--   last_vacuum,
--   last_autovacuum,
--   last_analyze,
--   last_autoanalyze
-- FROM pg_stat_user_tables
-- WHERE tablename = 'profiles';

-- ============================================================================
-- SECTION 12: BACKUP & RESTORE
-- ============================================================================

-- Backup profiles table (run from command line)
-- pg_dump -h your-host -U your-user -d your-database -t profiles > profiles_backup.sql

-- Restore profiles table (run from command line)
-- psql -h your-host -U your-user -d your-database < profiles_backup.sql

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database setup complete!';
  RAISE NOTICE '📊 Profiles table created with % columns', 
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'profiles');
  RAISE NOTICE '🔒 RLS enabled with % policies', 
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles');
  RAISE NOTICE '⚡ % indexes created for performance', 
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'profiles');
  RAISE NOTICE '🎯 Ready for production use!';
END $$;