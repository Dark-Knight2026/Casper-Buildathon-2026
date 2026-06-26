# Supabase Database Migrations

This directory contains all SQL migration files for the Lease Management System database.

## Migration Files

The migrations are numbered sequentially and should be executed in order:

### 1. Extensions (20260103000001)
- `20260103000001_enable_extensions.sql` - Enables required PostgreSQL extensions (uuid-ossp, pgcrypto, postgis, pg_trgm)

### 2. Core Tables (20260103000002-000007)
- `20260103000002_create_users_table.sql` - Users table with roles and authentication
- `20260103000003_create_properties_table.sql` - Properties table with geospatial support
- `20260103000004_create_leases_table.sql` - Leases table with multi-tenant support
- `20260103000005_create_payments_table.sql` - Payments table with Stripe integration support
- `20260103000006_create_documents_table.sql` - Documents metadata table
- `20260103000007_create_signature_requests_table.sql` - E-signature workflow table

### 3. Supporting Tables (20260103000008-000013)
- `20260103000008_create_maintenance_requests_table.sql` - Maintenance requests tracking
- `20260103000009_create_messages_table.sql` - Internal messaging system
- `20260103000010_create_notifications_table.sql` - System notifications
- `20260103000011_create_audit_logs_table.sql` - Comprehensive audit trail
- `20260103000012_create_payment_schedules_table.sql` - Recurring payment schedules
- `20260103000013_create_user_preferences_table.sql` - User settings and preferences

### 4. Functions & Triggers (20260103000014-000015)
- `20260103000014_create_functions.sql` - Database utility functions
- `20260103000015_create_triggers.sql` - Automated triggers for timestamps, audit logs, etc.

### 5. Security (20260103000016-000017)
- `20260103000016_enable_rls.sql` - Enable Row Level Security on all tables
- `20260103000017_create_rls_policies.sql` - RLS policies for multi-tenant access control

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com/project/mkvqnefrlgiqzrtpfakf
2. Navigate to **SQL Editor**
3. Copy the contents of each migration file **in order**
4. Paste into the SQL Editor
5. Click **Run** to execute
6. Verify no errors occurred
7. Repeat for each migration file

### Option 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref mkvqnefrlgiqzrtpfakf

# Run all migrations
supabase db push
```

### Option 3: Run All at Once

Copy and paste the contents of `20260103000000_run_all_migrations.sql` (if created) into the Supabase SQL Editor.

## Migration Order

**IMPORTANT:** Migrations must be run in the exact order listed above due to dependencies:

1. Extensions must be enabled first
2. Core tables must be created before supporting tables (foreign key dependencies)
3. Functions must exist before triggers that use them
4. RLS must be enabled before policies are created

## Verification

After running all migrations, verify the setup:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- Check triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

## Expected Results

After successful migration:
- ✅ 12 tables created
- ✅ 45+ indexes created
- ✅ 8 functions created
- ✅ 15+ triggers created
- ✅ RLS enabled on all tables
- ✅ 40+ RLS policies created

## Rollback

If you need to rollback migrations:

```sql
-- Drop all tables (WARNING: This will delete all data!)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;
DROP TABLE IF EXISTS signature_requests CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS payment_schedules CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS leases CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS calculate_late_fee CASCADE;
DROP FUNCTION IF EXISTS get_expiring_leases CASCADE;
DROP FUNCTION IF EXISTS generate_lease_number CASCADE;
DROP FUNCTION IF EXISTS calculate_occupancy_rate CASCADE;
DROP FUNCTION IF EXISTS create_audit_log CASCADE;
DROP FUNCTION IF EXISTS set_lease_number CASCADE;
DROP FUNCTION IF EXISTS check_payment_late_fee CASCADE;
```

## Troubleshooting

### Error: "extension does not exist"
- Make sure you run `20260103000001_enable_extensions.sql` first

### Error: "relation does not exist"
- Check that you're running migrations in the correct order
- Verify previous migrations completed successfully

### Error: "permission denied"
- Make sure you're using the service role key or have sufficient permissions
- Check that RLS policies allow the operation

### Error: "function does not exist"
- Ensure `20260103000014_create_functions.sql` was run before triggers
- Check function names match exactly in trigger definitions

## Database Schema Overview

```
users (landlords, tenants, agents, admins)
  ├── properties (rental properties)
  │     ├── leases (lease agreements)
  │     │     ├── payments (rent, deposits, fees)
  │     │     ├── documents (lease documents)
  │     │     ├── signature_requests (e-signatures)
  │     │     └── payment_schedules (recurring payments)
  │     └── maintenance_requests (property maintenance)
  ├── messages (user communication)
  ├── notifications (system alerts)
  ├── user_preferences (user settings)
  └── audit_logs (activity tracking)
```

## Next Steps

After migrations are complete:

1. ✅ Run connection test: `node scripts/test-supabase-connection.mjs`
2. ✅ Verify all 16 tests pass
3. ✅ Begin Phase 1 implementation (replace localStorage with Supabase)
4. ✅ Implement Stripe payment integration
5. ✅ Implement SendGrid email notifications
6. ✅ Implement Twilio SMS notifications

## Support

For issues or questions:
- Check the database schema design: `/workspace/shadcn-ui/docs/database_schema_design.md`
- Review Phase 1 plan: `/workspace/shadcn-ui/PHASED_RESOLUTION_PLAN.md`
- Contact the development team

---

**Created:** 2026-01-03  
**Author:** David (Data Analyst)  
**Based on schema by:** Bob (Software Architect)