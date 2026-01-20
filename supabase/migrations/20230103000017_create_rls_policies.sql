-- ============================================================
-- Migration: Create RLS Policies
-- Description: Row Level Security policies for multi-tenant access control
-- Created: 2026-01-03
-- ============================================================

-- ============================================================
-- Users Table Policies
-- ============================================================

-- Users can view their own profile
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (auth.uid() = auth_id);

-- Users can update their own profile
DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth.uid() = auth_id);

-- Admins can view all users
DROP POLICY IF EXISTS users_select_admin ON users;
CREATE POLICY users_select_admin ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view other users in their leases
DROP POLICY IF EXISTS users_select_lease_related ON users;
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

-- ============================================================
-- Properties Table Policies
-- ============================================================

-- Landlords can view their own properties
DROP POLICY IF EXISTS properties_select_landlord ON properties;
CREATE POLICY properties_select_landlord ON properties
  FOR SELECT
  USING (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Tenants can view properties they're leasing
DROP POLICY IF EXISTS properties_select_tenant ON properties;
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
DROP POLICY IF EXISTS properties_insert_landlord ON properties;
CREATE POLICY properties_insert_landlord ON properties
  FOR INSERT
  WITH CHECK (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Landlords can update their own properties
DROP POLICY IF EXISTS properties_update_landlord ON properties;
CREATE POLICY properties_update_landlord ON properties
  FOR UPDATE
  USING (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Landlords can delete their own properties
DROP POLICY IF EXISTS properties_delete_landlord ON properties;
CREATE POLICY properties_delete_landlord ON properties
  FOR DELETE
  USING (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- ============================================================
-- Leases Table Policies
-- ============================================================

-- Landlords can view their leases
DROP POLICY IF EXISTS leases_select_landlord ON leases;
CREATE POLICY leases_select_landlord ON leases
  FOR SELECT
  USING (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Tenants can view their leases
DROP POLICY IF EXISTS leases_select_tenant ON leases;
CREATE POLICY leases_select_tenant ON leases
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_id FROM users WHERE id = ANY(tenant_ids)
    )
  );

-- Agents can view leases they manage
DROP POLICY IF EXISTS leases_select_agent ON leases;
CREATE POLICY leases_select_agent ON leases
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Landlords can insert leases for their properties
DROP POLICY IF EXISTS leases_insert_landlord ON leases;
CREATE POLICY leases_insert_landlord ON leases
  FOR INSERT
  WITH CHECK (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Landlords can update their leases
DROP POLICY IF EXISTS leases_update_landlord ON leases;
CREATE POLICY leases_update_landlord ON leases
  FOR UPDATE
  USING (
    landlord_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- ============================================================
-- Payments Table Policies
-- ============================================================

-- Landlords can view payments for their leases
DROP POLICY IF EXISTS payments_select_landlord ON payments;
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
DROP POLICY IF EXISTS payments_select_tenant ON payments;
CREATE POLICY payments_select_tenant ON payments
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Tenants can insert their own payments
DROP POLICY IF EXISTS payments_insert_tenant ON payments;
CREATE POLICY payments_insert_tenant ON payments
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Landlords can insert payments (for recording offline payments)
DROP POLICY IF EXISTS payments_insert_landlord ON payments;
CREATE POLICY payments_insert_landlord ON payments
  FOR INSERT
  WITH CHECK (
    lease_id IN (
      SELECT id FROM leases WHERE landlord_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- ============================================================
-- Documents Table Policies
-- ============================================================

-- Users can view documents they uploaded
DROP POLICY IF EXISTS documents_select_uploader ON documents;
CREATE POLICY documents_select_uploader ON documents
  FOR SELECT
  USING (
    uploaded_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can view documents shared with them
DROP POLICY IF EXISTS documents_select_shared ON documents;
CREATE POLICY documents_select_shared ON documents
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_id FROM users WHERE id = ANY(shared_with)
    )
  );

-- Landlords can view documents for their properties/leases
DROP POLICY IF EXISTS documents_select_landlord ON documents;
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
DROP POLICY IF EXISTS documents_select_tenant ON documents;
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
DROP POLICY IF EXISTS documents_insert_authenticated ON documents;
CREATE POLICY documents_insert_authenticated ON documents
  FOR INSERT
  WITH CHECK (
    uploaded_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- ============================================================
-- Signature Requests Table Policies
-- ============================================================

-- Users involved in lease can view signature requests
DROP POLICY IF EXISTS signature_requests_select_involved ON signature_requests;
CREATE POLICY signature_requests_select_involved ON signature_requests
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases 
      WHERE landlord_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
         OR auth.uid() IN (SELECT auth_id FROM users WHERE id = ANY(tenant_ids))
    )
  );

-- Landlords can create signature requests
DROP POLICY IF EXISTS signature_requests_insert_landlord ON signature_requests;
CREATE POLICY signature_requests_insert_landlord ON signature_requests
  FOR INSERT
  WITH CHECK (
    created_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- ============================================================
-- Maintenance Requests Table Policies
-- ============================================================

-- Tenants can view their maintenance requests
DROP POLICY IF EXISTS maintenance_select_tenant ON maintenance_requests;
CREATE POLICY maintenance_select_tenant ON maintenance_requests
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Landlords can view maintenance requests for their properties
DROP POLICY IF EXISTS maintenance_select_landlord ON maintenance_requests;
CREATE POLICY maintenance_select_landlord ON maintenance_requests
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Tenants can create maintenance requests
DROP POLICY IF EXISTS maintenance_insert_tenant ON maintenance_requests;
CREATE POLICY maintenance_insert_tenant ON maintenance_requests
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Landlords can update maintenance requests for their properties
DROP POLICY IF EXISTS maintenance_update_landlord ON maintenance_requests;
CREATE POLICY maintenance_update_landlord ON maintenance_requests
  FOR UPDATE
  USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- ============================================================
-- Messages Table Policies
-- ============================================================

-- Users can view messages they sent
DROP POLICY IF EXISTS messages_select_sender ON messages;
CREATE POLICY messages_select_sender ON messages
  FOR SELECT
  USING (
    sender_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can view messages sent to them
DROP POLICY IF EXISTS messages_select_recipient ON messages;
CREATE POLICY messages_select_recipient ON messages
  FOR SELECT
  USING (
    recipient_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can send messages
DROP POLICY IF EXISTS messages_insert_authenticated ON messages;
CREATE POLICY messages_insert_authenticated ON messages
  FOR INSERT
  WITH CHECK (
    sender_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can update messages they received (mark as read)
DROP POLICY IF EXISTS messages_update_recipient ON messages;
CREATE POLICY messages_update_recipient ON messages
  FOR UPDATE
  USING (
    recipient_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- ============================================================
-- Notifications Table Policies
-- ============================================================

-- Users can view their own notifications
DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- System can insert notifications (no auth required for service role)
DROP POLICY IF EXISTS notifications_insert_system ON notifications;
CREATE POLICY notifications_insert_system ON notifications
  FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- Audit Logs Policies
-- ============================================================

-- Only admins can view audit logs
DROP POLICY IF EXISTS audit_logs_select_admin ON audit_logs;
CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert audit logs
DROP POLICY IF EXISTS audit_logs_insert_system ON audit_logs;
CREATE POLICY audit_logs_insert_system ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- Payment Schedules Policies
-- ============================================================

-- Tenants can view their payment schedules
DROP POLICY IF EXISTS payment_schedules_select_tenant ON payment_schedules;
CREATE POLICY payment_schedules_select_tenant ON payment_schedules
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Landlords can view payment schedules for their leases
DROP POLICY IF EXISTS payment_schedules_select_landlord ON payment_schedules;
CREATE POLICY payment_schedules_select_landlord ON payment_schedules
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE landlord_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- ============================================================
-- User Preferences Policies
-- ============================================================

-- Users can view their own preferences
DROP POLICY IF EXISTS user_preferences_select_own ON user_preferences;
CREATE POLICY user_preferences_select_own ON user_preferences
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can update their own preferences
DROP POLICY IF EXISTS user_preferences_update_own ON user_preferences;
CREATE POLICY user_preferences_update_own ON user_preferences
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can insert their own preferences
DROP POLICY IF EXISTS user_preferences_insert_own ON user_preferences;
CREATE POLICY user_preferences_insert_own ON user_preferences
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );