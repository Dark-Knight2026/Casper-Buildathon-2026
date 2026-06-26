-- Analytics Materialized Views Migration
-- This migration creates materialized views for faster analytics queries

BEGIN;

-- ============================================================================
-- 1. Financial Summary View
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS financial_summary AS
SELECT 
  p.landlord_id,
  p.id as property_id,
  p.name as property_name,
  DATE_TRUNC('month', pay.payment_date) as month,
  SUM(CASE WHEN pay.payment_type = 'rent' THEN pay.amount ELSE 0 END) as rent_revenue,
  SUM(CASE WHEN pay.payment_type = 'late_fee' THEN pay.amount ELSE 0 END) as late_fee_revenue,
  SUM(CASE WHEN pay.payment_type = 'security_deposit' THEN pay.amount ELSE 0 END) as deposit_revenue,
  SUM(CASE WHEN pay.payment_type IN ('rent', 'late_fee', 'security_deposit') THEN pay.amount ELSE 0 END) as total_revenue,
  SUM(CASE WHEN pay.payment_type = 'maintenance' THEN pay.amount ELSE 0 END) as maintenance_expense,
  SUM(CASE WHEN pay.payment_type = 'utility' THEN pay.amount ELSE 0 END) as utility_expense,
  SUM(CASE WHEN pay.payment_type = 'insurance' THEN pay.amount ELSE 0 END) as insurance_expense,
  SUM(CASE WHEN pay.payment_type = 'tax' THEN pay.amount ELSE 0 END) as tax_expense,
  SUM(CASE WHEN pay.payment_type IN ('maintenance', 'utility', 'insurance', 'tax') THEN pay.amount ELSE 0 END) as total_expense,
  COUNT(DISTINCT l.tenant_id) as tenant_count,
  COUNT(DISTINCT CASE WHEN pay.status = 'completed' THEN pay.id END) as completed_payments,
  COUNT(DISTINCT CASE WHEN pay.status = 'late' THEN pay.id END) as late_payments
FROM properties p
LEFT JOIN leases l ON p.id = l.property_id
LEFT JOIN payments pay ON l.id = pay.lease_id
WHERE pay.payment_date IS NOT NULL
GROUP BY p.landlord_id, p.id, p.name, DATE_TRUNC('month', pay.payment_date);

CREATE INDEX IF NOT EXISTS idx_financial_summary_landlord ON financial_summary(landlord_id);
CREATE INDEX IF NOT EXISTS idx_financial_summary_property ON financial_summary(property_id);
CREATE INDEX IF NOT EXISTS idx_financial_summary_month ON financial_summary(month);

-- ============================================================================
-- 2. Occupancy Summary View
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS occupancy_summary AS
SELECT 
  p.landlord_id,
  p.id as property_id,
  p.name as property_name,
  p.property_type,
  p.address,
  DATE_TRUNC('month', CURRENT_DATE) as month,
  COALESCE(p.units, 1) as total_units,
  COUNT(l.id) FILTER (WHERE l.status = 'active' AND l.end_date >= CURRENT_DATE) as occupied_units,
  COALESCE(p.units, 1) - COUNT(l.id) FILTER (WHERE l.status = 'active' AND l.end_date >= CURRENT_DATE) as vacant_units,
  CASE 
    WHEN COALESCE(p.units, 1) > 0 
    THEN (COUNT(l.id) FILTER (WHERE l.status = 'active' AND l.end_date >= CURRENT_DATE)::FLOAT / COALESCE(p.units, 1)::FLOAT) * 100
    ELSE 0 
  END as occupancy_rate,
  AVG(EXTRACT(EPOCH FROM (l.end_date - l.start_date))/86400) FILTER (WHERE l.status IN ('active', 'completed')) as avg_lease_duration_days,
  COUNT(l.id) FILTER (WHERE l.status = 'completed' AND l.end_date >= CURRENT_DATE - INTERVAL '12 months') as lease_completions_12mo,
  COUNT(l.id) FILTER (WHERE l.status = 'active') as active_leases,
  p.monthly_rent as avg_rent
FROM properties p
LEFT JOIN leases l ON p.id = l.property_id
GROUP BY p.landlord_id, p.id, p.name, p.property_type, p.address, p.units, p.monthly_rent;

CREATE INDEX IF NOT EXISTS idx_occupancy_summary_landlord ON occupancy_summary(landlord_id);
CREATE INDEX IF NOT EXISTS idx_occupancy_summary_property ON occupancy_summary(property_id);

-- ============================================================================
-- 3. Maintenance Summary View
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS maintenance_summary AS
SELECT 
  p.landlord_id,
  p.id as property_id,
  p.name as property_name,
  DATE_TRUNC('month', mr.created_at) as month,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE mr.status = 'completed') as completed_requests,
  COUNT(*) FILTER (WHERE mr.status = 'in_progress') as in_progress_requests,
  COUNT(*) FILTER (WHERE mr.status = 'pending') as pending_requests,
  COUNT(*) FILTER (WHERE mr.priority = 'emergency') as emergency_requests,
  COUNT(*) FILTER (WHERE mr.priority = 'high') as high_priority_requests,
  AVG(EXTRACT(EPOCH FROM (mr.completed_at - mr.created_at))/3600) FILTER (WHERE mr.status = 'completed') as avg_resolution_hours,
  SUM(COALESCE(mr.actual_cost, mr.estimated_cost, 0)) as total_cost,
  AVG(COALESCE(mr.actual_cost, mr.estimated_cost, 0)) as avg_cost,
  MAX(COALESCE(mr.actual_cost, mr.estimated_cost, 0)) as max_cost,
  mr.category as request_category
FROM maintenance_requests mr
JOIN properties p ON mr.property_id = p.id
GROUP BY p.landlord_id, p.id, p.name, DATE_TRUNC('month', mr.created_at), mr.category;

CREATE INDEX IF NOT EXISTS idx_maintenance_summary_landlord ON maintenance_summary(landlord_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_summary_property ON maintenance_summary(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_summary_month ON maintenance_summary(month);

-- ============================================================================
-- 4. Tenant Summary View
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_summary AS
SELECT 
  l.landlord_id,
  t.id as tenant_id,
  t.first_name,
  t.last_name,
  t.email,
  t.phone,
  COUNT(DISTINCT le.id) as total_leases,
  COUNT(DISTINCT le.id) FILTER (WHERE le.status = 'active') as active_leases,
  MIN(le.start_date) as first_lease_date,
  MAX(le.end_date) as latest_lease_end,
  EXTRACT(EPOCH FROM (MAX(le.end_date) - MIN(le.start_date)))/86400 as total_tenure_days,
  COUNT(DISTINCT pay.id) as total_payments,
  COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'completed') as on_time_payments,
  COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'late') as late_payments,
  CASE 
    WHEN COUNT(DISTINCT pay.id) > 0 
    THEN (COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'completed')::FLOAT / COUNT(DISTINCT pay.id)::FLOAT) * 100
    ELSE 0 
  END as on_time_payment_rate,
  SUM(pay.amount) FILTER (WHERE pay.status IN ('completed', 'late')) as total_paid,
  COUNT(DISTINCT mr.id) as maintenance_requests_count,
  AVG(COALESCE(t.rating, 0)) as avg_rating
FROM tenants t
LEFT JOIN leases le ON t.id = le.tenant_id
LEFT JOIN payments pay ON le.id = pay.lease_id
LEFT JOIN maintenance_requests mr ON le.id = mr.lease_id
LEFT JOIN properties p ON le.property_id = p.id
WHERE p.landlord_id IS NOT NULL
GROUP BY l.landlord_id, t.id, t.first_name, t.last_name, t.email, t.phone;

CREATE INDEX IF NOT EXISTS idx_tenant_summary_landlord ON tenant_summary(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tenant_summary_tenant ON tenant_summary(tenant_id);

-- ============================================================================
-- 5. Property Performance View
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS property_performance AS
SELECT 
  p.landlord_id,
  p.id as property_id,
  p.name as property_name,
  p.property_type,
  p.address,
  p.monthly_rent,
  p.purchase_price,
  
  -- Financial metrics
  COALESCE(fs.total_revenue, 0) as total_revenue,
  COALESCE(fs.total_expense, 0) as total_expense,
  COALESCE(fs.total_revenue, 0) - COALESCE(fs.total_expense, 0) as net_operating_income,
  CASE 
    WHEN p.purchase_price > 0 
    THEN ((COALESCE(fs.total_revenue, 0) - COALESCE(fs.total_expense, 0)) / p.purchase_price) * 100
    ELSE 0 
  END as cap_rate,
  
  -- Occupancy metrics
  COALESCE(os.occupancy_rate, 0) as occupancy_rate,
  COALESCE(os.vacant_units, 0) as vacant_units,
  COALESCE(os.avg_lease_duration_days, 0) as avg_lease_duration_days,
  
  -- Maintenance metrics
  COALESCE(ms.total_requests, 0) as maintenance_requests,
  COALESCE(ms.total_cost, 0) as maintenance_cost,
  COALESCE(ms.avg_resolution_hours, 0) as avg_maintenance_resolution_hours,
  
  -- Performance score (0-100)
  (
    (COALESCE(os.occupancy_rate, 0) * 0.3) +
    (CASE WHEN COALESCE(ms.avg_resolution_hours, 999) < 48 THEN 30 ELSE 15 END) +
    (CASE WHEN COALESCE(fs.total_revenue, 0) > COALESCE(fs.total_expense, 0) THEN 40 ELSE 20 END)
  ) as performance_score
  
FROM properties p
LEFT JOIN (
  SELECT property_id, SUM(total_revenue) as total_revenue, SUM(total_expense) as total_expense
  FROM financial_summary
  WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
  GROUP BY property_id
) fs ON p.id = fs.property_id
LEFT JOIN occupancy_summary os ON p.id = os.property_id
LEFT JOIN (
  SELECT property_id, SUM(total_requests) as total_requests, SUM(total_cost) as total_cost, AVG(avg_resolution_hours) as avg_resolution_hours
  FROM maintenance_summary
  WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
  GROUP BY property_id
) ms ON p.id = ms.property_id;

CREATE INDEX IF NOT EXISTS idx_property_performance_landlord ON property_performance(landlord_id);
CREATE INDEX IF NOT EXISTS idx_property_performance_property ON property_performance(property_id);
CREATE INDEX IF NOT EXISTS idx_property_performance_score ON property_performance(performance_score DESC);

-- ============================================================================
-- 6. Refresh Function
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY financial_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY occupancy_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY maintenance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY property_performance;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Scheduled Refresh (using pg_cron extension if available)
-- ============================================================================
-- Note: This requires pg_cron extension to be enabled
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('refresh-analytics', '0 2 * * *', 'SELECT refresh_analytics_views()');

-- ============================================================================
-- 8. Manual Refresh Trigger (for testing)
-- ============================================================================
-- Call this function to manually refresh all views:
-- SELECT refresh_analytics_views();

COMMIT;