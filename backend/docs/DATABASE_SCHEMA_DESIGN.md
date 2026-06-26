# Database Schema Design - Profiles Table

**Document Version:** 1.0  
**Last Updated:** 2026-01-06  
**Author:** Bob (Architect)

---

## Overview

This document outlines the complete database schema design for the `profiles` table, which stores user profile information for the property management platform. The schema supports multiple user roles (tenant, landlord, agent, broker, buyer, seller) and integrates with Supabase Authentication.

---

## Table Structure: `profiles`

### Purpose
The `profiles` table stores extended user information beyond what Supabase Auth provides. It links to the `auth.users` table via the `id` field and stores role-specific data.

### Schema Definition

| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | UUID | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | - | User ID from Supabase Auth |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | - | User's email address (synced with auth.users) |
| `role` | VARCHAR(50) | NOT NULL, CHECK (role IN ('tenant', 'landlord', 'agent', 'broker', 'buyer', 'seller')) | 'tenant' | User's primary role in the system |
| `full_name` | VARCHAR(255) | NULL | - | User's full name |
| `phone` | VARCHAR(20) | NULL | - | User's phone number |
| `avatar_url` | TEXT | NULL | - | URL to user's profile picture |
| `bio` | TEXT | NULL | - | User's biography or description |
| `address` | TEXT | NULL | - | User's address |
| `city` | VARCHAR(100) | NULL | - | User's city |
| `state` | VARCHAR(50) | NULL | - | User's state/province |
| `zip_code` | VARCHAR(20) | NULL | - | User's postal/zip code |
| `country` | VARCHAR(100) | NULL | 'United States' | User's country |
| `date_of_birth` | DATE | NULL | - | User's date of birth |
| `profile_completed` | BOOLEAN | NOT NULL | FALSE | Whether user has completed their profile |
| `email_verified` | BOOLEAN | NOT NULL | FALSE | Whether email has been verified |
| `phone_verified` | BOOLEAN | NOT NULL | FALSE | Whether phone has been verified |
| `is_active` | BOOLEAN | NOT NULL | TRUE | Whether the account is active |
| `last_login_at` | TIMESTAMPTZ | NULL | - | Last login timestamp |
| `preferences` | JSONB | NULL | '{}' | User preferences (notifications, theme, etc.) |
| `metadata` | JSONB | NULL | '{}' | Additional role-specific metadata |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Timestamp when profile was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | Timestamp when profile was last updated |

---

## Schema Decisions & Rationale

### 1. **Primary Key: `id` (UUID)**
- **Why:** Links directly to Supabase Auth's `auth.users.id`
- **Benefit:** Ensures referential integrity and simplifies joins
- **Constraint:** ON DELETE CASCADE ensures profile is deleted when auth user is deleted

### 2. **Email Field (VARCHAR, UNIQUE)**
- **Why:** Denormalized from auth.users for quick access
- **Benefit:** Avoids joins when displaying user email
- **Constraint:** UNIQUE ensures no duplicate emails

### 3. **Role Field (VARCHAR with CHECK constraint)**
- **Why:** Supports 6 different user types
- **Benefit:** Enables role-based access control (RBAC)
- **Constraint:** CHECK constraint ensures only valid roles
- **Valid Roles:** tenant, landlord, agent, broker, buyer, seller

### 4. **Profile Completion Fields**
- **profile_completed:** Tracks if user has filled required fields
- **email_verified:** Synced with Supabase Auth email verification
- **phone_verified:** Tracks phone number verification status
- **Benefit:** Enables progressive profile completion UX

### 5. **JSONB Fields (preferences, metadata)**
- **Why:** Flexible storage for role-specific or dynamic data
- **Benefit:** Avoids schema changes for new features
- **Use Cases:**
  - `preferences`: UI theme, notification settings, language
  - `metadata`: Role-specific data (e.g., landlord's company info)

### 6. **Timestamps (created_at, updated_at)**
- **Why:** Audit trail and data tracking
- **Benefit:** Enables analytics and debugging
- **Auto-update:** Trigger ensures updated_at is always current

### 7. **Soft Delete Support (is_active)**
- **Why:** Allows account deactivation without data loss
- **Benefit:** Users can reactivate accounts
- **Alternative:** Could use deleted_at timestamp for soft deletes

---

## Indexes for Performance

### Primary Index
```sql
PRIMARY KEY (id)
```
- **Purpose:** Fast lookups by user ID
- **Usage:** Most common query pattern

### Secondary Indexes

#### 1. Email Index
```sql
CREATE UNIQUE INDEX idx_profiles_email ON profiles(email);
```
- **Purpose:** Fast lookups by email
- **Usage:** Login, user search
- **Type:** UNIQUE to enforce constraint

#### 2. Role Index
```sql
CREATE INDEX idx_profiles_role ON profiles(role);
```
- **Purpose:** Fast filtering by role
- **Usage:** Admin dashboards, role-based queries
- **Benefit:** Improves queries like "SELECT * FROM profiles WHERE role = 'landlord'"

#### 3. Active Users Index
```sql
CREATE INDEX idx_profiles_is_active ON profiles(is_active) WHERE is_active = TRUE;
```
- **Purpose:** Fast filtering of active users
- **Usage:** Most queries should only include active users
- **Type:** Partial index (only indexes TRUE values)

#### 4. Email Verification Index
```sql
CREATE INDEX idx_profiles_email_verified ON profiles(email_verified) WHERE email_verified = FALSE;
```
- **Purpose:** Fast identification of unverified users
- **Usage:** Email verification reminders
- **Type:** Partial index (only indexes FALSE values)

#### 5. Composite Index for Role + Active
```sql
CREATE INDEX idx_profiles_role_active ON profiles(role, is_active);
```
- **Purpose:** Fast filtering by role and active status
- **Usage:** Dashboard queries like "active landlords"
- **Benefit:** Covers common query patterns

---

## Row Level Security (RLS) Policies

### Security Model
- **Principle:** Users can only access their own profile data
- **Exception:** Admin users (future) may have broader access
- **Implementation:** PostgreSQL RLS with Supabase Auth integration

### Policy 1: Profile Creation (INSERT)
```sql
CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);
```
- **Purpose:** Allow users to create their own profile during registration
- **Security:** Users cannot create profiles for other users
- **Trigger:** Executed during signup process

### Policy 2: Profile Reading (SELECT)
```sql
CREATE POLICY "Users can read their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);
```
- **Purpose:** Allow users to view their own profile data
- **Security:** Users cannot view other users' profiles
- **Usage:** Profile page, dashboard, settings

### Policy 3: Profile Updating (UPDATE)
```sql
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```
- **Purpose:** Allow users to edit their own profile
- **Security:** Users cannot modify other users' profiles
- **Constraint:** Cannot change their own `id` or `email` (handled by application)

### Policy 4: Profile Deletion (DELETE)
```sql
CREATE POLICY "Users can delete their own profile"
ON profiles FOR DELETE
USING (auth.uid() = id);
```
- **Purpose:** Allow users to delete their own account
- **Security:** Users cannot delete other users' profiles
- **Note:** Triggers CASCADE delete of auth.users record

### Policy 5: Public Profile Reading (Optional - Future)
```sql
-- For public profile pages (landlord listings, agent profiles)
CREATE POLICY "Public profiles are viewable by all authenticated users"
ON profiles FOR SELECT
USING (
  is_active = TRUE 
  AND role IN ('landlord', 'agent', 'broker')
  AND profile_completed = TRUE
);
```
- **Purpose:** Allow viewing of public-facing profiles
- **Security:** Only completed, active profiles of certain roles
- **Usage:** Property listings, agent directories

---

## Triggers

### Auto-Update Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```
- **Purpose:** Automatically update `updated_at` on every UPDATE
- **Benefit:** Ensures accurate audit trail
- **Performance:** Minimal overhead

### Email Sync Trigger (Optional)
```sql
CREATE OR REPLACE FUNCTION sync_email_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email = (SELECT email FROM auth.users WHERE id = NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_profiles_email
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_auth();
```
- **Purpose:** Keep email in sync with auth.users
- **Benefit:** Ensures consistency
- **Note:** May not be needed if application handles this

---

## Performance Optimization Strategies

### 1. **Index Selection Strategy**
- Primary key on `id` for fast lookups
- Unique index on `email` for login queries
- Partial indexes on boolean fields to reduce index size
- Composite index on frequently queried combinations

### 2. **Query Optimization**
```sql
-- Good: Uses index
SELECT * FROM profiles WHERE id = 'user-uuid';

-- Good: Uses email index
SELECT * FROM profiles WHERE email = 'user@example.com';

-- Good: Uses role index
SELECT * FROM profiles WHERE role = 'landlord' AND is_active = TRUE;

-- Bad: Full table scan (avoid)
SELECT * FROM profiles WHERE LOWER(full_name) LIKE '%john%';
```

### 3. **JSONB Indexing (Future)**
If JSONB queries become frequent:
```sql
-- GIN index for JSONB containment queries
CREATE INDEX idx_profiles_preferences ON profiles USING GIN (preferences);
CREATE INDEX idx_profiles_metadata ON profiles USING GIN (metadata);
```

### 4. **Partitioning (Future)**
For large datasets (>10M rows), consider partitioning by role:
```sql
-- Partition by role (future optimization)
CREATE TABLE profiles_tenant PARTITION OF profiles FOR VALUES IN ('tenant');
CREATE TABLE profiles_landlord PARTITION OF profiles FOR VALUES IN ('landlord');
```

---

## Security Considerations

### 1. **RLS Enforcement**
- **Always enable RLS:** `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
- **Test policies thoroughly:** Ensure no data leakage
- **Use auth.uid():** Leverage Supabase's built-in auth context

### 2. **Sensitive Data Protection**
- **Never store passwords:** Handled by Supabase Auth
- **Encrypt PII if needed:** Consider encryption for sensitive fields
- **Audit access:** Log profile access for compliance

### 3. **Input Validation**
- **Application-level validation:** Validate all inputs before INSERT/UPDATE
- **Database constraints:** Use CHECK constraints as last line of defense
- **Sanitize JSONB:** Validate JSON structure before storing

### 4. **Rate Limiting**
- **Implement rate limiting:** Prevent abuse of profile updates
- **Monitor failed attempts:** Track suspicious activity

---

## Migration Strategy

### Initial Setup
1. Create table with all columns
2. Create indexes
3. Enable RLS
4. Create RLS policies
5. Create triggers
6. Test with sample data

### Future Migrations
- **Add columns:** Use `ALTER TABLE ADD COLUMN` with defaults
- **Modify constraints:** Use `ALTER TABLE ALTER COLUMN`
- **Add indexes:** Create concurrently to avoid locking
- **Update policies:** Drop and recreate policies

### Rollback Plan
- Keep backup of production data
- Test migrations in staging first
- Document rollback SQL scripts

---

## Testing Checklist

### Schema Tests
- [ ] Table creation succeeds
- [ ] All constraints are enforced
- [ ] Indexes are created successfully
- [ ] RLS is enabled

### RLS Policy Tests
- [ ] User can create own profile
- [ ] User can read own profile
- [ ] User cannot read other profiles
- [ ] User can update own profile
- [ ] User cannot update other profiles
- [ ] User can delete own profile
- [ ] User cannot delete other profiles

### Performance Tests
- [ ] Profile lookup by ID < 10ms
- [ ] Profile lookup by email < 10ms
- [ ] Role filtering < 50ms
- [ ] Bulk queries < 100ms

### Data Integrity Tests
- [ ] Email uniqueness enforced
- [ ] Role constraint enforced
- [ ] Timestamps auto-update
- [ ] CASCADE delete works

---

## Appendix: Sample Queries

### Create Profile
```sql
INSERT INTO profiles (id, email, role, full_name)
VALUES ('user-uuid', 'user@example.com', 'tenant', 'John Doe');
```

### Read Profile
```sql
SELECT * FROM profiles WHERE id = 'user-uuid';
```

### Update Profile
```sql
UPDATE profiles 
SET full_name = 'Jane Doe', profile_completed = TRUE
WHERE id = 'user-uuid';
```

### Delete Profile
```sql
DELETE FROM profiles WHERE id = 'user-uuid';
```

### Query by Role
```sql
SELECT * FROM profiles 
WHERE role = 'landlord' AND is_active = TRUE
ORDER BY created_at DESC;
```

### Search by Email
```sql
SELECT * FROM profiles WHERE email = 'user@example.com';
```

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)

---

**End of Document**