-- Migration: Create Materialized Views for Analytics Performance Optimization
-- Purpose: Reduce analytics query time from 320ms to <100ms (69% improvement)
-- Created: 2026-01-06
-- Author: Alex (Engineer)

-- ============================================================================
-- 1. LEASE ANALYTICS MATERIALIZED VIEW
-- ============================================================================

-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS lease_analytics_mv CASCADE;

-- Create materialized view for lease analytics
CREATE MATERIALIZED VIEW lease_analytics_mv AS
SELECT
  l.landlord_id,
  l.property_id,
  COUNT(DISTINCT l.id) as total_leases,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') as active_leases,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'expired') as expired_leases,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'terminated') as terminated_leases,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'expiring_soon') as expiring_soon_leases,
  
  -- Financial metrics
  SUM(l.monthly_rent) FILTER (WHERE l.status = 'active') as total_monthly_revenue,
  AVG(l.monthly_rent) FILTER (WHERE l.status = 'active') as average_monthly_rent,
  SUM(l.security_deposit) as total_security_deposits,
  
  -- Lease duration metrics
  AVG(l.end_date - l.start_date) as average_lease_duration_days,
  MIN(l.start_date) as earliest_lease_start,
  MAX(l.end_date) as latest_lease_end,
  
  -- Tenant metrics
  SUM(COALESCE(array_length(l.tenant_ids, 1), 0)) as total_tenants_count,
  
  -- Date aggregations
  DATE_TRUNC('month', CURRENT_DATE) as report_month,
  CURRENT_TIMESTAMP as last_refreshed
FROM leases l
WHERE l.deleted_at IS NULL
GROUP BY l.landlord_id, l.property_id;

-- Create indexes for fast lookups
CREATE UNIQUE INDEX idx_lease_analytics_mv_landlord_property 
  ON lease_analytics_mv(landlord_id, property_id);
CREATE INDEX idx_lease_analytics_mv_landlord 
  ON lease_analytics_mv(landlord_id);
CREATE INDEX idx_lease_analytics_mv_property 
  ON lease_analytics_mv(property_id);
CREATE INDEX idx_lease_analytics_mv_report_month 
  ON lease_analytics_mv(report_month);

-- Add comment
COMMENT ON MATERIALIZED VIEW lease_analytics_mv IS 
  'Pre-aggregated lease analytics for fast dashboard queries. Refresh every 5 minutes.';

-- ============================================================================
-- 2. PAYMENT HISTORY MATERIALIZED VIEW
-- ============================================================================

-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS payment_history_mv CASCADE;

-- Create materialized view for payment analytics
CREATE MATERIALIZED VIEW payment_history_mv AS
SELECT
  p.lease_id,
  p.tenant_id,
  p.property_id,
  l.landlord_id,
  
  -- Payment counts by status
  COUNT(*) as total_payments,
  COUNT(*) FILTER (WHERE p.payment_status = 'completed') as completed_payments,
  COUNT(*) FILTER (WHERE p.payment_status = 'pending') as pending_payments,
  COUNT(*) FILTER (WHERE p.payment_status = 'failed') as failed_payments,
  COUNT(*) FILTER (WHERE p.payment_status = 'refunded') as refunded_payments,
  
  -- Financial metrics
  SUM(p.amount) FILTER (WHERE p.payment_status = 'completed') as total_revenue,
  SUM(p.amount) FILTER (WHERE p.payment_status = 'pending') as pending_revenue,
  SUM(p.late_fee_amount) as total_late_fees,
  SUM(p.refund_amount) as total_refunds,
  
  -- Payment type breakdown
  SUM(p.amount) FILTER (WHERE p.payment_type = 'rent' AND p.payment_status = 'completed') as rent_revenue,
  SUM(p.amount) FILTER (WHERE p.payment_type = 'security_deposit' AND p.payment_status = 'completed') as deposit_revenue,
  SUM(p.amount) FILTER (WHERE p.payment_type = 'late_fee' AND p.payment_status = 'completed') as late_fee_revenue,
  
  -- On-time payment metrics
  COUNT(*) FILTER (WHERE p.is_late = false AND p.payment_status = 'completed') as on_time_payments,
  COUNT(*) FILTER (WHERE p.is_late = true AND p.payment_status = 'completed') as late_payments,
  ROUND(
    (COUNT(*) FILTER (WHERE p.is_late = false AND p.payment_status = 'completed')::DECIMAL / 
     NULLIF(COUNT(*) FILTER (WHERE p.payment_status = 'completed'), 0)) * 100, 
    2
  ) as on_time_payment_rate,
  
  -- Average metrics
  AVG(p.amount) FILTER (WHERE p.payment_status = 'completed') as average_payment_amount,
  AVG(p.days_late) FILTER (WHERE p.is_late = true) as average_days_late,
  
  -- Date ranges
  MIN(p.due_date) as earliest_payment_date,
  MAX(p.due_date) as latest_payment_date,
  DATE_TRUNC('month', CURRENT_DATE) as report_month,
  CURRENT_TIMESTAMP as last_refreshed
FROM payments p
JOIN leases l ON p.lease_id = l.id
GROUP BY p.lease_id, p.tenant_id, p.property_id, l.landlord_id;

-- Create indexes
CREATE UNIQUE INDEX idx_payment_history_mv_lease 
  ON payment_history_mv(lease_id);
CREATE INDEX idx_payment_history_mv_tenant 
  ON payment_history_mv(tenant_id);
CREATE INDEX idx_payment_history_mv_property 
  ON payment_history_mv(property_id);
CREATE INDEX idx_payment_history_mv_landlord 
  ON payment_history_mv(landlord_id);
CREATE INDEX idx_payment_history_mv_report_month 
  ON payment_history_mv(report_month);

-- Add comment
COMMENT ON MATERIALIZED VIEW payment_history_mv IS 
  'Pre-aggregated payment analytics for financial reports. Refresh every 5 minutes.';

-- ============================================================================
-- 3. PROPERTY PERFORMANCE MATERIALIZED VIEW
-- ============================================================================

-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS property_performance_mv CASCADE;

-- Create materialized view for property performance
CREATE MATERIALIZED VIEW property_performance_mv AS
SELECT
  p.id as property_id,
  p.landlord_id,
  p.name as property_name,
  p.property_type,
  p.city,
  p.state,
  
  -- Occupancy metrics
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') as active_leases,
  COUNT(DISTINCT l.id) as total_leases_all_time,
  CASE 
    WHEN COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') > 0 THEN true 
    ELSE false 
  END as is_occupied,
  
  -- Financial performance
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_status = 'completed'), 0) as total_revenue,
  COALESCE(SUM(pay.amount) FILTER (
    WHERE pay.payment_status = 'completed' 
    AND pay.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
  ), 0) as current_month_revenue,
  COALESCE(SUM(pay.amount) FILTER (
    WHERE pay.payment_status = 'completed' 
    AND pay.payment_date >= DATE_TRUNC('year', CURRENT_DATE)
  ), 0) as current_year_revenue,
  
  -- Maintenance metrics
  COUNT(DISTINCT m.id) as total_maintenance_requests,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status IN ('submitted', 'acknowledged', 'scheduled', 'in_progress')) as open_maintenance_requests,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'completed') as completed_maintenance_requests,
  COALESCE(SUM(m.actual_cost), 0) as total_maintenance_cost,
  COALESCE(AVG(m.actual_cost), 0) as average_maintenance_cost,
  
  -- Lease metrics
  COALESCE(AVG(l.monthly_rent) FILTER (WHERE l.status = 'active'), 0) as current_monthly_rent,
  MIN(l.start_date) as first_lease_date,
  MAX(l.end_date) as latest_lease_end_date,
  
  -- ROI calculation (simplified)
  CASE 
    WHEN p.purchase_price > 0 THEN
      ROUND(
        ((COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_status = 'completed'), 0) - 
          COALESCE(SUM(m.actual_cost), 0)) / p.purchase_price) * 100,
        2
      )
    ELSE 0
  END as roi_percentage,
  
  -- Date aggregations
  DATE_TRUNC('month', CURRENT_DATE) as report_month,
  CURRENT_TIMESTAMP as last_refreshed
FROM properties p
LEFT JOIN leases l ON p.id = l.property_id AND l.deleted_at IS NULL
LEFT JOIN payments pay ON l.id = pay.lease_id
LEFT JOIN maintenance_requests m ON p.id = m.property_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.landlord_id, p.name, p.property_type, p.city, p.state, p.purchase_price;

-- Create indexes
CREATE UNIQUE INDEX idx_property_performance_mv_property 
  ON property_performance_mv(property_id);
CREATE INDEX idx_property_performance_mv_landlord 
  ON property_performance_mv(landlord_id);
CREATE INDEX idx_property_performance_mv_occupied 
  ON property_performance_mv(is_occupied);
CREATE INDEX idx_property_performance_mv_city_state 
  ON property_performance_mv(city, state);
CREATE INDEX idx_property_performance_mv_report_month 
  ON property_performance_mv(report_month);

-- Add comment
COMMENT ON MATERIALIZED VIEW property_performance_mv IS 
  'Pre-aggregated property performance metrics for portfolio analysis. Refresh every 5 minutes.';

-- ============================================================================
-- 4. MAINTENANCE REQUEST STATISTICS MATERIALIZED VIEW
-- ============================================================================

-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS maintenance_statistics_mv CASCADE;

-- Create materialized view for maintenance statistics
CREATE MATERIALIZED VIEW maintenance_statistics_mv AS
SELECT
  m.property_id,
  p.landlord_id,
  
  -- Request counts by status
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE m.status = 'submitted') as submitted_requests,
  COUNT(*) FILTER (WHERE m.status = 'acknowledged') as acknowledged_requests,
  COUNT(*) FILTER (WHERE m.status = 'scheduled') as scheduled_requests,
  COUNT(*) FILTER (WHERE m.status = 'in_progress') as in_progress_requests,
  COUNT(*) FILTER (WHERE m.status = 'completed') as completed_requests,
  COUNT(*) FILTER (WHERE m.status = 'cancelled') as cancelled_requests,
  
  -- Request counts by priority
  COUNT(*) FILTER (WHERE m.priority = 'emergency') as emergency_requests,
  COUNT(*) FILTER (WHERE m.priority = 'high') as high_priority_requests,
  COUNT(*) FILTER (WHERE m.priority = 'medium') as medium_priority_requests,
  COUNT(*) FILTER (WHERE m.priority = 'low') as low_priority_requests,
  
  -- Request counts by category
  COUNT(*) FILTER (WHERE m.category = 'plumbing') as plumbing_requests,
  COUNT(*) FILTER (WHERE m.category = 'electrical') as electrical_requests,
  COUNT(*) FILTER (WHERE m.category = 'hvac') as hvac_requests,
  COUNT(*) FILTER (WHERE m.category = 'appliance') as appliance_requests,
  COUNT(*) FILTER (WHERE m.category = 'structural') as structural_requests,
  COUNT(*) FILTER (WHERE m.category = 'pest_control') as pest_control_requests,
  COUNT(*) FILTER (WHERE m.category = 'landscaping') as landscaping_requests,
  COUNT(*) FILTER (WHERE m.category = 'other') as other_requests,
  
  -- Cost metrics
  COALESCE(SUM(m.actual_cost), 0) as total_maintenance_cost,
  COALESCE(AVG(m.actual_cost), 0) as average_maintenance_cost,
  COALESCE(SUM(m.estimated_cost), 0) as total_estimated_cost,
  COALESCE(SUM(m.tenant_responsible_amount), 0) as total_tenant_charges,
  
  -- Time metrics (in days)
  AVG(EXTRACT(DAY FROM (m.completed_at - m.created_at))) FILTER (WHERE m.status = 'completed') as average_completion_time_days,
  AVG(EXTRACT(DAY FROM (m.acknowledged_at - m.created_at))) FILTER (WHERE m.acknowledged_at IS NOT NULL) as average_response_time_days,
  
  -- Current month metrics
  COUNT(*) FILTER (WHERE m.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as current_month_requests,
  COALESCE(SUM(m.actual_cost) FILTER (WHERE m.created_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) as current_month_cost,
  
  -- Date aggregations
  MIN(m.created_at) as earliest_request_date,
  MAX(m.created_at) as latest_request_date,
  DATE_TRUNC('month', CURRENT_DATE) as report_month,
  CURRENT_TIMESTAMP as last_refreshed
FROM maintenance_requests m
JOIN properties p ON m.property_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY m.property_id, p.landlord_id;

-- Create indexes
CREATE UNIQUE INDEX idx_maintenance_statistics_mv_property 
  ON maintenance_statistics_mv(property_id);
CREATE INDEX idx_maintenance_statistics_mv_landlord 
  ON maintenance_statistics_mv(landlord_id);
CREATE INDEX idx_maintenance_statistics_mv_report_month 
  ON maintenance_statistics_mv(report_month);

-- Add comment
COMMENT ON MATERIALIZED VIEW maintenance_statistics_mv IS 
  'Pre-aggregated maintenance request statistics for operations dashboard. Refresh every 5 minutes.';

-- ============================================================================
-- 5. REFRESH FUNCTION AND SCHEDULING
-- ============================================================================

-- Create function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_materialized_views()
RETURNS void AS $$
BEGIN
  -- Refresh all materialized views concurrently
  REFRESH MATERIALIZED VIEW CONCURRENTLY lease_analytics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY payment_history_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY property_performance_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY maintenance_statistics_mv;
  
  -- Log refresh completion
  RAISE NOTICE 'Analytics materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION refresh_analytics_materialized_views() IS 
  'Refreshes all analytics materialized views. Should be called every 5 minutes via cron job.';

-- ============================================================================
-- 6. HELPER FUNCTIONS FOR QUERYING MATERIALIZED VIEWS
-- ============================================================================

-- Function to get lease analytics for a landlord
CREATE OR REPLACE FUNCTION get_lease_analytics(p_landlord_id UUID)
RETURNS TABLE (
  property_id UUID,
  total_leases BIGINT,
  active_leases BIGINT,
  total_monthly_revenue NUMERIC,
  average_monthly_rent NUMERIC,
  total_unique_tenants BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    la.property_id,
    la.total_leases,
    la.active_leases,
    la.total_monthly_revenue,
    la.average_monthly_rent,
    la.total_unique_tenants
  FROM lease_analytics_mv la
  WHERE la.landlord_id = p_landlord_id
  ORDER BY la.total_monthly_revenue DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to get payment history for a landlord
CREATE OR REPLACE FUNCTION get_payment_analytics(p_landlord_id UUID)
RETURNS TABLE (
  property_id UUID,
  total_payments BIGINT,
  completed_payments BIGINT,
  total_revenue NUMERIC,
  on_time_payment_rate NUMERIC,
  total_late_fees NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ph.property_id,
    ph.total_payments,
    ph.completed_payments,
    ph.total_revenue,
    ph.on_time_payment_rate,
    ph.total_late_fees
  FROM payment_history_mv ph
  WHERE ph.landlord_id = p_landlord_id
  ORDER BY ph.total_revenue DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to get property performance for a landlord
CREATE OR REPLACE FUNCTION get_property_performance(p_landlord_id UUID)
RETURNS TABLE (
  property_id UUID,
  property_name VARCHAR,
  is_occupied BOOLEAN,
  current_monthly_rent NUMERIC,
  total_revenue NUMERIC,
  total_maintenance_cost NUMERIC,
  roi_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.property_id,
    pp.property_name,
    pp.is_occupied,
    pp.current_monthly_rent,
    pp.total_revenue,
    pp.total_maintenance_cost,
    pp.roi_percentage
  FROM property_performance_mv pp
  WHERE pp.landlord_id = p_landlord_id
  ORDER BY pp.roi_percentage DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to get maintenance statistics for a landlord
CREATE OR REPLACE FUNCTION get_maintenance_analytics(p_landlord_id UUID)
RETURNS TABLE (
  property_id UUID,
  total_requests BIGINT,
  completed_requests BIGINT,
  open_requests BIGINT,
  total_maintenance_cost NUMERIC,
  average_completion_time_days NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.property_id,
    ms.total_requests,
    ms.completed_requests,
    (ms.submitted_requests + ms.acknowledged_requests + ms.scheduled_requests + ms.in_progress_requests) as open_requests,
    ms.total_maintenance_cost,
    ms.average_completion_time_days
  FROM maintenance_statistics_mv ms
  WHERE ms.landlord_id = p_landlord_id
  ORDER BY ms.total_maintenance_cost DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT permissions on materialized views to authenticated users
GRANT SELECT ON lease_analytics_mv TO authenticated;
GRANT SELECT ON payment_history_mv TO authenticated;
GRANT SELECT ON property_performance_mv TO authenticated;
GRANT SELECT ON maintenance_statistics_mv TO authenticated;

-- Grant EXECUTE permissions on helper functions
GRANT EXECUTE ON FUNCTION refresh_analytics_materialized_views() TO authenticated;
GRANT EXECUTE ON FUNCTION get_lease_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_performance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_maintenance_analytics(UUID) TO authenticated;

-- ============================================================================
-- 8. INITIAL REFRESH
-- ============================================================================

-- Perform initial refresh of all materialized views
SELECT refresh_analytics_materialized_views();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Expected Performance Improvement:
-- Before: 320ms average for analytics queries
-- After: <100ms average (69% improvement)
-- 
-- Refresh Strategy:
-- - Materialized views refresh every 5 minutes via cron job
-- - CONCURRENTLY option allows queries during refresh
-- - Unique indexes enable concurrent refresh
-- 
-- Usage Example:
-- SELECT * FROM get_lease_analytics('landlord-uuid-here');
-- SELECT * FROM get_payment_analytics('landlord-uuid-here');
-- SELECT * FROM get_property_performance('landlord-uuid-here');
-- SELECT * FROM get_maintenance_analytics('landlord-uuid-here');