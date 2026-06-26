-- Document Management Enhancement Migration
-- This migration adds support for folders, version control, templates, and sharing

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Document Folders Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  landlord_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_folder_name_per_parent UNIQUE (name, parent_id, landlord_id)
);

-- Index for faster folder queries
CREATE INDEX IF NOT EXISTS idx_folders_landlord ON document_folders(landlord_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON document_folders(parent_id);

-- ============================================================================
-- 2. Document Versions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES users(id) NOT NULL,
  change_description TEXT,
  checksum TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
);

-- Index for faster version queries
CREATE INDEX IF NOT EXISTS idx_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_versions_uploaded_by ON document_versions(uploaded_by);

-- ============================================================================
-- 3. Document Templates Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  landlord_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for faster template queries
CREATE INDEX IF NOT EXISTS idx_templates_landlord ON document_templates(landlord_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_public ON document_templates(is_public) WHERE is_public = true;

-- ============================================================================
-- 4. Document Shares Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_by_user_id UUID REFERENCES users(id) NOT NULL,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'download', 'comment', 'edit')),
  share_link TEXT UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  last_downloaded_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for faster share queries
CREATE INDEX IF NOT EXISTS idx_shares_document ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_shares_user ON document_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_shares_link ON document_shares(share_link) WHERE share_link IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shares_active ON document_shares(is_active) WHERE is_active = true;

-- ============================================================================
-- 5. Document Activity Log Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('upload', 'view', 'download', 'edit', 'delete', 'share', 'move', 'rename', 'restore')),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for faster activity queries
CREATE INDEX IF NOT EXISTS idx_activity_document ON document_activity_log(document_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON document_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON document_activity_log(created_at DESC);

-- ============================================================================
-- 6. Update Documents Table
-- ============================================================================
-- Add new columns to existing documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS checksum TEXT;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_starred ON documents(is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);

-- ============================================================================
-- 7. Triggers for Updated At
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_document_folders_updated_at ON document_folders;
CREATE TRIGGER update_document_folders_updated_at
  BEFORE UPDATE ON document_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_templates_updated_at ON document_templates;
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_shares_updated_at ON document_shares;
CREATE TRIGGER update_document_shares_updated_at
  BEFORE UPDATE ON document_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_activity_log ENABLE ROW LEVEL SECURITY;

-- Folders: Users can only see their own folders
CREATE POLICY "Users can view their own folders"
  ON document_folders FOR SELECT
  USING (auth.uid() = landlord_id);

CREATE POLICY "Users can create their own folders"
  ON document_folders FOR INSERT
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Users can update their own folders"
  ON document_folders FOR UPDATE
  USING (auth.uid() = landlord_id);

CREATE POLICY "Users can delete their own folders"
  ON document_folders FOR DELETE
  USING (auth.uid() = landlord_id);

-- Versions: Users can see versions of documents they own
CREATE POLICY "Users can view versions of their documents"
  ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Users can create versions for their documents"
  ON document_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete versions of their documents"
  ON document_versions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

-- Templates: Users can see public templates and their own templates
CREATE POLICY "Users can view public and own templates"
  ON document_templates FOR SELECT
  USING (is_public = true OR landlord_id = auth.uid() OR landlord_id IS NULL);

CREATE POLICY "Users can create their own templates"
  ON document_templates FOR INSERT
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON document_templates FOR UPDATE
  USING (landlord_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON document_templates FOR DELETE
  USING (landlord_id = auth.uid());

-- Shares: Users can see shares they created or received
CREATE POLICY "Users can view shares they created or received"
  ON document_shares FOR SELECT
  USING (
    shared_by_user_id = auth.uid() OR 
    shared_with_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_shares.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Users can create shares for their documents"
  ON document_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_shares.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Users can update shares they created"
  ON document_shares FOR UPDATE
  USING (shared_by_user_id = auth.uid());

CREATE POLICY "Users can delete shares they created"
  ON document_shares FOR DELETE
  USING (shared_by_user_id = auth.uid());

-- Activity Log: Users can view activity for their documents
CREATE POLICY "Users can view activity for their documents"
  ON document_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_activity_log.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "System can insert activity logs"
  ON document_activity_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 9. Insert System Templates
-- ============================================================================
INSERT INTO document_templates (name, category, description, content, variables, is_public, is_system)
VALUES
  (
    'Residential Lease Agreement',
    'Leases',
    'Standard residential lease agreement template',
    'RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on {{lease_start_date}} between:

LANDLORD: {{landlord_name}}
Address: {{landlord_address}}
Phone: {{landlord_phone}}
Email: {{landlord_email}}

TENANT: {{tenant_name}}
Phone: {{tenant_phone}}
Email: {{tenant_email}}

PROPERTY ADDRESS: {{property_address}}

1. TERM: This lease shall commence on {{lease_start_date}} and end on {{lease_end_date}}.

2. RENT: Tenant agrees to pay ${{monthly_rent}} per month, due on the {{rent_due_day}} of each month.

3. SECURITY DEPOSIT: Tenant has paid a security deposit of ${{security_deposit}}.

4. UTILITIES: {{utilities_responsibility}}

5. MAINTENANCE: {{maintenance_terms}}

6. PETS: {{pet_policy}}

7. TERMINATION: {{termination_terms}}

LANDLORD SIGNATURE: ___________________ DATE: ___________

TENANT SIGNATURE: ___________________ DATE: ___________',
    '["landlord_name", "landlord_address", "landlord_phone", "landlord_email", "tenant_name", "tenant_phone", "tenant_email", "property_address", "lease_start_date", "lease_end_date", "monthly_rent", "rent_due_day", "security_deposit", "utilities_responsibility", "maintenance_terms", "pet_policy", "termination_terms"]'::jsonb,
    true,
    true
  ),
  (
    'Lease Renewal Notice',
    'Notices',
    'Notice to tenant about lease renewal options',
    'LEASE RENEWAL NOTICE

Date: {{current_date}}

To: {{tenant_name}}
Property: {{property_address}}

Dear {{tenant_name}},

This letter serves as notification that your current lease agreement for the property located at {{property_address}} will expire on {{lease_end_date}}.

We would like to offer you the opportunity to renew your lease under the following terms:

New Lease Term: {{new_lease_start_date}} to {{new_lease_end_date}}
Monthly Rent: ${{new_monthly_rent}}
Security Deposit: ${{security_deposit}}

Please respond by {{response_deadline}} to confirm your intention to renew. If we do not hear from you by this date, we will assume you do not wish to renew and will begin marketing the property.

If you have any questions, please contact us at {{landlord_phone}} or {{landlord_email}}.

Sincerely,
{{landlord_name}}',
    '["current_date", "tenant_name", "property_address", "lease_end_date", "new_lease_start_date", "new_lease_end_date", "new_monthly_rent", "security_deposit", "response_deadline", "landlord_phone", "landlord_email", "landlord_name"]'::jsonb,
    true,
    true
  ),
  (
    'Rent Increase Notice',
    'Notices',
    'Notice to tenant about rent increase',
    'RENT INCREASE NOTICE

Date: {{current_date}}

To: {{tenant_name}}
Property: {{property_address}}

Dear {{tenant_name}},

This letter is to inform you that the monthly rent for the property located at {{property_address}} will be increased effective {{increase_effective_date}}.

Current Monthly Rent: ${{current_rent}}
New Monthly Rent: ${{new_rent}}
Increase Amount: ${{increase_amount}}

This increase is in accordance with your lease agreement and local regulations. The new rent amount will be due on {{rent_due_day}} of each month, beginning {{first_payment_date}}.

If you have any questions or concerns, please contact us at {{landlord_phone}} or {{landlord_email}}.

Sincerely,
{{landlord_name}}',
    '["current_date", "tenant_name", "property_address", "increase_effective_date", "current_rent", "new_rent", "increase_amount", "rent_due_day", "first_payment_date", "landlord_phone", "landlord_email", "landlord_name"]'::jsonb,
    true,
    true
  ),
  (
    'Late Rent Notice',
    'Notices',
    'Notice to tenant about late rent payment',
    'LATE RENT NOTICE

Date: {{current_date}}

To: {{tenant_name}}
Property: {{property_address}}

Dear {{tenant_name}},

This letter is to inform you that your rent payment for {{payment_month}} in the amount of ${{rent_amount}} was due on {{due_date}} and has not been received.

Outstanding Balance: ${{outstanding_balance}}
Late Fee: ${{late_fee}}
Total Amount Due: ${{total_due}}

Please remit payment immediately to avoid further action. Payment can be made via {{payment_methods}}.

If payment is not received by {{final_deadline}}, we will be forced to begin eviction proceedings as outlined in your lease agreement.

If you are experiencing financial difficulties, please contact us immediately at {{landlord_phone}} to discuss payment arrangements.

Sincerely,
{{landlord_name}}',
    '["current_date", "tenant_name", "property_address", "payment_month", "rent_amount", "due_date", "outstanding_balance", "late_fee", "total_due", "payment_methods", "final_deadline", "landlord_phone", "landlord_name"]'::jsonb,
    true,
    true
  ),
  (
    'Move-In Checklist',
    'Forms',
    'Property condition checklist for move-in',
    'MOVE-IN INSPECTION CHECKLIST

Property: {{property_address}}
Tenant: {{tenant_name}}
Move-In Date: {{move_in_date}}
Inspector: {{inspector_name}}

Instructions: Please inspect each area and note the condition. Use the following ratings:
E = Excellent, G = Good, F = Fair, P = Poor, N/A = Not Applicable

LIVING ROOM
□ Walls/Paint: _____ Notes: _____________________
□ Flooring: _____ Notes: _____________________
□ Windows: _____ Notes: _____________________
□ Doors: _____ Notes: _____________________
□ Light Fixtures: _____ Notes: _____________________
□ Outlets/Switches: _____ Notes: _____________________

KITCHEN
□ Walls/Paint: _____ Notes: _____________________
□ Flooring: _____ Notes: _____________________
□ Cabinets: _____ Notes: _____________________
□ Countertops: _____ Notes: _____________________
□ Sink/Faucet: _____ Notes: _____________________
□ Appliances: _____ Notes: _____________________
□ Refrigerator: _____ Notes: _____________________
□ Stove/Oven: _____ Notes: _____________________
□ Dishwasher: _____ Notes: _____________________

BEDROOM(S)
□ Walls/Paint: _____ Notes: _____________________
□ Flooring: _____ Notes: _____________________
□ Closets: _____ Notes: _____________________
□ Windows: _____ Notes: _____________________
□ Doors: _____ Notes: _____________________

BATHROOM(S)
□ Walls/Paint: _____ Notes: _____________________
□ Flooring: _____ Notes: _____________________
□ Toilet: _____ Notes: _____________________
□ Sink/Faucet: _____ Notes: _____________________
□ Shower/Tub: _____ Notes: _____________________
□ Cabinets: _____ Notes: _____________________

ADDITIONAL NOTES:
_________________________________________________
_________________________________________________

TENANT SIGNATURE: ___________________ DATE: ___________
LANDLORD SIGNATURE: ___________________ DATE: ___________',
    '["property_address", "tenant_name", "move_in_date", "inspector_name"]'::jsonb,
    true,
    true
  ),
  (
    'Move-Out Checklist',
    'Forms',
    'Property condition checklist for move-out',
    'MOVE-OUT INSPECTION CHECKLIST

Property: {{property_address}}
Tenant: {{tenant_name}}
Move-Out Date: {{move_out_date}}
Inspector: {{inspector_name}}

Instructions: Please inspect each area and note any damage or issues.

GENERAL CLEANING
□ All rooms swept/vacuumed
□ All rooms mopped (if applicable)
□ Windows cleaned
□ Blinds/curtains cleaned
□ Light fixtures cleaned
□ Walls wiped down
□ Baseboards cleaned

KITCHEN
□ Refrigerator cleaned inside/out
□ Stove/oven cleaned
□ Microwave cleaned
□ Cabinets cleaned inside/out
□ Countertops cleaned
□ Sink cleaned
□ Floors cleaned

BATHROOM(S)
□ Toilet cleaned
□ Sink cleaned
□ Shower/tub cleaned
□ Mirror cleaned
□ Cabinets cleaned
□ Floors cleaned

DAMAGE ASSESSMENT
Item: _____________ Condition: _____________ Repair Cost: $_______
Item: _____________ Condition: _____________ Repair Cost: $_______
Item: _____________ Condition: _____________ Repair Cost: $_______

SECURITY DEPOSIT DEDUCTIONS
Cleaning: $_______
Repairs: $_______
Unpaid Rent: $_______
Other: $_______
Total Deductions: $_______

Security Deposit Held: ${{security_deposit}}
Amount to be Returned: $_______

TENANT SIGNATURE: ___________________ DATE: ___________
LANDLORD SIGNATURE: ___________________ DATE: ___________',
    '["property_address", "tenant_name", "move_out_date", "inspector_name", "security_deposit"]'::jsonb,
    true,
    true
  ),
  (
    'Maintenance Request Form',
    'Forms',
    'Form for tenants to submit maintenance requests',
    'MAINTENANCE REQUEST FORM

Date: {{current_date}}
Property: {{property_address}}
Tenant: {{tenant_name}}
Phone: {{tenant_phone}}
Email: {{tenant_email}}

ISSUE DESCRIPTION:
Please describe the maintenance issue in detail:
_________________________________________________
_________________________________________________
_________________________________________________

LOCATION:
Where is the problem located? (e.g., kitchen, bathroom, bedroom)
_________________________________________________

URGENCY:
□ Emergency (immediate attention required)
□ Urgent (within 24 hours)
□ Normal (within 3-5 days)
□ Low Priority (can wait)

PREFERRED ACCESS TIME:
When can we access the property for repairs?
_________________________________________________

PHOTOS:
Have you attached photos of the issue? □ Yes □ No

ADDITIONAL NOTES:
_________________________________________________
_________________________________________________

TENANT SIGNATURE: ___________________ DATE: ___________

---FOR OFFICE USE ONLY---
Request ID: _____________
Assigned To: _____________
Status: _____________
Completion Date: _____________',
    '["current_date", "property_address", "tenant_name", "tenant_phone", "tenant_email"]'::jsonb,
    true,
    true
  ),
  (
    'Eviction Notice',
    'Notices',
    'Formal eviction notice to tenant',
    'NOTICE TO VACATE / EVICTION NOTICE

Date: {{current_date}}

To: {{tenant_name}}
Property: {{property_address}}

Dear {{tenant_name}},

This letter serves as formal notice that you are required to vacate the premises located at {{property_address}} by {{vacate_date}}.

REASON FOR EVICTION:
{{eviction_reason}}

OUTSTANDING AMOUNTS:
Unpaid Rent: ${{unpaid_rent}}
Late Fees: ${{late_fees}}
Other Charges: ${{other_charges}}
Total Amount Due: ${{total_due}}

You have {{notice_days}} days from the date of this notice to either:
1. Pay all outstanding amounts and cure any lease violations, OR
2. Vacate the premises and return all keys

If you fail to comply with this notice, we will be forced to file an eviction lawsuit with the court.

IMPORTANT: This is a legal notice. If you have questions about your rights, please consult with an attorney or contact your local tenant rights organization.

For questions or to arrange payment, contact:
{{landlord_name}}
Phone: {{landlord_phone}}
Email: {{landlord_email}}

Sincerely,
{{landlord_name}}

PROOF OF SERVICE:
Delivered by: _____________ Date: _____________ Method: _____________',
    '["current_date", "tenant_name", "property_address", "vacate_date", "eviction_reason", "unpaid_rent", "late_fees", "other_charges", "total_due", "notice_days", "landlord_name", "landlord_phone", "landlord_email"]'::jsonb,
    true,
    true
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. Functions for Analytics
-- ============================================================================

-- Function to calculate folder size
CREATE OR REPLACE FUNCTION calculate_folder_size(folder_uuid UUID)
RETURNS BIGINT AS $$
DECLARE
  total_size BIGINT;
BEGIN
  SELECT COALESCE(SUM(file_size), 0)
  INTO total_size
  FROM documents
  WHERE folder_id = folder_uuid;
  
  RETURN total_size;
END;
$$ LANGUAGE plpgsql;

-- Function to get storage usage by category
CREATE OR REPLACE FUNCTION get_storage_by_category(landlord_uuid UUID)
RETURNS TABLE(category TEXT, total_size BIGINT, document_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.category,
    COALESCE(SUM(d.file_size), 0) as total_size,
    COUNT(d.id) as document_count
  FROM documents d
  WHERE d.uploaded_by = landlord_uuid
  GROUP BY d.category;
END;
$$ LANGUAGE plpgsql;

COMMIT;