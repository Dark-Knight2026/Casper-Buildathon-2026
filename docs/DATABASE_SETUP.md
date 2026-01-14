# Database Setup Guide

This guide provides SQL scripts to set up the required database tables for the authentication and favorites features.

## Prerequisites

1. Access to Supabase Dashboard
2. SQL Editor access in Supabase
3. Project already created in Supabase

---

## Part 1: Favorites Table

Run this SQL in Supabase SQL Editor:

```sql
-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Create index for performance
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_property_id ON favorites(property_id);

-- Enable Row Level Security
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Part 2: User Profiles Table

Run this SQL in Supabase SQL Editor:

```sql
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Part 3: OAuth Configuration

### Google OAuth Setup

1. **Go to Supabase Dashboard**
   - Navigate to: Authentication → Providers
   - Find "Google" in the list

2. **Enable Google Provider**
   - Toggle "Enable Google provider" to ON

3. **Get Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret

4. **Configure in Supabase**
   - Paste Client ID and Client Secret in Supabase
   - Save changes

### GitHub OAuth Setup

1. **Go to Supabase Dashboard**
   - Navigate to: Authentication → Providers
   - Find "GitHub" in the list

2. **Enable GitHub Provider**
   - Toggle "Enable GitHub provider" to ON

3. **Get GitHub OAuth Credentials**
   - Go to [GitHub Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Application name: Your app name
   - Homepage URL: Your app URL
   - Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`
   - Click "Register application"
   - Copy Client ID and generate Client Secret

4. **Configure in Supabase**
   - Paste Client ID and Client Secret in Supabase
   - Save changes

---

## Verification Steps

### 1. Check Tables Created

Run this query to verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('favorites', 'user_profiles');
```

Expected output: 2 rows (favorites, user_profiles)

### 2. Check RLS Policies

Run this query to verify RLS policies:

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('favorites', 'user_profiles');
```

Expected output: 6 policies total (3 for favorites, 3 for user_profiles)

### 3. Test OAuth Providers

1. Go to Supabase Dashboard → Authentication → Providers
2. Verify Google and GitHub show as "Enabled"
3. Check that redirect URLs are correct

---

## Troubleshooting

### Issue: "relation does not exist"
**Solution:** Make sure you ran the SQL scripts in the correct order and in the Supabase SQL Editor.

### Issue: "permission denied for table"
**Solution:** Check that RLS policies are created correctly. Run the verification query above.

### Issue: OAuth redirect not working
**Solution:** 
1. Verify redirect URL in OAuth provider settings matches Supabase callback URL
2. Check that provider is enabled in Supabase Dashboard
3. Ensure Client ID and Secret are correct

### Issue: "duplicate key value violates unique constraint"
**Solution:** This is expected if you try to create the same table twice. You can ignore this or drop the table first:

```sql
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
```

Then re-run the creation scripts.

---

## Next Steps

After completing database setup:

1. ✅ Update `.env` file with Supabase credentials
2. ✅ Test OAuth login in your application
3. ✅ Test favorites functionality
4. ✅ Test profile completion flow

---

## Security Notes

1. **Never commit OAuth secrets to version control**
2. **Always use environment variables for sensitive data**
3. **RLS policies are critical** - they prevent users from accessing other users' data
4. **Test RLS policies** - try accessing another user's data to verify policies work

---

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs
2. Check browser console for errors
3. Verify environment variables are loaded correctly
4. Test API calls in Supabase API docs

---

**Last Updated:** 2026-01-06
**Version:** 1.0.0