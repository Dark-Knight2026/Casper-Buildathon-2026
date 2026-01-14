-- Create vendor_profiles table for maintenance vendors
CREATE TABLE IF NOT EXISTS public.app_25a44123a6_vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  specialty VARCHAR(100)[] NOT NULL, -- Array of specialties
  service_area VARCHAR(100)[] NOT NULL, -- Array of service areas
  license_number VARCHAR(100),
  insurance_provider VARCHAR(255),
  insurance_policy_number VARCHAR(100),
  insurance_expiry_date DATE,
  hourly_rate DECIMAL(10, 2),
  availability_status VARCHAR(50) DEFAULT 'available',
  rating DECIMAL(3, 2) DEFAULT 0.00,
  total_jobs_completed INTEGER DEFAULT 0,
  response_time_hours INTEGER,
  notes TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_availability CHECK (availability_status IN ('available', 'busy', 'unavailable')),
  CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5),
  CONSTRAINT valid_hourly_rate CHECK (hourly_rate >= 0 OR hourly_rate IS NULL)
);

-- Create indexes
CREATE INDEX idx_vendor_profiles_user_id ON public.app_25a44123a6_vendor_profiles(user_id);
CREATE INDEX idx_vendor_profiles_specialty ON public.app_25a44123a6_vendor_profiles USING GIN(specialty);
CREATE INDEX idx_vendor_profiles_service_area ON public.app_25a44123a6_vendor_profiles USING GIN(service_area);
CREATE INDEX idx_vendor_profiles_availability ON public.app_25a44123a6_vendor_profiles(availability_status);
CREATE INDEX idx_vendor_profiles_rating ON public.app_25a44123a6_vendor_profiles(rating DESC);

-- Enable RLS
ALTER TABLE public.app_25a44123a6_vendor_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view verified vendor profiles"
  ON public.app_25a44123a6_vendor_profiles
  FOR SELECT
  USING (is_verified = true);

CREATE POLICY "Vendors can view their own profile"
  ON public.app_25a44123a6_vendor_profiles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Vendors can create their own profile"
  ON public.app_25a44123a6_vendor_profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Vendors can update their own profile"
  ON public.app_25a44123a6_vendor_profiles
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER vendor_profiles_updated_at
  BEFORE UPDATE ON public.app_25a44123a6_vendor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.app_25a44123a6_vendor_profiles IS 'Profiles for maintenance service vendors';