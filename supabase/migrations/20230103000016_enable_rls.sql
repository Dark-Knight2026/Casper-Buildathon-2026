-- ============================================================
-- Migration: Enable Row Level Security (RLS)
-- Description: Enable RLS on all tables for multi-tenant security
-- Created: 2026-01-03
-- ============================================================

-- Enable RLS on all tables
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

-- Comments
COMMENT ON TABLE users IS 'RLS enabled - users can only access their own data and related users';
COMMENT ON TABLE properties IS 'RLS enabled - landlords can access their properties, tenants can access leased properties';
COMMENT ON TABLE leases IS 'RLS enabled - landlords and tenants can access their leases';
COMMENT ON TABLE payments IS 'RLS enabled - landlords and tenants can access their payments';
COMMENT ON TABLE documents IS 'RLS enabled - users can access documents they uploaded or that are shared with them';
COMMENT ON TABLE messages IS 'RLS enabled - users can access messages they sent or received';
COMMENT ON TABLE notifications IS 'RLS enabled - users can only access their own notifications';
COMMENT ON TABLE audit_logs IS 'RLS enabled - only admins can access audit logs';