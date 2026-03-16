-- Add updated_at column to ico_schedules for audit trail on UPSERT updates.

ALTER TABLE ico_schedules
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
