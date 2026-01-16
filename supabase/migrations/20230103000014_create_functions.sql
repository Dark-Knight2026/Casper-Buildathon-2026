-- ============================================================
-- Migration: Create Database Functions
-- Description: Utility functions for the lease management system
-- Created: 2026-01-03
-- ============================================================

-- ============================================================
-- Function 1: Update Timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at timestamp';

-- ============================================================
-- Function 2: Calculate Late Fees
-- ============================================================
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
  v_days_late := EXTRACT(DAY FROM (v_payment_date - v_due_date))::INTEGER;
  
  -- Apply grace period
  IF v_days_late <= v_grace_period THEN
    RETURN 0;
  END IF;
  
  -- Return late fee
  RETURN v_late_fee_amount;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_late_fee(UUID) IS 'Calculates late fee for a payment based on lease terms';

-- ============================================================
-- Function 3: Get Expiring Leases
-- ============================================================
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

COMMENT ON FUNCTION get_expiring_leases(INTEGER) IS 'Returns leases expiring within specified days';

-- ============================================================
-- Function 4: Generate Lease Number
-- ============================================================
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

COMMENT ON FUNCTION generate_lease_number() IS 'Generates unique lease number in format LS2026-00001';

-- ============================================================
-- Function 5: Calculate Occupancy Rate
-- ============================================================
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

COMMENT ON FUNCTION calculate_occupancy_rate(UUID) IS 'Calculates property occupancy rate for a landlord or overall';

-- ============================================================
-- Function 6: Create Audit Log Entry
-- ============================================================
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    status
  ) VALUES (
    (SELECT id FROM users WHERE auth_id = auth.uid()),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    'success'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_audit_log() IS 'Creates audit log entries for table changes';

-- ============================================================
-- Function 7: Set Lease Number
-- ============================================================
CREATE OR REPLACE FUNCTION set_lease_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lease_number IS NULL THEN
    NEW.lease_number := generate_lease_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_lease_number() IS 'Auto-generates lease number if not provided';

-- ============================================================
-- Function 8: Check Payment Late Fee
-- ============================================================
CREATE OR REPLACE FUNCTION check_payment_late_fee()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_date IS NOT NULL AND NEW.payment_status = 'completed' THEN
    NEW.days_late := GREATEST(0, EXTRACT(DAY FROM (NEW.payment_date::DATE - NEW.due_date))::INTEGER);
    
    IF NEW.days_late > 0 THEN
      NEW.is_late := true;
      -- Calculate late fee based on lease terms
      NEW.late_fee_amount := calculate_late_fee(NEW.id);
    ELSE
      NEW.is_late := false;
      NEW.late_fee_amount := 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_payment_late_fee() IS 'Calculates late fees when payment is completed';