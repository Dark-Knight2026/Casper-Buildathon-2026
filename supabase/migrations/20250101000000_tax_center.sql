-- Create Tax Categories Table (Lookup)
CREATE TABLE IF NOT EXISTS tax_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('INCOME', 'EXPENSE')) NOT NULL,
  schedule_e_line VARCHAR(10),
  description TEXT,
  is_deductible BOOLEAN DEFAULT true
);

-- Seed Standard Tax Categories
INSERT INTO tax_categories (id, name, type, schedule_e_line, description) VALUES
('INC_RENT', 'Rents Received', 'INCOME', '3', 'Gross rent including subsidies'),
('EXP_ADVERT', 'Advertising', 'EXPENSE', '5', 'Ads for vacancies'),
('EXP_AUTO', 'Auto and Travel', 'EXPENSE', '6', 'Mileage or actual expenses'),
('EXP_CLEAN', 'Cleaning & Maintenance', 'EXPENSE', '7', 'Cleaning services, landscaping'),
('EXP_COMM', 'Commissions', 'EXPENSE', '8', 'Agent/Broker fees'),
('EXP_INSUR', 'Insurance', 'EXPENSE', '9', 'Property hazard/liability insurance'),
('EXP_LEGAL', 'Legal & Prof. Fees', 'EXPENSE', '10', 'Attorney, Accountant fees'),
('EXP_MGMT', 'Management Fees', 'EXPENSE', '11', 'Property manager fees'),
('EXP_MORT_INT', 'Mortgage Interest', 'EXPENSE', '12', 'Interest paid to banks'),
('EXP_OTHER_INT', 'Other Interest', 'EXPENSE', '13', 'Credit card interest for business'),
('EXP_REPAIR', 'Repairs', 'EXPENSE', '14', 'Plumbing, electrical fixes'),
('EXP_SUPPLY', 'Supplies', 'EXPENSE', '15', 'Office supplies, hardware'),
('EXP_TAXES', 'Taxes', 'EXPENSE', '16', 'Property taxes, local licenses'),
('EXP_UTIL', 'Utilities', 'EXPENSE', '17', 'Water, gas, electric paid by landlord'),
('EXP_DEPR', 'Depreciation', 'EXPENSE', '18', 'Calculated expense (non-cash)'),
('EXP_OTHER', 'Other Expenses', 'EXPENSE', '19', 'HOA fees, etc.')
ON CONFLICT (id) DO NOTHING;

-- Create Property Tax Profiles
CREATE TABLE IF NOT EXISTS property_tax_profiles (
  property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  cost_basis DECIMAL(12,2),
  land_value DECIMAL(12,2),
  placed_in_service_date DATE,
  depreciation_method VARCHAR(50) DEFAULT 'SL_27_5', -- Straight Line 27.5 years
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Capital Assets (Improvements/Assets for Depreciation)
CREATE TABLE IF NOT EXISTS capital_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  cost DECIMAL(12,2) NOT NULL,
  date_acquired DATE NOT NULL,
  useful_life_years DECIMAL(4,1) NOT NULL, -- e.g., 5.0, 27.5
  date_placed_in_service DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Tax Documents Metadata
CREATE TABLE IF NOT EXISTS tax_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  document_type VARCHAR(50) NOT NULL, -- 'schedule-e', '1099-misc', etc.
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'ready', 'filed'
  file_url TEXT,
  metadata JSONB, -- Store generated data summary here
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies

-- Tax Categories: Readable by everyone (authenticated), Modifiable only by admins (we'll assume service role for seeding)
ALTER TABLE tax_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON tax_categories FOR SELECT TO authenticated USING (true);

-- Property Tax Profiles: Users can manage their own properties' profiles
ALTER TABLE property_tax_profiles ENABLE ROW LEVEL SECURITY;
-- Assuming properties table has owner_id or similar. If not, we rely on the join.
-- For simplicity in this migration, we assume the user has access if they have access to the property.
-- A more robust policy would check property ownership.
CREATE POLICY "Users can view own property tax profiles" ON property_tax_profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM properties p WHERE p.id = property_tax_profiles.property_id AND p.owner_id = auth.uid())
);
CREATE POLICY "Users can update own property tax profiles" ON property_tax_profiles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM properties p WHERE p.id = property_tax_profiles.property_id AND p.owner_id = auth.uid())
);
CREATE POLICY "Users can insert own property tax profiles" ON property_tax_profiles FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM properties p WHERE p.id = property_tax_profiles.property_id AND p.owner_id = auth.uid())
);

-- Capital Assets
ALTER TABLE capital_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own capital assets" ON capital_assets FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM properties p WHERE p.id = capital_assets.property_id AND p.owner_id = auth.uid())
);

-- Tax Documents
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tax documents" ON tax_documents FOR ALL TO authenticated USING (landlord_id = auth.uid());