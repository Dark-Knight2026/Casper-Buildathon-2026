-- Fix generate_lease_number() for the 4-digit year format.
--
-- The format is LS<year>-<counter> (e.g. LS2026-00001), but the running counter
-- was sliced with SUBSTRING(lease_number FROM 6) - an offset written for a
-- 2-digit year. With a 4-digit year, FROM 6 starts inside the year, yielding
-- "6-00001", so CAST(... AS INTEGER) failed on the second lease of any year
-- (the first skips the slice because no rows match yet).
--
-- Use SPLIT_PART(lease_number, '-', 2) to take the counter after the '-'
-- separator, which is robust to the year's digit count.
CREATE OR REPLACE FUNCTION generate_lease_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year VARCHAR(4);
  v_sequence INTEGER;
  v_lease_number VARCHAR(50);
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

  -- Next sequence number for this year (counter is the part after the '-').
  SELECT COALESCE(MAX(SPLIT_PART(lease_number, '-', 2)::INTEGER), 0) + 1
  INTO v_sequence
  FROM leases
  WHERE lease_number LIKE 'LS' || v_year || '-%';

  -- Format: LS2026-00001
  v_lease_number := 'LS' || v_year || '-' || LPAD(v_sequence::VARCHAR, 5, '0');

  RETURN v_lease_number;
END;
$$ LANGUAGE plpgsql;
