-- Property-Tenant Matching Marketplace Database Schema
-- Based on architecture.md specifications

BEGIN;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- User Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('landlord', 'tenant', 'both')),
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties Table
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

-- Tenant Profiles
CREATE TABLE IF NOT EXISTS public.tenant_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    budget_min DECIMAL(10, 2) NOT NULL CHECK (budget_min >= 0),
    budget_max DECIMAL(10, 2) NOT NULL CHECK (budget_max >= budget_min),
    preferred_locations TEXT[] DEFAULT ARRAY[]::TEXT[],
    preferred_cities TEXT[] DEFAULT ARRAY[]::TEXT[],
    desired_bedrooms INTEGER CHECK (desired_bedrooms >= 0),
    desired_bathrooms DECIMAL(3, 1) CHECK (desired_bathrooms >= 0),
    desired_amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
    required_amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
    lease_term_preference TEXT DEFAULT '1 Year',
    move_in_date DATE,
    has_pets BOOLEAN DEFAULT FALSE,
    pet_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    employment_status TEXT,
    annual_income DECIMAL(12, 2),
    credit_score INTEGER CHECK (credit_score >= 300 AND credit_score <= 850),
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    price_score INTEGER NOT NULL CHECK (price_score >= 0 AND price_score <= 100),
    location_score INTEGER NOT NULL CHECK (location_score >= 0 AND location_score <= 100),
    amenity_score INTEGER NOT NULL CHECK (amenity_score >= 0 AND amenity_score <= 100),
    lease_term_score INTEGER NOT NULL CHECK (lease_term_score >= 0 AND lease_term_score <= 100),
    pet_policy_score INTEGER NOT NULL CHECK (pet_policy_score >= 0 AND pet_policy_score <= 100),
    rank INTEGER,
    highlights TEXT[] DEFAULT ARRAY[]::TEXT[],
    compatibility_metrics JSONB DEFAULT '{}'::JSONB,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'viewed', 'favorited', 'applied', 'expired')),
    viewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, tenant_id)
);

-- Applications Table
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'screening', 'approved', 'rejected', 'withdrawn')),
    personal_info JSONB NOT NULL,
    employment_info JSONB NOT NULL,
    rental_history JSONB DEFAULT '[]'::JSONB,
    references JSONB DEFAULT '[]'::JSONB,
    documents TEXT[] DEFAULT ARRAY[]::TEXT[],
    screening_results JSONB,
    screening_completed_at TIMESTAMPTZ,
    landlord_notes TEXT,
    tenant_notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    comment TEXT,
    verified BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reviewer_id, reviewee_id, property_id)
);

-- Favorites Table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('new_match', 'application_received', 'application_status', 'new_message', 'payment_due', 'review_received')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::JSONB,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_landlord ON public.properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_rent ON public.properties(rent);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON public.properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_available_date ON public.properties(available_date);

-- Tenant profiles indexes
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_user ON public.tenant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_budget ON public.tenant_profiles(budget_min, budget_max);

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_property ON public.matches(property_id);
CREATE INDEX IF NOT EXISTS idx_matches_tenant ON public.matches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_matches_score ON public.matches(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- Applications indexes
CREATE INDEX IF NOT EXISTS idx_applications_property ON public.applications(property_id);
CREATE INDEX IF NOT EXISTS idx_applications_tenant ON public.applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_submitted ON public.applications(submitted_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_property ON public.messages(property_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, read) WHERE read = FALSE;

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_property ON public.reviews(property_id);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property ON public.favorites(property_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view all profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Properties Policies
CREATE POLICY "Anyone can view active properties" ON public.properties FOR SELECT USING (status = 'active' OR landlord_id = auth.uid());
CREATE POLICY "Landlords can insert properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Landlords can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = landlord_id);
CREATE POLICY "Landlords can delete own properties" ON public.properties FOR DELETE USING (auth.uid() = landlord_id);

-- Tenant Profiles Policies
CREATE POLICY "Users can view own tenant profile" ON public.tenant_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tenant profile" ON public.tenant_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tenant profile" ON public.tenant_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Matches Policies
CREATE POLICY "Tenants can view own matches" ON public.matches FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Landlords can view matches for own properties" ON public.matches FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND landlord_id = auth.uid())
);
CREATE POLICY "System can insert matches" ON public.matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own matches" ON public.matches FOR UPDATE USING (
    auth.uid() = tenant_id OR 
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND landlord_id = auth.uid())
);

-- Applications Policies
CREATE POLICY "Tenants can view own applications" ON public.applications FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Landlords can view applications for own properties" ON public.applications FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND landlord_id = auth.uid())
);
CREATE POLICY "Tenants can insert applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Tenants can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = tenant_id);
CREATE POLICY "Landlords can update applications for own properties" ON public.applications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND landlord_id = auth.uid())
);

-- Messages Policies
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own received messages" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Reviews Policies
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);

-- Favorites Policies
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_profiles_updated_at BEFORE UPDATE ON public.tenant_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment property views
CREATE OR REPLACE FUNCTION increment_property_views(property_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.properties
    SET views = views + 1
    WHERE id = property_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (p_user_id, p_type, p_title, p_message, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify landlord of new application
CREATE OR REPLACE FUNCTION notify_landlord_new_application()
RETURNS TRIGGER AS $$
DECLARE
    landlord_id UUID;
    property_title TEXT;
    tenant_name TEXT;
BEGIN
    -- Get landlord_id and property title
    SELECT p.landlord_id, p.title INTO landlord_id, property_title
    FROM public.properties p
    WHERE p.id = NEW.property_id;
    
    -- Get tenant name
    SELECT full_name INTO tenant_name
    FROM public.user_profiles
    WHERE id = NEW.tenant_id;
    
    -- Create notification
    PERFORM create_notification(
        landlord_id,
        'application_received',
        'New Application Received',
        tenant_name || ' has applied for ' || property_title,
        jsonb_build_object(
            'application_id', NEW.id,
            'property_id', NEW.property_id,
            'tenant_id', NEW.tenant_id
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_landlord_new_application
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION notify_landlord_new_application();

-- Trigger to notify tenant of application status change
CREATE OR REPLACE FUNCTION notify_tenant_application_status()
RETURNS TRIGGER AS $$
DECLARE
    property_title TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Get property title
        SELECT title INTO property_title
        FROM public.properties
        WHERE id = NEW.property_id;
        
        -- Create notification
        PERFORM create_notification(
            NEW.tenant_id,
            'application_status',
            'Application Status Updated',
            'Your application for ' || property_title || ' is now ' || NEW.status,
            jsonb_build_object(
                'application_id', NEW.id,
                'property_id', NEW.property_id,
                'status', NEW.status
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_tenant_application_status
AFTER UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION notify_tenant_application_status();

-- Trigger to notify on new message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
BEGIN
    -- Get sender name
    SELECT full_name INTO sender_name
    FROM public.user_profiles
    WHERE id = NEW.sender_id;
    
    -- Create notification
    PERFORM create_notification(
        NEW.receiver_id,
        'new_message',
        'New Message',
        'You have a new message from ' || sender_name,
        jsonb_build_object(
            'message_id', NEW.id,
            'sender_id', NEW.sender_id,
            'property_id', NEW.property_id
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION notify_new_message();

COMMIT;