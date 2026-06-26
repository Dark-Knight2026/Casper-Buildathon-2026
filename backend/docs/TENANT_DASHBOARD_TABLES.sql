-- ==========================================
-- TENANT DASHBOARD DATABASE TABLES
-- ==========================================
-- Created: 2026-01-06
-- Purpose: Database schema for tenant dashboard features
-- Features: Properties, Favorites, Applications, Viewings, Contact Messages
-- ==========================================

BEGIN;

-- ==========================================
-- 1. PROPERTIES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic Information
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house', 'condo', 'townhouse', 'studio', 'other')),
  
  -- Location
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT DEFAULT 'USA',
  
  -- Details
  price DECIMAL(10, 2) NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms DECIMAL(3, 1) NOT NULL,
  square_feet INTEGER,
  
  -- Features
  amenities TEXT[],
  images TEXT[],
  
  -- Availability
  available_from DATE,
  is_available BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS properties_landlord_idx ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS properties_city_idx ON properties(city);
CREATE INDEX IF NOT EXISTS properties_price_idx ON properties(price);
CREATE INDEX IF NOT EXISTS properties_bedrooms_idx ON properties(bedrooms);
CREATE INDEX IF NOT EXISTS properties_available_idx ON properties(is_available);
CREATE INDEX IF NOT EXISTS properties_created_at_idx ON properties(created_at DESC);

-- RLS Policies
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Anyone can view available properties
CREATE POLICY "Anyone can view available properties"
  ON properties FOR SELECT
  USING (is_available = true);

-- Landlords can view all their properties
CREATE POLICY "Landlords can view their properties"
  ON properties FOR SELECT
  USING (auth.uid() = landlord_id);

-- Landlords can insert their properties
CREATE POLICY "Landlords can insert properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = landlord_id);

-- Landlords can update their properties
CREATE POLICY "Landlords can update their properties"
  ON properties FOR UPDATE
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

-- Landlords can delete their properties
CREATE POLICY "Landlords can delete their properties"
  ON properties FOR DELETE
  USING (auth.uid() = landlord_id);

-- ==========================================
-- 2. FAVORITES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique favorite per user per property
  UNIQUE(user_id, property_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS favorites_user_idx ON favorites(user_id);
CREATE INDEX IF NOT EXISTS favorites_property_idx ON favorites(property_id);
CREATE INDEX IF NOT EXISTS favorites_created_at_idx ON favorites(created_at DESC);

-- RLS Policies
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their favorites
CREATE POLICY "Users can view their favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their favorites
CREATE POLICY "Users can remove their favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- 3. RENTAL APPLICATIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS rental_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Personal Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  
  -- Current Address
  current_address TEXT NOT NULL,
  current_city TEXT NOT NULL,
  current_state TEXT NOT NULL,
  current_zip TEXT NOT NULL,
  move_in_date DATE NOT NULL,
  
  -- Employment
  employer TEXT NOT NULL,
  job_title TEXT NOT NULL,
  employment_length TEXT NOT NULL,
  monthly_income DECIMAL(10, 2) NOT NULL,
  
  -- References
  reference1_name TEXT NOT NULL,
  reference1_phone TEXT NOT NULL,
  reference2_name TEXT,
  reference2_phone TEXT,
  
  -- Additional
  pets BOOLEAN DEFAULT false,
  pet_description TEXT,
  additional_info TEXT,
  background_check_consent BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS applications_user_idx ON rental_applications(user_id);
CREATE INDEX IF NOT EXISTS applications_landlord_idx ON rental_applications(landlord_id);
CREATE INDEX IF NOT EXISTS applications_property_idx ON rental_applications(property_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON rental_applications(status);
CREATE INDEX IF NOT EXISTS applications_created_at_idx ON rental_applications(created_at DESC);

-- RLS Policies
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;

-- Tenants can view their applications
CREATE POLICY "Tenants can view their applications"
  ON rental_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Landlords can view applications for their properties
CREATE POLICY "Landlords can view applications for their properties"
  ON rental_applications FOR SELECT
  USING (auth.uid() = landlord_id);

-- Tenants can create applications
CREATE POLICY "Tenants can create applications"
  ON rental_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Landlords can update application status
CREATE POLICY "Landlords can update application status"
  ON rental_applications FOR UPDATE
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

-- ==========================================
-- 4. VIEWING SCHEDULES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS viewing_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Viewing Details
  viewing_date DATE NOT NULL,
  viewing_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS viewings_user_idx ON viewing_schedules(user_id);
CREATE INDEX IF NOT EXISTS viewings_landlord_idx ON viewing_schedules(landlord_id);
CREATE INDEX IF NOT EXISTS viewings_property_idx ON viewing_schedules(property_id);
CREATE INDEX IF NOT EXISTS viewings_date_idx ON viewing_schedules(viewing_date);
CREATE INDEX IF NOT EXISTS viewings_status_idx ON viewing_schedules(status);

-- RLS Policies
ALTER TABLE viewing_schedules ENABLE ROW LEVEL SECURITY;

-- Tenants can view their viewings
CREATE POLICY "Tenants can view their viewings"
  ON viewing_schedules FOR SELECT
  USING (auth.uid() = user_id);

-- Landlords can view viewings for their properties
CREATE POLICY "Landlords can view viewings for their properties"
  ON viewing_schedules FOR SELECT
  USING (auth.uid() = landlord_id);

-- Tenants can create viewings
CREATE POLICY "Tenants can create viewings"
  ON viewing_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Landlords can update viewing status
CREATE POLICY "Landlords can update viewing status"
  ON viewing_schedules FOR UPDATE
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

-- Tenants can cancel their viewings
CREATE POLICY "Tenants can cancel their viewings"
  ON viewing_schedules FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- ==========================================
-- 5. CONTACT MESSAGES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Message Details
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS messages_user_idx ON contact_messages(user_id);
CREATE INDEX IF NOT EXISTS messages_landlord_idx ON contact_messages(landlord_id);
CREATE INDEX IF NOT EXISTS messages_property_idx ON contact_messages(property_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON contact_messages(created_at DESC);

-- RLS Policies
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Tenants can view their messages
CREATE POLICY "Tenants can view their messages"
  ON contact_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Landlords can view messages for their properties
CREATE POLICY "Landlords can view messages for their properties"
  ON contact_messages FOR SELECT
  USING (auth.uid() = landlord_id);

-- Tenants can send messages
CREATE POLICY "Tenants can send messages"
  ON contact_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 6. TRIGGERS FOR UPDATED_AT
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for properties
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for rental_applications
DROP TRIGGER IF EXISTS update_applications_updated_at ON rental_applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON rental_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for viewing_schedules
DROP TRIGGER IF EXISTS update_viewings_updated_at ON viewing_schedules;
CREATE TRIGGER update_viewings_updated_at
  BEFORE UPDATE ON viewing_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check if all tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('properties', 'favorites', 'rental_applications', 'viewing_schedules', 'contact_messages')
ORDER BY table_name;

-- Check RLS is enabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('properties', 'favorites', 'rental_applications', 'viewing_schedules', 'contact_messages')
ORDER BY tablename;

-- Count policies per table
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('properties', 'favorites', 'rental_applications', 'viewing_schedules', 'contact_messages')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ==========================================
-- END OF SQL SCRIPT
-- ==========================================