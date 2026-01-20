-- ==========================================
-- Property Actions Database Schema
-- Tables: contact_messages, viewing_schedules, rental_applications
-- ==========================================

BEGIN;

-- ==========================================
-- 1. CONTACT MESSAGES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_messages_property ON contact_messages(property_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_user ON contact_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_landlord ON contact_messages(landlord_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own messages"
  ON contact_messages FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = landlord_id);

CREATE POLICY "Users can insert their own messages"
  ON contact_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Landlords can view messages for their properties"
  ON contact_messages FOR SELECT
  USING (auth.uid() = landlord_id);

-- ==========================================
-- 2. VIEWING SCHEDULES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS viewing_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewing_date DATE NOT NULL,
  viewing_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_viewing_schedules_property ON viewing_schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_viewing_schedules_user ON viewing_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_viewing_schedules_landlord ON viewing_schedules(landlord_id);
CREATE INDEX IF NOT EXISTS idx_viewing_schedules_date ON viewing_schedules(viewing_date);
CREATE INDEX IF NOT EXISTS idx_viewing_schedules_status ON viewing_schedules(status);

-- Enable Row Level Security
ALTER TABLE viewing_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own viewings"
  ON viewing_schedules FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = landlord_id);

CREATE POLICY "Users can insert their own viewings"
  ON viewing_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Landlords can update viewing status"
  ON viewing_schedules FOR UPDATE
  USING (auth.uid() = landlord_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_viewing_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_viewing_schedules_updated_at
  BEFORE UPDATE ON viewing_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_viewing_schedules_updated_at();

-- ==========================================
-- 3. RENTAL APPLICATIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS rental_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
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
  monthly_income NUMERIC(10, 2) NOT NULL,
  
  -- References
  reference1_name TEXT NOT NULL,
  reference1_phone TEXT NOT NULL,
  reference2_name TEXT,
  reference2_phone TEXT,
  
  -- Additional
  pets BOOLEAN DEFAULT FALSE,
  pet_description TEXT,
  additional_info TEXT,
  background_check_consent BOOLEAN NOT NULL DEFAULT FALSE,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rental_applications_property ON rental_applications(property_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_user ON rental_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_landlord ON rental_applications(landlord_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_status ON rental_applications(status);
CREATE INDEX IF NOT EXISTS idx_rental_applications_created ON rental_applications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own applications"
  ON rental_applications FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = landlord_id);

CREATE POLICY "Users can insert their own applications"
  ON rental_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Landlords can update application status"
  ON rental_applications FOR UPDATE
  USING (auth.uid() = landlord_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_rental_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_rental_applications_updated_at
  BEFORE UPDATE ON rental_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_rental_applications_updated_at();

COMMIT;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contact_messages', 'viewing_schedules', 'rental_applications');

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('contact_messages', 'viewing_schedules', 'rental_applications');

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('contact_messages', 'viewing_schedules', 'rental_applications');