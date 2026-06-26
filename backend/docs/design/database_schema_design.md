# Lease Management System - Complete Database Schema Design

**Created By:** Bob (Software Architect)  
**Date:** January 3, 2026  
**Version:** 1.0  
**Purpose:** Complete database schema design for Supabase migration

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Core Tables](#core-tables)
4. [Supporting Tables](#supporting-tables)
5. [Indexes Strategy](#indexes-strategy)
6. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
7. [Database Functions](#database-functions)
8. [Triggers](#triggers)
9. [Data Migration Strategy](#data-migration-strategy)

---

## Overview

This schema design supports a multi-tenant lease management system with the following key features:
- User management (landlords, tenants, agents, admins)
- Property and lease management
- Payment processing and tracking
- Document storage and e-signatures
- Maintenance requests
- Communication/messaging
- Notifications
- Audit logging

**Design Principles:**
- Normalize data to 3NF (Third Normal Form)
- Use UUIDs for primary keys (better for distributed systems)
- Implement soft deletes (deleted_at) for data recovery
- Add created_at/updated_at timestamps for audit trails
- Use JSONB for flexible metadata storage
- Implement RLS for multi-tenant security
- Create indexes for common query patterns

---

## Entity Relationship Diagram

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       ├──────────────────────────────────────────┐
       │                                          │
       ▼                                          ▼
┌─────────────┐                          ┌─────────────┐
│ properties  │◄─────────────────────────┤   leases    │
└──────┬──────┘                          └──────┬──────┘
       │                                         │
       │                                         ├──────────┐
       │                                         │          │
       ▼                                         ▼          ▼
┌─────────────┐                          ┌─────────────┐ ┌─────────────┐
│maintenance_ │                          │  payments   │ │ documents   │
│  requests   │                          └─────────────┘ └─────────────┘
└─────────────┘                                  │
       │                                         │
       │                                         ▼
       │                                  ┌─────────────┐
       │                                  │ signature_  │
       │                                  │  requests   │
       │                                  └─────────────┘
       │
       ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  messages   │         │notifications│         │ audit_logs  │
└─────────────┘         └─────────────┘         └─────────────┘
```

---

## Core Tables

### 1. users

**Purpose:** Store all user accounts (landlords, tenants, agents, admins)

**Schema:**

```sql
CREATE TABLE users (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Authentication (managed by Supabase Auth)
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  
  -- Role & Status
  role VARCHAR(20) NOT NULL CHECK (role IN ('landlord', 'tenant', 'agent', 'admin', 'property_manager')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_verification')),
  
  -- Profile Information
  avatar_url TEXT,
  date_of_birth DATE,
  ssn_encrypted TEXT, -- Encrypted SSN for tenant screening
  
  -- Address
  address_line1 VARCHAR(200),
  address_line2 VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  
  -- Contact Preferences
  preferred_contact_method VARCHAR(20) DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'app')),
  email_notifications_enabled BOOLEAN DEFAULT true,
  sms_notifications_enabled BOOLEAN DEFAULT false,
  
  -- Verification
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  identity_verified BOOLEAN DEFAULT false,
  verification_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_full_name ON users USING gin(to_tsvector('english', full_name));

-- Comments
COMMENT ON TABLE users IS 'Stores all user accounts including landlords, tenants, agents, and admins';
COMMENT ON COLUMN users.ssn_encrypted IS 'Encrypted SSN for tenant screening - use Supabase Vault';
COMMENT ON COLUMN users.metadata IS 'Flexible storage for role-specific data (e.g., landlord business info, tenant employment)';
```

---

### 2. properties

**Purpose:** Store rental property information

**Schema:**

```sql
CREATE TABLE properties (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  landlord_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  property_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Basic Information
  name VARCHAR(200),
  property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('single_family', 'multi_family', 'apartment', 'condo', 'townhouse', 'commercial', 'other')),
  
  -- Address
  address_line1 VARCHAR(200) NOT NULL,
  address_line2 VARCHAR(200),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  zip_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) DEFAULT 'USA',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Property Details
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  square_feet INTEGER,
  lot_size INTEGER,
  year_built INTEGER,
  parking_spaces INTEGER,
  
  -- Amenities & Features
  amenities TEXT[],
  appliances TEXT[],
  utilities_included TEXT[],
  pet_policy JSONB DEFAULT '{
    "allowed": false,
    "types": [],
    "deposit": 0,
    "monthly_fee": 0,
    "restrictions": ""
  }'::jsonb,
  
  -- Financial
  purchase_price DECIMAL(12, 2),
  current_market_value DECIMAL(12, 2),
  property_tax_annual DECIMAL(10, 2),
  insurance_annual DECIMAL(10, 2),
  hoa_fee_monthly DECIMAL(10, 2),
  
  -- Status
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'unavailable')),
  listing_status VARCHAR(20) DEFAULT 'unlisted' CHECK (listing_status IN ('listed', 'unlisted', 'pending', 'leased')),
  
  -- Media
  images JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  virtual_tour_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_properties_landlord_id ON properties(landlord_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_status ON properties(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_listing_status ON properties(listing_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_location ON properties(city, state, zip_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_property_type ON properties(property_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_coordinates ON properties USING gist(ll_to_earth(latitude, longitude)) WHERE deleted_at IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comments
COMMENT ON TABLE properties IS 'Stores rental property information';
COMMENT ON COLUMN properties.pet_policy IS 'JSONB object containing pet policy details';
COMMENT ON COLUMN properties.images IS 'Array of image URLs stored in Supabase Storage';
```

---

### 3. leases

**Purpose:** Store lease agreements between landlords and tenants

**Schema:**

```sql
CREATE TABLE leases (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  landlord_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Tenant Information (supports multiple tenants)
  tenant_ids UUID[] NOT NULL,
  primary_tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Lease Details
  lease_number VARCHAR(50) UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('fixed_term', 'month_to_month', 'sublease', 'commercial')),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_signatures', 'under_review', 'pending_approval', 
    'active', 'expiring_soon', 'expired', 'terminated', 'renewed'
  )),
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  move_in_date DATE,
  move_out_date DATE,
  notice_period_days INTEGER DEFAULT 30,
  
  -- Financial Terms
  monthly_rent DECIMAL(10, 2) NOT NULL,
  security_deposit DECIMAL(10, 2) NOT NULL,
  first_month_rent DECIMAL(10, 2),
  last_month_rent DECIMAL(10, 2),
  pet_deposit DECIMAL(10, 2) DEFAULT 0,
  
  -- Payment Terms
  payment_due_day INTEGER DEFAULT 1 CHECK (payment_due_day BETWEEN 1 AND 31),
  late_fee_amount DECIMAL(10, 2),
  late_fee_grace_period_days INTEGER DEFAULT 5,
  payment_methods TEXT[] DEFAULT ARRAY['bank_transfer', 'credit_card', 'check'],
  
  -- Utilities & Services
  utilities_included TEXT[],
  utilities_tenant_responsibility TEXT[],
  
  -- Policies
  pet_policy JSONB,
  smoking_policy VARCHAR(20) DEFAULT 'no_smoking' CHECK (smoking_policy IN ('allowed', 'no_smoking', 'outside_only')),
  guest_policy JSONB,
  sublease_allowed BOOLEAN DEFAULT false,
  
  -- Maintenance
  maintenance_responsibilities JSONB DEFAULT '{
    "landlord": [],
    "tenant": []
  }'::jsonb,
  
  -- Renewal
  auto_renew BOOLEAN DEFAULT false,
  renewal_terms JSONB,
  renewal_notice_days INTEGER DEFAULT 60,
  
  -- Special Terms
  special_terms TEXT,
  addendums JSONB DEFAULT '[]'::jsonb,
  
  -- Documents
  lease_document_url TEXT,
  signed_document_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  last_modified_by UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signed_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  terminated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_lease_dates CHECK (end_date > start_date),
  CONSTRAINT valid_rent CHECK (monthly_rent > 0),
  CONSTRAINT valid_deposit CHECK (security_deposit >= 0)
);

-- Indexes
CREATE INDEX idx_leases_landlord_id ON leases(landlord_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_property_id ON leases(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_primary_tenant_id ON leases(primary_tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_tenant_ids ON leases USING gin(tenant_ids) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_status ON leases(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_type ON leases(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_dates ON leases(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_expiring ON leases(end_date) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_leases_lease_number ON leases(lease_number) WHERE deleted_at IS NULL;

-- Composite indexes for common queries
CREATE INDEX idx_leases_landlord_status ON leases(landlord_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_property_status ON leases(property_id, status) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE leases IS 'Stores lease agreements between landlords and tenants';
COMMENT ON COLUMN leases.tenant_ids IS 'Array of tenant user IDs (supports multiple tenants per lease)';
COMMENT ON COLUMN leases.lease_number IS 'Unique lease identifier for reference';
COMMENT ON COLUMN leases.addendums IS 'Array of lease amendments and addendums';
```

---

### 4. payments

**Purpose:** Track all payment transactions

**Schema:**

```sql
CREATE TABLE payments (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  
  -- Payment Details
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN (
    'rent', 'security_deposit', 'pet_deposit', 'late_fee', 
    'utility', 'maintenance', 'other'
  )),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Payment Method
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN (
    'credit_card', 'debit_card', 'bank_transfer', 'ach', 
    'check', 'cash', 'money_order', 'other'
  )),
  
  -- Status
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'processing', 'completed', 'failed', 
    'cancelled', 'refunded', 'disputed'
  )),
  
  -- Transaction Details
  transaction_id VARCHAR(255) UNIQUE,
  external_payment_id VARCHAR(255), -- Stripe payment intent ID, etc.
  confirmation_number VARCHAR(100),
  
  -- Dates
  due_date DATE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Late Fee
  is_late BOOLEAN DEFAULT false,
  late_fee_amount DECIMAL(10, 2) DEFAULT 0,
  days_late INTEGER,
  
  -- Refund Information
  refund_amount DECIMAL(10, 2),
  refund_reason TEXT,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment Details
  description TEXT,
  notes TEXT,
  receipt_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_lease_id ON payments(lease_id);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_property_id ON payments(property_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_type ON payments(payment_type);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id) WHERE transaction_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_payments_lease_status ON payments(lease_id, payment_status);
CREATE INDEX idx_payments_tenant_status ON payments(tenant_id, payment_status);
CREATE INDEX idx_payments_due_status ON payments(due_date, payment_status) WHERE payment_status IN ('pending', 'processing');

-- Comments
COMMENT ON TABLE payments IS 'Tracks all payment transactions including rent, deposits, and fees';
COMMENT ON COLUMN payments.external_payment_id IS 'Payment gateway transaction ID (e.g., Stripe payment intent)';
COMMENT ON COLUMN payments.is_late IS 'Automatically calculated based on due_date and payment_date';
```

---

### 5. documents

**Purpose:** Store document metadata (files stored in Supabase Storage)

**Schema:**

```sql
CREATE TABLE documents (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Document Type
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
    'lease_agreement', 'amendment', 'addendum', 'notice', 
    'inspection_report', 'maintenance_record', 'receipt', 
    'tax_document', 'insurance', 'photo', 'other'
  )),
  category VARCHAR(50),
  
  -- File Information
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_extension VARCHAR(10),
  
  -- Document Details
  title VARCHAR(200),
  description TEXT,
  tags TEXT[],
  
  -- Version Control
  version INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  is_latest_version BOOLEAN DEFAULT true,
  
  -- Access Control
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'shared')),
  shared_with UUID[], -- Array of user IDs who have access
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  uploaded_by UUID NOT NULL REFERENCES users(id),
  
  -- Timestamps
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accessed_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_documents_lease_id ON documents(lease_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_property_id ON documents(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_user_id ON documents(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_type ON documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_tags ON documents USING gin(tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_shared_with ON documents USING gin(shared_with) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_version ON documents(parent_document_id, version) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE documents IS 'Stores document metadata; actual files stored in Supabase Storage';
COMMENT ON COLUMN documents.file_path IS 'Path to file in Supabase Storage bucket';
COMMENT ON COLUMN documents.shared_with IS 'Array of user IDs who have access to this document';
```

---

### 6. signature_requests

**Purpose:** Manage e-signature workflows

**Schema:**

```sql
CREATE TABLE signature_requests (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  -- Request Details
  title VARCHAR(200) NOT NULL,
  document_name VARCHAR(200) NOT NULL,
  document_url TEXT NOT NULL,
  
  -- Workflow
  workflow_type VARCHAR(50) DEFAULT 'sequential' CHECK (workflow_type IN ('sequential', 'parallel')),
  signers JSONB NOT NULL, -- Array of signer objects with details
  current_signer_index INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'partially_signed', 
    'completed', 'declined', 'expired', 'cancelled'
  )),
  
  -- Dates
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_frequency_days INTEGER DEFAULT 3,
  last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Completion
  completed_at TIMESTAMP WITH TIME ZONE,
  signed_document_url TEXT,
  certificate_url TEXT,
  
  -- Security
  require_authentication BOOLEAN DEFAULT true,
  require_geolocation BOOLEAN DEFAULT false,
  ip_restrictions TEXT[],
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_signature_requests_lease_id ON signature_requests(lease_id);
CREATE INDEX idx_signature_requests_document_id ON signature_requests(document_id);
CREATE INDEX idx_signature_requests_status ON signature_requests(status);
CREATE INDEX idx_signature_requests_expires_at ON signature_requests(expires_at) WHERE status IN ('pending', 'in_progress', 'partially_signed');
CREATE INDEX idx_signature_requests_created_by ON signature_requests(created_by);
CREATE INDEX idx_signature_requests_signers ON signature_requests USING gin(signers);

-- Comments
COMMENT ON TABLE signature_requests IS 'Manages e-signature workflows for lease documents';
COMMENT ON COLUMN signature_requests.signers IS 'JSONB array of signer objects: [{user_id, email, name, status, signed_at, signature_data, ip_address, geolocation}]';
COMMENT ON COLUMN signature_requests.workflow_type IS 'Sequential: signers sign in order; Parallel: all sign simultaneously';
```

---

## Supporting Tables

### 7. maintenance_requests

**Purpose:** Track property maintenance requests

**Schema:**

```sql
CREATE TABLE maintenance_requests (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Request Details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'plumbing', 'electrical', 'hvac', 'appliance', 
    'structural', 'pest_control', 'landscaping', 'other'
  )),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
  
  -- Location
  location_details TEXT,
  access_instructions TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'acknowledged', 'scheduled', 'in_progress', 
    'completed', 'cancelled', 'on_hold'
  )),
  
  -- Scheduling
  preferred_date DATE,
  preferred_time_slot VARCHAR(50),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  
  -- Cost
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  tenant_responsible_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- Media
  images JSONB DEFAULT '[]'::jsonb,
  before_photos JSONB DEFAULT '[]'::jsonb,
  after_photos JSONB DEFAULT '[]'::jsonb,
  
  -- Resolution
  resolution_notes TEXT,
  work_performed TEXT,
  parts_used JSONB DEFAULT '[]'::jsonb,
  
  -- Vendor
  vendor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vendor_invoice_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_maintenance_property_id ON maintenance_requests(property_id);
CREATE INDEX idx_maintenance_lease_id ON maintenance_requests(lease_id);
CREATE INDEX idx_maintenance_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_assigned_to ON maintenance_requests(assigned_to);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_priority ON maintenance_requests(priority);
CREATE INDEX idx_maintenance_category ON maintenance_requests(category);
CREATE INDEX idx_maintenance_created_at ON maintenance_requests(created_at DESC);

-- Composite indexes
CREATE INDEX idx_maintenance_property_status ON maintenance_requests(property_id, status);
CREATE INDEX idx_maintenance_tenant_status ON maintenance_requests(tenant_id, status);

-- Comments
COMMENT ON TABLE maintenance_requests IS 'Tracks property maintenance and repair requests';
COMMENT ON COLUMN maintenance_requests.images IS 'Array of image URLs showing the issue';
```

---

### 8. messages

**Purpose:** Internal messaging between users

**Schema:**

```sql
CREATE TABLE messages (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  maintenance_request_id UUID REFERENCES maintenance_requests(id) ON DELETE SET NULL,
  
  -- Thread
  thread_id UUID,
  parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Message Content
  subject VARCHAR(200),
  body TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'direct' CHECK (message_type IN (
    'direct', 'lease_related', 'maintenance', 'payment', 'system'
  )),
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  
  -- Priority
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_messages_sender_id ON messages(sender_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_lease_id ON messages(lease_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_thread_id ON messages(thread_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_is_read ON messages(recipient_id, is_read) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_created_at ON messages(created_at DESC) WHERE deleted_at IS NULL;

-- Composite indexes
CREATE INDEX idx_messages_recipient_unread ON messages(recipient_id, created_at DESC) WHERE is_read = false AND deleted_at IS NULL;

-- Comments
COMMENT ON TABLE messages IS 'Internal messaging system between users';
COMMENT ON COLUMN messages.thread_id IS 'Groups related messages together';
COMMENT ON COLUMN messages.attachments IS 'Array of document IDs or file URLs';
```

---

### 9. notifications

**Purpose:** System notifications and alerts

**Schema:**

```sql
CREATE TABLE notifications (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification Details
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'lease_expiring', 'payment_due', 'payment_received', 'payment_failed',
    'maintenance_request', 'maintenance_completed', 'message_received',
    'signature_required', 'document_uploaded', 'lease_renewed',
    'system_announcement', 'other'
  )),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  
  -- Priority
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Related Resources
  related_resource_type VARCHAR(50),
  related_resource_id UUID,
  
  -- Action
  action_url TEXT,
  action_label VARCHAR(100),
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Delivery
  delivery_channels TEXT[] DEFAULT ARRAY['app'], -- app, email, sms
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_type ON notifications(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_priority ON notifications(priority) WHERE deleted_at IS NULL;

-- Composite indexes
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = false AND deleted_at IS NULL;

-- Comments
COMMENT ON TABLE notifications IS 'System notifications and alerts for users';
COMMENT ON COLUMN notifications.delivery_channels IS 'Array of channels to deliver notification (app, email, sms)';
```

---

### 10. audit_logs

**Purpose:** Track all system activities for compliance and debugging

**Schema:**

```sql
CREATE TABLE audit_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Actor
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_role VARCHAR(20),
  
  -- Action
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  changes JSONB,
  
  -- Request Details
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path TEXT,
  
  -- Status
  status VARCHAR(20) CHECK (status IN ('success', 'failure', 'error')),
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Composite indexes
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX idx_audit_logs_resource_action ON audit_logs(resource_type, resource_id, created_at DESC);

-- Partitioning (for large-scale systems)
-- Consider partitioning by created_at (monthly or quarterly)

-- Comments
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all system activities';
COMMENT ON COLUMN audit_logs.changes IS 'Computed diff between old_values and new_values';
```

---

### 11. payment_schedules

**Purpose:** Track scheduled/recurring payments

**Schema:**

```sql
CREATE TABLE payment_schedules (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Schedule Details
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('rent', 'utility', 'other')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  
  -- Recurrence
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'annually')),
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  
  -- Auto-pay
  auto_pay_enabled BOOLEAN DEFAULT false,
  payment_method_id VARCHAR(255),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_schedules_lease_id ON payment_schedules(lease_id);
CREATE INDEX idx_payment_schedules_tenant_id ON payment_schedules(tenant_id);
CREATE INDEX idx_payment_schedules_next_due_date ON payment_schedules(next_due_date) WHERE status = 'active';
CREATE INDEX idx_payment_schedules_status ON payment_schedules(status);

-- Comments
COMMENT ON TABLE payment_schedules IS 'Manages scheduled and recurring payments';
```

---

### 12. user_preferences

**Purpose:** Store user-specific settings and preferences

**Schema:**

```sql
CREATE TABLE user_preferences (
  -- Primary Key
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  
  -- Notification Types
  notify_payment_due BOOLEAN DEFAULT true,
  notify_payment_received BOOLEAN DEFAULT true,
  notify_lease_expiring BOOLEAN DEFAULT true,
  notify_maintenance_updates BOOLEAN DEFAULT true,
  notify_messages BOOLEAN DEFAULT true,
  notify_documents BOOLEAN DEFAULT true,
  
  -- Display Preferences
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
  date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Dashboard Preferences
  dashboard_layout JSONB DEFAULT '{}'::jsonb,
  default_view VARCHAR(50),
  
  -- Privacy
  profile_visibility VARCHAR(20) DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'contacts_only')),
  show_email BOOLEAN DEFAULT false,
  show_phone BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE user_preferences IS 'Stores user-specific settings and preferences';
```

---

## Indexes Strategy

### Performance Indexes

```sql
-- Full-text search indexes
CREATE INDEX idx_properties_search ON properties USING gin(
  to_tsvector('english', 
    coalesce(name, '') || ' ' || 
    coalesce(address_line1, '') || ' ' || 
    coalesce(city, '') || ' ' || 
    coalesce(state, '')
  )
);

CREATE INDEX idx_users_search ON users USING gin(
  to_tsvector('english', 
    coalesce(first_name, '') || ' ' || 
    coalesce(last_name, '') || ' ' || 
    coalesce(email, '')
  )
);

-- Partial indexes for active records
CREATE INDEX idx_active_leases ON leases(id, status, end_date) 
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX idx_pending_payments ON payments(id, due_date, amount) 
  WHERE payment_status IN ('pending', 'processing');

CREATE INDEX idx_unread_messages ON messages(recipient_id, created_at DESC) 
  WHERE is_read = false AND deleted_at IS NULL;

-- Covering indexes for common queries
CREATE INDEX idx_leases_dashboard ON leases(landlord_id, status, start_date, end_date) 
  INCLUDE (monthly_rent, property_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_payments_history ON payments(lease_id, payment_date DESC) 
  INCLUDE (amount, payment_status, payment_type);
```

---

## Row Level Security (RLS) Policies

### Enable RLS on all tables

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
```

### Users Table Policies

```sql
-- Users can view their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (auth.uid() = auth_id);

-- Users can update their own profile
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth.uid() = auth_id);

-- Admins can view all users
CREATE POLICY users_select_admin ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view other users in their leases
CREATE POLICY users_select_lease_related ON users
  FOR SELECT
  USING (
    id IN (
      SELECT landlord_id FROM leases WHERE auth.uid() IN (
        SELECT auth_id FROM users WHERE id = ANY(tenant_ids)
      )
    )
    OR id IN (
      SELECT unnest(tenant_ids) FROM leases WHERE auth.uid() IN (
        SELECT auth_id FROM users WHERE id = landlord_id
      )
    )
  );
```

### Properties Table Policies

```sql
-- Landlords can view their own properties
CREATE POLICY properties_select_landlord ON properties
  FOR SELECT
  USING (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Tenants can view properties they're leasing
CREATE POLICY properties_select_tenant ON properties
  FOR SELECT
  USING (
    id IN (
      SELECT property_id FROM leases
      WHERE auth.uid() IN (
        SELECT auth_id FROM users WHERE id = ANY(tenant_ids)
      )
    )
  );

-- Landlords can insert their own properties
CREATE POLICY properties_insert_landlord ON properties
  FOR INSERT
  WITH CHECK (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Landlords can update their own properties
CREATE POLICY properties_update_landlord ON properties
  FOR UPDATE
  USING (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Landlords can delete their own properties
CREATE POLICY properties_delete_landlord ON properties
  FOR DELETE
  USING (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );
```

### Leases Table Policies

```sql
-- Landlords can view their leases
CREATE POLICY leases_select_landlord ON leases
  FOR SELECT
  USING (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Tenants can view their leases
CREATE POLICY leases_select_tenant ON leases
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_id FROM users WHERE id = ANY(tenant_ids)
    )
  );

-- Agents can view leases they manage
CREATE POLICY leases_select_agent ON leases
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Landlords can insert leases for their properties
CREATE POLICY leases_insert_landlord ON leases
  FOR INSERT
  WITH CHECK (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Landlords can update their leases
CREATE POLICY leases_update_landlord ON leases
  FOR UPDATE
  USING (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );
```

### Payments Table Policies

```sql
-- Landlords can view payments for their leases
CREATE POLICY payments_select_landlord ON payments
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE landlord_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Tenants can view their own payments
CREATE POLICY payments_select_tenant ON payments
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Tenants can insert their own payments
CREATE POLICY payments_insert_tenant ON payments
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );
```

### Documents Table Policies

```sql
-- Users can view documents they uploaded
CREATE POLICY documents_select_uploader ON documents
  FOR SELECT
  USING (
    uploaded_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can view documents shared with them
CREATE POLICY documents_select_shared ON documents
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_id FROM users WHERE id = ANY(shared_with)
    )
  );

-- Landlords can view documents for their properties/leases
CREATE POLICY documents_select_landlord ON documents
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
    OR lease_id IN (
      SELECT id FROM leases WHERE landlord_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Tenants can view documents for their leases
CREATE POLICY documents_select_tenant ON documents
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE auth.uid() IN (
        SELECT auth_id FROM users WHERE id = ANY(tenant_ids)
      )
    )
  );

-- Users can insert documents
CREATE POLICY documents_insert_authenticated ON documents
  FOR INSERT
  WITH CHECK (
    uploaded_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );
```

### Messages Table Policies

```sql
-- Users can view messages they sent
CREATE POLICY messages_select_sender ON messages
  FOR SELECT
  USING (
    sender_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can view messages sent to them
CREATE POLICY messages_select_recipient ON messages
  FOR SELECT
  USING (
    recipient_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can send messages
CREATE POLICY messages_insert_authenticated ON messages
  FOR INSERT
  WITH CHECK (
    sender_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can update messages they received (mark as read)
CREATE POLICY messages_update_recipient ON messages
  FOR UPDATE
  USING (
    recipient_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );
```

### Notifications Table Policies

```sql
-- Users can view their own notifications
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- System can insert notifications
CREATE POLICY notifications_insert_system ON notifications
  FOR INSERT
  WITH CHECK (true);
```

### Audit Logs Policies

```sql
-- Only admins can view audit logs
CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert audit logs
CREATE POLICY audit_logs_insert_system ON audit_logs
  FOR INSERT
  WITH CHECK (true);
```

---

## Database Functions

### 1. Update Timestamp Function

```sql
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Calculate Late Fees Function

```sql
-- Function to calculate late fees for payments
CREATE OR REPLACE FUNCTION calculate_late_fee(
  p_payment_id UUID
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_due_date DATE;
  v_payment_date TIMESTAMP;
  v_days_late INTEGER;
  v_late_fee_amount DECIMAL(10, 2);
  v_grace_period INTEGER;
BEGIN
  -- Get payment details
  SELECT due_date, payment_date
  INTO v_due_date, v_payment_date
  FROM payments
  WHERE id = p_payment_id;
  
  -- Get lease late fee terms
  SELECT late_fee_amount, late_fee_grace_period_days
  INTO v_late_fee_amount, v_grace_period
  FROM leases
  WHERE id = (SELECT lease_id FROM payments WHERE id = p_payment_id);
  
  -- Calculate days late
  v_days_late := EXTRACT(DAY FROM (v_payment_date - v_due_date));
  
  -- Apply grace period
  IF v_days_late <= v_grace_period THEN
    RETURN 0;
  END IF;
  
  -- Return late fee
  RETURN v_late_fee_amount;
END;
$$ LANGUAGE plpgsql;
```

### 3. Get Expiring Leases Function

```sql
-- Function to get leases expiring within specified days
CREATE OR REPLACE FUNCTION get_expiring_leases(
  p_days_until_expiration INTEGER DEFAULT 30
) RETURNS TABLE (
  lease_id UUID,
  property_id UUID,
  landlord_id UUID,
  tenant_ids UUID[],
  end_date DATE,
  days_until_expiration INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.property_id,
    l.landlord_id,
    l.tenant_ids,
    l.end_date,
    EXTRACT(DAY FROM (l.end_date - CURRENT_DATE))::INTEGER
  FROM leases l
  WHERE l.status = 'active'
    AND l.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_until_expiration
    AND l.deleted_at IS NULL
  ORDER BY l.end_date ASC;
END;
$$ LANGUAGE plpgsql;
```

### 4. Generate Lease Number Function

```sql
-- Function to generate unique lease number
CREATE OR REPLACE FUNCTION generate_lease_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year VARCHAR(4);
  v_sequence INTEGER;
  v_lease_number VARCHAR(50);
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(lease_number FROM 6) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM leases
  WHERE lease_number LIKE 'LS' || v_year || '%';
  
  -- Format: LS2026-00001
  v_lease_number := 'LS' || v_year || '-' || LPAD(v_sequence::VARCHAR, 5, '0');
  
  RETURN v_lease_number;
END;
$$ LANGUAGE plpgsql;
```

### 5. Calculate Occupancy Rate Function

```sql
-- Function to calculate property occupancy rate
CREATE OR REPLACE FUNCTION calculate_occupancy_rate(
  p_landlord_id UUID DEFAULT NULL
) RETURNS DECIMAL(5, 2) AS $$
DECLARE
  v_total_properties INTEGER;
  v_occupied_properties INTEGER;
  v_occupancy_rate DECIMAL(5, 2);
BEGIN
  -- Count total properties
  SELECT COUNT(*)
  INTO v_total_properties
  FROM properties
  WHERE (p_landlord_id IS NULL OR landlord_id = p_landlord_id)
    AND deleted_at IS NULL;
  
  -- Count occupied properties
  SELECT COUNT(DISTINCT property_id)
  INTO v_occupied_properties
  FROM leases
  WHERE status = 'active'
    AND (p_landlord_id IS NULL OR landlord_id = p_landlord_id)
    AND deleted_at IS NULL;
  
  -- Calculate rate
  IF v_total_properties = 0 THEN
    RETURN 0;
  END IF;
  
  v_occupancy_rate := (v_occupied_properties::DECIMAL / v_total_properties) * 100;
  
  RETURN ROUND(v_occupancy_rate, 2);
END;
$$ LANGUAGE plpgsql;
```

---

## Triggers

### 1. Update Timestamp Triggers

```sql
-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signature_requests_updated_at
  BEFORE UPDATE ON signature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_schedules_updated_at
  BEFORE UPDATE ON payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Audit Log Trigger

```sql
-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    (SELECT id FROM users WHERE auth_id = auth.uid()),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_leases
  AFTER INSERT OR UPDATE OR DELETE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_properties
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();
```

### 3. Lease Number Generation Trigger

```sql
-- Trigger to auto-generate lease number
CREATE OR REPLACE FUNCTION set_lease_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lease_number IS NULL THEN
    NEW.lease_number := generate_lease_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_lease_number_trigger
  BEFORE INSERT ON leases
  FOR EACH ROW
  EXECUTE FUNCTION set_lease_number();
```

### 4. Payment Late Fee Trigger

```sql
-- Trigger to calculate late fees
CREATE OR REPLACE FUNCTION check_payment_late_fee()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_date IS NOT NULL AND NEW.payment_status = 'completed' THEN
    NEW.days_late := EXTRACT(DAY FROM (NEW.payment_date - NEW.due_date))::INTEGER;
    
    IF NEW.days_late > 0 THEN
      NEW.is_late := true;
      NEW.late_fee_amount := calculate_late_fee(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_late_fee_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW
  WHEN (NEW.payment_date IS NOT NULL AND OLD.payment_date IS NULL)
  EXECUTE FUNCTION check_payment_late_fee();
```

---

## Data Migration Strategy

### Phase 1: Create Tables (Week 1)

1. **Core Tables First:**
   - users
   - properties
   - leases

2. **Financial Tables:**
   - payments
   - payment_schedules

3. **Document & Communication:**
   - documents
   - signature_requests
   - messages

4. **Supporting Tables:**
   - maintenance_requests
   - notifications
   - audit_logs
   - user_preferences

### Phase 2: Migrate Data from localStorage (Week 1-2)

```sql
-- Example migration script structure
-- 1. Extract data from localStorage (client-side)
-- 2. Transform to match new schema
-- 3. Insert into Supabase tables

-- Migration order (respecting foreign key constraints):
-- 1. users
-- 2. properties
-- 3. leases
-- 4. payments
-- 5. documents
-- 6. signature_requests
-- 7. maintenance_requests
-- 8. messages
-- 9. notifications
```

### Phase 3: Enable RLS & Policies (Week 2)

1. Enable RLS on all tables
2. Create policies for each role
3. Test access control

### Phase 4: Create Indexes (Week 2)

1. Create primary indexes
2. Create composite indexes
3. Create full-text search indexes
4. Analyze query performance

### Phase 5: Setup Functions & Triggers (Week 2)

1. Create utility functions
2. Setup audit triggers
3. Setup timestamp triggers
4. Test trigger functionality

---

## Performance Considerations

### 1. Partitioning Strategy

For large-scale deployments, consider partitioning:

```sql
-- Partition audit_logs by month
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

### 2. Materialized Views

For complex reporting queries:

```sql
-- Materialized view for lease statistics
CREATE MATERIALIZED VIEW lease_statistics AS
SELECT
  landlord_id,
  COUNT(*) as total_leases,
  COUNT(*) FILTER (WHERE status = 'active') as active_leases,
  SUM(monthly_rent) FILTER (WHERE status = 'active') as total_monthly_revenue,
  AVG(monthly_rent) FILTER (WHERE status = 'active') as average_rent
FROM leases
WHERE deleted_at IS NULL
GROUP BY landlord_id;

-- Refresh strategy
CREATE INDEX ON lease_statistics(landlord_id);
REFRESH MATERIALIZED VIEW CONCURRENTLY lease_statistics;
```

### 3. Query Optimization Tips

- Use EXPLAIN ANALYZE to identify slow queries
- Add indexes for frequently filtered columns
- Use partial indexes for common WHERE conditions
- Consider covering indexes for SELECT queries
- Use connection pooling (PgBouncer)
- Monitor query performance with pg_stat_statements

---

## Security Best Practices

1. **Encryption:**
   - Use Supabase Vault for sensitive data (SSN, payment info)
   - Encrypt documents at rest in Supabase Storage
   - Use HTTPS for all connections

2. **Access Control:**
   - Implement RLS policies on all tables
   - Use role-based access control (RBAC)
   - Audit all data access via audit_logs

3. **Data Validation:**
   - Use CHECK constraints for data integrity
   - Validate input on both client and server
   - Use prepared statements to prevent SQL injection

4. **Backup & Recovery:**
   - Enable Supabase automated backups
   - Test restore procedures regularly
   - Implement soft deletes for data recovery

---

## Conclusion

This comprehensive database schema provides:

- ✅ Complete data model for lease management
- ✅ Multi-tenant security with RLS
- ✅ Audit trail for compliance
- ✅ Performance optimization with indexes
- ✅ Scalability for growth
- ✅ Data integrity with constraints
- ✅ Flexible metadata storage with JSONB

**Next Steps:**
1. Review and approve schema design
2. Create migration SQL files (David)
3. Execute migrations in Supabase
4. Test RLS policies
5. Begin Phase 1 implementation (replace localStorage)

---

**Document Status:** Ready for Review  
**Approved By:** Pending  
**Implementation Date:** Pending