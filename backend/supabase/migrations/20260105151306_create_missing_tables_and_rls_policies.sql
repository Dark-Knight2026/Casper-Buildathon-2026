-- Migration: Create Missing Database Tables and RLS Policies
-- Version: 1.0.0
-- Date: 2025-01-04
-- Description: Creates all missing tables, foreign keys, indexes, and RLS policies for the Lease Management System

-- =====================================================
-- PART 1: CREATE ENUMS AND TYPES
-- =====================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('tenant', 'landlord', 'agent', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE property_type AS ENUM ('apartment', 'house', 'condo', 'townhouse', 'commercial', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE property_status AS ENUM ('available', 'occupied', 'maintenance', 'unavailable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE maintenance_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;



-- =====================================================
-- Add missing columns to existing tables
-- =====================================================
DO $$ 
BEGIN 
    -- 1. PROPERTIES TABLE
    -- Add is_published if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='is_published') THEN
        ALTER TABLE properties ADD COLUMN is_published BOOLEAN DEFAULT true;
    END IF;

    -- Add is_featured if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='is_featured') THEN
        ALTER TABLE properties ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;

    -- Add view_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='view_count') THEN
        ALTER TABLE properties ADD COLUMN view_count INTEGER DEFAULT 0;
    END IF;

    -- 2. MAINTENANCE_REQUESTS TABLE
    -- Add landlord_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='maintenance_requests' AND column_name='landlord_id') THEN
        ALTER TABLE maintenance_requests ADD COLUMN landlord_id UUID REFERENCES users(id);
    END IF;
    
    -- Add vendor_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='maintenance_requests' AND column_name='vendor_id') THEN
        ALTER TABLE maintenance_requests ADD COLUMN vendor_id UUID REFERENCES users(id);
    END IF;

    -- 3. DOCUMENTS TABLE
    -- Add is_deleted if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='is_deleted') THEN
        ALTER TABLE documents ADD COLUMN is_deleted BOOLEAN DEFAULT false;
    END IF;
END $$;
-- =====================================================
-- PART 2: CREATE MISSING TABLES
-- =====================================================

-- Table 1: Users/Profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'tenant',
    avatar_url TEXT,
    date_of_birth DATE,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- Table 2: Landlords
CREATE TABLE IF NOT EXISTS landlords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT,
    business_license TEXT,
    tax_id TEXT,
    business_address TEXT,
    business_phone TEXT,
    business_email TEXT,
    payment_methods JSONB DEFAULT '[]',
    bank_account_info JSONB,
    properties_count INTEGER DEFAULT 0,
    total_units INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id)
);

-- Table 3: Tenants
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    current_address TEXT,
    employment_status TEXT,
    employer_name TEXT,
    employer_phone TEXT,
    monthly_income DECIMAL(10,2),
    credit_score INTEGER,
    "references" JSONB DEFAULT '[]',
    background_check_status TEXT,
    background_check_date TIMESTAMPTZ,
    move_in_date DATE,
    preferred_contact_method TEXT DEFAULT 'email',
    pet_info JSONB,
    vehicle_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id),
    CHECK (credit_score IS NULL OR (credit_score >= 300 AND credit_score <= 850)),
    CHECK (monthly_income IS NULL OR monthly_income >= 0)
);

-- Table 4: Properties
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    property_name TEXT NOT NULL,
    property_type property_type NOT NULL DEFAULT 'apartment',
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    country TEXT DEFAULT 'USA',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    total_units INTEGER NOT NULL DEFAULT 1,
    available_units INTEGER NOT NULL DEFAULT 0,
    year_built INTEGER,
    square_footage DECIMAL(10,2),
    lot_size DECIMAL(10,2),
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    parking_spaces INTEGER DEFAULT 0,
    amenities JSONB DEFAULT '[]',
    description TEXT,
    images JSONB DEFAULT '[]',
    status property_status DEFAULT 'available',
    monthly_rent_min DECIMAL(10,2),
    monthly_rent_max DECIMAL(10,2),
    security_deposit_amount DECIMAL(10,2),
    pet_policy JSONB,
    utilities_included TEXT[],
    lease_terms TEXT[],
    application_fee DECIMAL(10,2) DEFAULT 0.00,
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    CHECK (total_units > 0),
    CHECK (available_units >= 0),
    CHECK (available_units <= total_units),
    CHECK (monthly_rent_min IS NULL OR monthly_rent_min >= 0),
    CHECK (monthly_rent_max IS NULL OR monthly_rent_max >= monthly_rent_min)
);

-- Table 5: Vendors
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID REFERENCES landlords(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    service_types TEXT[] NOT NULL,
    specialties TEXT[],
    license_number TEXT,
    insurance_info JSONB,
    rating DECIMAL(3,2) DEFAULT 0.00,
    hourly_rate DECIMAL(10,2),
    emergency_available BOOLEAN DEFAULT false,
    service_area TEXT[],
    availability_schedule JSONB,
    payment_terms TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    total_jobs_completed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    CHECK (rating >= 0 AND rating <= 5),
    CHECK (hourly_rate IS NULL OR hourly_rate >= 0)
);

-- Table 6: Maintenance Requests
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    priority maintenance_priority DEFAULT 'medium',
    status maintenance_status DEFAULT 'pending',
    location_details TEXT,
    images JSONB DEFAULT '[]',
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    scheduled_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    tenant_rating INTEGER,
    tenant_feedback TEXT,
    landlord_notes TEXT,
    is_emergency BOOLEAN DEFAULT false,
    entry_permission BOOLEAN DEFAULT false,
    preferred_contact_method TEXT DEFAULT 'email',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    CHECK (tenant_rating IS NULL OR (tenant_rating >= 1 AND tenant_rating <= 5)),
    CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    CHECK (actual_cost IS NULL OR actual_cost >= 0)
);

-- Table 7: Maintenance Messages
CREATE TABLE IF NOT EXISTS maintenance_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_internal BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Table 8: Lease Renewals
CREATE TABLE IF NOT EXISTS lease_renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    current_end_date DATE NOT NULL,
    proposed_start_date DATE NOT NULL,
    proposed_end_date DATE NOT NULL,
    current_monthly_rent DECIMAL(10,2) NOT NULL,
    proposed_monthly_rent DECIMAL(10,2) NOT NULL,
    rent_increase_percentage DECIMAL(5,2),
    rent_increase_amount DECIMAL(10,2),
    proposed_terms TEXT,
    status renewal_status DEFAULT 'draft',
    landlord_notes TEXT,
    tenant_notes TEXT,
    tenant_response TEXT,
    tenant_response_date TIMESTAMPTZ,
    landlord_decision TEXT,
    landlord_decision_date TIMESTAMPTZ,
    new_lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    reminder_sent_count INTEGER DEFAULT 0,
    last_reminder_sent_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    CHECK (proposed_monthly_rent >= 0),
    CHECK (current_monthly_rent >= 0),
    CHECK (proposed_end_date > proposed_start_date)
);

-- Table 9: Dashboard Configs
CREATE TABLE IF NOT EXISTS dashboard_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    layout_config JSONB DEFAULT '{}',
    widget_preferences JSONB DEFAULT '[]',
    theme_settings JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    default_view TEXT DEFAULT 'overview',
    quick_actions JSONB DEFAULT '[]',
    favorite_properties UUID[],
    saved_filters JSONB DEFAULT '{}',
    display_settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Table 10: Renewal Reminders
CREATE TABLE IF NOT EXISTS renewal_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_renewal_id UUID NOT NULL REFERENCES lease_renewals(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL,
    scheduled_date TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_method TEXT DEFAULT 'email',
    message_template TEXT,
    message_sent TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    CHECK (reminder_type IN ('initial', 'first_reminder', 'second_reminder', 'final_reminder', 'expired')),
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);

-- =====================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Landlords indexes
CREATE INDEX IF NOT EXISTS idx_landlords_user_id ON landlords(user_id);
CREATE INDEX IF NOT EXISTS idx_landlords_is_verified ON landlords(is_verified);

-- Tenants indexes
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_background_check_status ON tenants(background_check_status);

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city_state ON properties(city, state);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_is_published ON properties(is_published);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- Leases indexes (existing table)
CREATE INDEX IF NOT EXISTS idx_leases_landlord_id ON leases(landlord_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_start_date ON leases(start_date);
CREATE INDEX IF NOT EXISTS idx_leases_end_date ON leases(end_date);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_ids ON leases USING GIN(tenant_ids);

-- Payments indexes (existing table)
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);

-- Maintenance Requests indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_landlord_id ON maintenance_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_vendor_id ON maintenance_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_priority ON maintenance_requests(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_at ON maintenance_requests(created_at DESC);

-- Maintenance Messages indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_messages_request_id ON maintenance_messages(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_messages_sender_id ON maintenance_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_messages_created_at ON maintenance_messages(created_at DESC);

-- Vendors indexes
CREATE INDEX IF NOT EXISTS idx_vendors_landlord_id ON vendors(landlord_id);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_service_types ON vendors USING GIN(service_types);

-- Lease Renewals indexes
CREATE INDEX IF NOT EXISTS idx_lease_renewals_lease_id ON lease_renewals(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_renewals_landlord_id ON lease_renewals(landlord_id);
CREATE INDEX IF NOT EXISTS idx_lease_renewals_tenant_id ON lease_renewals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lease_renewals_status ON lease_renewals(status);
CREATE INDEX IF NOT EXISTS idx_lease_renewals_expires_at ON lease_renewals(expires_at);

-- Documents indexes (existing table)
CREATE INDEX IF NOT EXISTS idx_documents_lease_id ON documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON documents(is_deleted);

-- Signature Requests indexes (existing table)
CREATE INDEX IF NOT EXISTS idx_signature_requests_lease_id ON signature_requests(lease_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_created_by ON signature_requests(created_by);

-- Messages indexes (existing table)
CREATE INDEX IF NOT EXISTS idx_messages_lease_id ON messages(lease_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- Audit Logs indexes (existing table)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Dashboard Configs indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_id ON dashboard_configs(user_id);

-- Renewal Reminders indexes
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_lease_renewal_id ON renewal_reminders(lease_renewal_id);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_recipient_id ON renewal_reminders(recipient_id);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_status ON renewal_reminders(status);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_scheduled_date ON renewal_reminders(scheduled_date);

-- =====================================================
-- PART 4: CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (Using CREATE OR REPLACE for idempotency)
CREATE OR REPLACE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_landlords_updated_at BEFORE UPDATE ON landlords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_lease_renewals_updated_at BEFORE UPDATE ON lease_renewals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_dashboard_configs_updated_at BEFORE UPDATE ON dashboard_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 5: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_reminders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on existing tables
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 6: CREATE RLS POLICIES
-- =====================================================

-- ============ PROFILES POLICIES ============
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============ LANDLORDS POLICIES ============
-- Landlords can view their own data
CREATE POLICY "Landlords can view own data"
    ON landlords FOR SELECT
    USING (user_id = auth.uid());

-- Landlords can update their own data
CREATE POLICY "Landlords can update own data"
    ON landlords FOR UPDATE
    USING (user_id = auth.uid());

-- Landlords can insert their own data
CREATE POLICY "Landlords can insert own data"
    ON landlords FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Tenants can view their landlord's basic info
CREATE POLICY "Tenants can view their landlords"
    ON landlords FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.landlord_id = landlords.id
            AND auth.uid() = ANY(leases.tenant_ids)
        )
    );

-- ============ TENANTS POLICIES ============
-- Tenants can view their own data
CREATE POLICY "Tenants can view own data"
    ON tenants FOR SELECT
    USING (user_id = auth.uid());

-- Tenants can update their own data
CREATE POLICY "Tenants can update own data"
    ON tenants FOR UPDATE
    USING (user_id = auth.uid());

-- Tenants can insert their own data
CREATE POLICY "Tenants can insert own data"
    ON tenants FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Landlords can view their tenants
CREATE POLICY "Landlords can view their tenants"
    ON tenants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            JOIN landlords ll ON ll.id = l.landlord_id
            WHERE ll.user_id = auth.uid()
            AND tenants.id = ANY(
                SELECT unnest(
                    ARRAY(
                        SELECT t.id FROM tenants t
                        WHERE t.user_id = ANY(l.tenant_ids)
                    )
                )
            )
        )
    );

-- ============ PROPERTIES POLICIES ============
-- Landlords can view their own properties
CREATE POLICY "Landlords can view own properties"
    ON properties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM landlords
            WHERE landlords.id = properties.landlord_id
            AND landlords.user_id = auth.uid()
        )
    );

-- Landlords can insert their own properties
CREATE POLICY "Landlords can insert own properties"
    ON properties FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM landlords
            WHERE landlords.id = properties.landlord_id
            AND landlords.user_id = auth.uid()
        )
    );

-- Landlords can update their own properties
CREATE POLICY "Landlords can update own properties"
    ON properties FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM landlords
            WHERE landlords.id = properties.landlord_id
            AND landlords.user_id = auth.uid()
        )
    );

-- Landlords can delete their own properties
CREATE POLICY "Landlords can delete own properties"
    ON properties FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM landlords
            WHERE landlords.id = properties.landlord_id
            AND landlords.user_id = auth.uid()
        )
    );

-- Tenants can view properties they have leases for
CREATE POLICY "Tenants can view their properties"
    ON properties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.property_id = properties.id
            AND auth.uid() = ANY(leases.tenant_ids)
        )
    );

-- Public can view published properties
CREATE POLICY "Public can view published properties"
    ON properties FOR SELECT
    USING (is_published = true AND status = 'available');

-- ============ VENDORS POLICIES ============
-- Landlords can view their vendors
CREATE POLICY "Landlords can view own vendors"
    ON vendors FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM landlords
            WHERE landlords.id = vendors.landlord_id
            AND landlords.user_id = auth.uid()
        )
    );

-- Landlords can manage their vendors
CREATE POLICY "Landlords can manage own vendors"
    ON vendors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM landlords
            WHERE landlords.id = vendors.landlord_id
            AND landlords.user_id = auth.uid()
        )
    );

-- ============ MAINTENANCE REQUESTS POLICIES ============
-- Tenants can view their own maintenance requests
CREATE POLICY "Tenants can view own maintenance requests"
    ON maintenance_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tenants
            WHERE tenants.id = maintenance_requests.tenant_id
            AND tenants.user_id = auth.uid()
        )
    );

-- Tenants can create maintenance requests
CREATE POLICY "Tenants can create maintenance requests"
    ON maintenance_requests FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tenants
            WHERE tenants.id = maintenance_requests.tenant_id
            AND tenants.user_id = auth.uid()
        )
    );

-- Tenants can update their own maintenance requests
CREATE POLICY "Tenants can update own maintenance requests"
    ON maintenance_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM tenants
            WHERE tenants.id = maintenance_requests.tenant_id
            AND tenants.user_id = auth.uid()
        )
    );

-- Landlords can view maintenance requests for their properties
CREATE POLICY "Landlords can view property maintenance requests"
    ON maintenance_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM landlords
            WHERE landlords.id = maintenance_requests.landlord_id
            AND landlords.user_id = auth.uid()
        )
    );

-- Landlords can update maintenance requests for their properties
CREATE POLICY "Landlords can update property maintenance requests"
    ON maintenance_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM landlords
            WHERE landlords.id = maintenance_requests.landlord_id
            AND landlords.user_id = auth.uid()
        )
    );

-- ============ MAINTENANCE MESSAGES POLICIES ============
-- Users can view messages for their maintenance requests
CREATE POLICY "Users can view maintenance messages"
    ON maintenance_messages FOR SELECT
    USING (
        sender_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM maintenance_requests mr
            JOIN tenants t ON t.id = mr.tenant_id
            WHERE mr.id = maintenance_messages.maintenance_request_id
            AND t.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM maintenance_requests mr
            JOIN landlords l ON l.id = mr.landlord_id
            WHERE mr.id = maintenance_messages.maintenance_request_id
            AND l.user_id = auth.uid()
        )
    );

-- Users can create messages for their maintenance requests
CREATE POLICY "Users can create maintenance messages"
    ON maintenance_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND (
            EXISTS (
                SELECT 1 FROM maintenance_requests mr
                JOIN tenants t ON t.id = mr.tenant_id
                WHERE mr.id = maintenance_messages.maintenance_request_id
                AND t.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM maintenance_requests mr
                JOIN landlords l ON l.id = mr.landlord_id
                WHERE mr.id = maintenance_messages.maintenance_request_id
                AND l.user_id = auth.uid()
            )
        )
    );

-- ============ LEASE RENEWALS POLICIES ============
-- Tenants can view their lease renewals
CREATE POLICY "Tenants can view own lease renewals"
    ON lease_renewals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tenants
            WHERE tenants.id = lease_renewals.tenant_id
            AND tenants.user_id = auth.uid()
        )
    );

-- Tenants can update their lease renewal responses
CREATE POLICY "Tenants can update lease renewal responses"
    ON lease_renewals FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM tenants
            WHERE tenants.id = lease_renewals.tenant_id
            AND tenants.user_id = auth.uid()
        )
    );

-- Landlords can manage lease renewals for their properties
CREATE POLICY "Landlords can manage lease renewals"
    ON lease_renewals FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM landlords
            WHERE landlords.id = lease_renewals.landlord_id
            AND landlords.user_id = auth.uid()
        )
    );

-- ============ DASHBOARD CONFIGS POLICIES ============
-- Users can manage their own dashboard configs
CREATE POLICY "Users can manage own dashboard configs"
    ON dashboard_configs FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============ RENEWAL REMINDERS POLICIES ============
-- Users can view their own renewal reminders
CREATE POLICY "Users can view own renewal reminders"
    ON renewal_reminders FOR SELECT
    USING (recipient_id = auth.uid());

-- Landlords can manage renewal reminders for their lease renewals
CREATE POLICY "Landlords can manage renewal reminders"
    ON renewal_reminders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM lease_renewals lr
            JOIN landlords l ON l.id = lr.landlord_id
            WHERE lr.id = renewal_reminders.lease_renewal_id
            AND l.user_id = auth.uid()
        )
    );

-- ============ LEASES POLICIES (EXISTING TABLE) ============
-- Tenants can view their own leases
CREATE POLICY "Tenants can view own leases"
    ON leases FOR SELECT
    USING (auth.uid() = ANY(tenant_ids));

-- Landlords can view their leases
CREATE POLICY "Landlords can view own leases"
    ON leases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM landlords
            WHERE landlords.id = leases.landlord_id
            AND landlords.user_id = auth.uid()
        )
    );

-- Landlords can manage their leases
CREATE POLICY "Landlords can manage own leases"
    ON leases FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM landlords
            WHERE landlords.id = leases.landlord_id
            AND landlords.user_id = auth.uid()
        )
    );

-- ============ PAYMENTS POLICIES (EXISTING TABLE) ============
-- Tenants can view their own payments
CREATE POLICY "Tenants can view own payments"
    ON payments FOR SELECT
    USING (tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
    ));

-- Tenants can create their own payments
CREATE POLICY "Tenants can create own payments"
    ON payments FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
    ));

-- Landlords can view payments for their leases
CREATE POLICY "Landlords can view lease payments"
    ON payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            JOIN landlords ll ON ll.id = l.landlord_id
            WHERE l.id = payments.lease_id
            AND ll.user_id = auth.uid()
        )
    );

-- ============ DOCUMENTS POLICIES (EXISTING TABLE) ============
-- Users can view documents for their leases
CREATE POLICY "Users can view lease documents"
    ON documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.id = documents.lease_id
            AND (
                auth.uid() = ANY(leases.tenant_ids)
                OR EXISTS (
                    SELECT 1 FROM landlords
                    WHERE landlords.id = leases.landlord_id
                    AND landlords.user_id = auth.uid()
                )
            )
        )
    );

-- Landlords can manage documents for their leases
CREATE POLICY "Landlords can manage lease documents"
    ON documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            JOIN landlords ll ON ll.id = l.landlord_id
            WHERE l.id = documents.lease_id
            AND ll.user_id = auth.uid()
        )
    );

-- ============ SIGNATURE REQUESTS POLICIES (EXISTING TABLE) ============
-- Users can view signature requests for their leases
CREATE POLICY "Users can view lease signature requests"
    ON signature_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.id = signature_requests.lease_id
            AND (
                auth.uid() = ANY(leases.tenant_ids)
                OR EXISTS (
                    SELECT 1 FROM landlords
                    WHERE landlords.id = leases.landlord_id
                    AND landlords.user_id = auth.uid()
                )
            )
        )
    );

-- Landlords can manage signature requests for their leases
CREATE POLICY "Landlords can manage signature requests"
    ON signature_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            JOIN landlords ll ON ll.id = l.landlord_id
            WHERE l.id = signature_requests.lease_id
            AND ll.user_id = auth.uid()
        )
    );

-- ============ MESSAGES POLICIES (EXISTING TABLE) ============
-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
    ON messages FOR SELECT
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Users can send messages
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (sender_id = auth.uid());

-- Users can update messages they received (mark as read)
CREATE POLICY "Users can update received messages"
    ON messages FOR UPDATE
    USING (recipient_id = auth.uid());

-- ============ AUDIT LOGS POLICIES (EXISTING TABLE) ============
-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
    ON audit_logs FOR SELECT
    USING (user_id = auth.uid());

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- PART 7: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS user_role AS $$
BEGIN
    RETURN (SELECT role FROM profiles WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is landlord
CREATE OR REPLACE FUNCTION is_landlord(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM landlords WHERE user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is tenant
CREATE OR REPLACE FUNCTION is_tenant(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenants WHERE user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Created 10 new tables with proper schema';
    RAISE NOTICE 'Added 50+ indexes for performance optimization';
    RAISE NOTICE 'Implemented RLS policies for all 16 tables';
    RAISE NOTICE 'Added foreign key constraints and check constraints';
    RAISE NOTICE 'Created helper functions for role checking';
END $$;
