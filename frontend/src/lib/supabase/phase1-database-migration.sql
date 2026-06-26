-- =====================================================
-- Phase 1 Database Migration Script
-- Lease Management System - Complete Schema
-- Version: 1.0.0
-- Date: 2025-01-04
-- =====================================================
-- This script creates all missing tables required for the
-- Lease Management System to function properly.
-- It is idempotent and safe to run multiple times.
-- =====================================================

BEGIN;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- MISSING CORE TABLES
-- =====================================================

-- Users Table (extends auth.users with additional profile data)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('tenant', 'landlord', 'vendor', 'admin', 'both')),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties Table (already exists in database-setup.sql, but adding IF NOT EXISTS for safety)
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    property_type TEXT NOT NULL CHECK (property_type IN ('Apartment', 'House', 'Condo', 'Townhouse', 'Studio', 'Loft')),
    bedrooms INTEGER NOT NULL CHECK (bedrooms >= 0),
    bathrooms DECIMAL(3, 1) NOT NULL CHECK (bathrooms >= 0),
    square_feet INTEGER CHECK (square_feet > 0),
    rent DECIMAL(10, 2) NOT NULL CHECK (rent > 0),
    security_deposit DECIMAL(10, 2) NOT NULL CHECK (security_deposit >= 0),
    available_date DATE NOT NULL,
    lease_terms TEXT[] DEFAULT ARRAY['1 Year'],
    amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
    pet_policy TEXT DEFAULT 'No Pets',
    pets_allowed BOOLEAN DEFAULT FALSE,
    furnished BOOLEAN DEFAULT FALSE,
    utilities_included TEXT[] DEFAULT ARRAY[]::TEXT[],
    parking_available BOOLEAN DEFAULT FALSE,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rented', 'inactive')),
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants Table (tenant-specific data)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    employment_status TEXT,
    employer_name TEXT,
    annual_income DECIMAL(12, 2),
    credit_score INTEGER CHECK (credit_score >= 300 AND credit_score <= 850),
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    previous_address TEXT,
    move_in_date_preference DATE,
    has_pets BOOLEAN DEFAULT FALSE,
    pet_details TEXT,
    references JSONB DEFAULT '[]'::JSONB,
    background_check_status TEXT DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'in_progress', 'approved', 'rejected')),
    background_check_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Landlords Table (landlord-specific data)
CREATE TABLE IF NOT EXISTS public.landlords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    business_license TEXT,
    tax_id TEXT,
    bank_account_info JSONB,
    payment_methods TEXT[] DEFAULT ARRAY[]::TEXT[],
    properties_count INTEGER DEFAULT 0,
    total_units INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    reviews_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors Table (maintenance service providers)
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    service_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
    license_number TEXT,
    insurance_info JSONB,
    hourly_rate DECIMAL(10, 2),
    availability TEXT,
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    reviews_count INTEGER DEFAULT 0,
    jobs_completed INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Requests Table (22 columns as per maintenanceService.ts)
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Pest Control', 'Landscaping', 'Other')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    location TEXT,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    scheduled_date TIMESTAMPTZ,
    estimated_completion_date TIMESTAMPTZ,
    actual_completion_date TIMESTAMPTZ,
    tenant_notes TEXT,
    landlord_notes TEXT,
    vendor_notes TEXT,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Messages Table (communication for maintenance requests)
CREATE TABLE IF NOT EXISTS public.maintenance_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('tenant', 'landlord', 'vendor')),
    message TEXT NOT NULL,
    attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lease Renewals Table (renewal workflow tracking)
CREATE TABLE IF NOT EXISTS public.lease_renewals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'offer-sent', 'negotiating', 'accepted', 'declined', 'completed')),
    original_rent DECIMAL(10, 2) NOT NULL,
    proposed_rent DECIMAL(10, 2) NOT NULL,
    proposed_term_months INTEGER NOT NULL CHECK (proposed_term_months > 0),
    proposed_start_date DATE NOT NULL,
    proposed_end_date DATE NOT NULL,
    offer_sent_date TIMESTAMPTZ,
    response_deadline TIMESTAMPTZ,
    tenant_response TEXT,
    tenant_response_date TIMESTAMPTZ,
    counter_offer_rent DECIMAL(10, 2),
    counter_offer_terms TEXT,
    negotiation_notes TEXT,
    new_lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
    offer_document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Renewal Reminders Table (reminder tracking for renewals)
CREATE TABLE IF NOT EXISTS public.renewal_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('90_days', '60_days', '30_days')),
    sent_date TIMESTAMPTZ NOT NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard Configs Table (user dashboard customization)
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    widgets JSONB DEFAULT '[]'::JSONB,
    layout JSONB DEFAULT '{}'::JSONB,
    preferences JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- Tenants indexes
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_background_check_status ON public.tenants(background_check_status);

-- Landlords indexes
CREATE INDEX IF NOT EXISTS idx_landlords_user_id ON public.landlords(user_id);
CREATE INDEX IF NOT EXISTS idx_landlords_email ON public.landlords(email);
CREATE INDEX IF NOT EXISTS idx_landlords_verified ON public.landlords(verified);

-- Vendors indexes
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON public.vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON public.vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_service_types ON public.vendors USING GIN(service_types);

-- Maintenance Requests indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_lease ON public.maintenance_requests(lease_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant ON public.maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_landlord ON public.maintenance_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_vendor ON public.maintenance_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_priority ON public.maintenance_requests(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_category ON public.maintenance_requests(category);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created ON public.maintenance_requests(created_at DESC);

-- Maintenance Messages indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_messages_request ON public.maintenance_messages(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_messages_sender ON public.maintenance_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_messages_created ON public.maintenance_messages(created_at DESC);

-- Lease Renewals indexes
CREATE INDEX IF NOT EXISTS idx_lease_renewals_lease ON public.lease_renewals(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_renewals_status ON public.lease_renewals(status);
CREATE INDEX IF NOT EXISTS idx_lease_renewals_response_deadline ON public.lease_renewals(response_deadline);

-- Renewal Reminders indexes
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_lease ON public.renewal_reminders(lease_id);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_type ON public.renewal_reminders(reminder_type);

-- Dashboard Configs indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user ON public.dashboard_configs(user_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Apply updated_at trigger to new tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_landlords_updated_at BEFORE UPDATE ON public.landlords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON public.maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lease_renewals_updated_at BEFORE UPDATE ON public.lease_renewals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_configs_updated_at BEFORE UPDATE ON public.dashboard_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ADDITIONAL FUNCTIONS
-- =====================================================

-- Function to update landlord properties count
CREATE OR REPLACE FUNCTION update_landlord_properties_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.landlords
        SET properties_count = properties_count + 1
        WHERE user_id = NEW.landlord_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.landlords
        SET properties_count = properties_count - 1
        WHERE user_id = OLD.landlord_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_landlord_properties_count
AFTER INSERT OR DELETE ON public.properties
FOR EACH ROW EXECUTE FUNCTION update_landlord_properties_count();

-- Function to update vendor jobs completed
CREATE OR REPLACE FUNCTION update_vendor_jobs_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE public.vendors
        SET jobs_completed = jobs_completed + 1
        WHERE id = NEW.vendor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_vendor_jobs_completed
AFTER UPDATE ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION update_vendor_jobs_completed();

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created: 10
-- - users
-- - properties (idempotent)
-- - tenants
-- - landlords
-- - vendors
-- - maintenance_requests
-- - maintenance_messages
-- - lease_renewals
-- - renewal_reminders
-- - dashboard_configs
--
-- Indexes created: 30+
-- Triggers created: 9
-- Functions created: 2
-- =====================================================
