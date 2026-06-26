-- ============================================================
-- Migration: Create Database Triggers
-- Description: Automated triggers for timestamp updates, audit logs, etc.
-- Created: 2026-01-03
-- ============================================================

-- ============================================================
-- Timestamp Update Triggers
-- ============================================================

-- Users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Properties table
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Leases table
DROP TRIGGER IF EXISTS update_leases_updated_at ON leases;
CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Payments table
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Documents table
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Signature Requests table
DROP TRIGGER IF EXISTS update_signature_requests_updated_at ON signature_requests;
CREATE TRIGGER update_signature_requests_updated_at
  BEFORE UPDATE ON signature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Maintenance Requests table
DROP TRIGGER IF EXISTS update_maintenance_requests_updated_at ON maintenance_requests;
CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Messages table
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Payment Schedules table
DROP TRIGGER IF EXISTS update_payment_schedules_updated_at ON payment_schedules;
CREATE TRIGGER update_payment_schedules_updated_at
  BEFORE UPDATE ON payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- User Preferences table
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Audit Log Triggers
-- ============================================================

-- Leases audit
DROP TRIGGER IF EXISTS audit_leases ON leases;
CREATE TRIGGER audit_leases
  AFTER INSERT OR UPDATE OR DELETE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Payments audit
DROP TRIGGER IF EXISTS audit_payments ON payments;
CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Properties audit
DROP TRIGGER IF EXISTS audit_properties ON properties;
CREATE TRIGGER audit_properties
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- ============================================================
-- Business Logic Triggers
-- ============================================================

-- Auto-generate lease number
DROP TRIGGER IF EXISTS generate_lease_number_trigger ON leases;
CREATE TRIGGER generate_lease_number_trigger
  BEFORE INSERT ON leases
  FOR EACH ROW
  EXECUTE FUNCTION set_lease_number();

-- Calculate late fees on payment completion
DROP TRIGGER IF EXISTS calculate_late_fee_trigger ON payments;
CREATE TRIGGER calculate_late_fee_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW
  WHEN (NEW.payment_date IS NOT NULL AND OLD.payment_date IS NULL)
  EXECUTE FUNCTION check_payment_late_fee();

-- Comments
COMMENT ON TRIGGER update_users_updated_at ON users IS 'Auto-updates updated_at timestamp';
COMMENT ON TRIGGER audit_leases ON leases IS 'Creates audit log for lease changes';
COMMENT ON TRIGGER generate_lease_number_trigger ON leases IS 'Auto-generates unique lease number';
COMMENT ON TRIGGER calculate_late_fee_trigger ON payments IS 'Calculates late fees when payment is completed';