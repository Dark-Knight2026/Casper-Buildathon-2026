-- Replace ON DELETE SET NULL with ON DELETE RESTRICT on
-- refresh_tokens.replaced_by so a cleanup job cannot silently break the
-- audit chain by deleting a successor while its predecessor still
-- references it.
--
-- The original migration (20260422000003_create_refresh_tokens_table.sql)
-- chose SET NULL with the rationale "on delete of the predecessor we SET
-- NULL so the successor stays intact". That comment described the wrong
-- direction of the chain: replaced_by points predecessor -> successor,
-- so the FK fires when the *successor* is deleted, not the predecessor.
-- SET NULL therefore turns out-of-order cleanup (e.g. a job that deletes
-- expired tokens in PG planner order rather than oldest-first) into a
-- silent corruption: every predecessor whose successor was wiped first
-- ends up with replaced_by = NULL, indistinguishable from a current
-- (latest-in-chain) row.
--
-- RESTRICT replaces the silent corruption with a loud FK violation,
-- forcing cleanup policy to be explicit about chain order.
--
-- Cleanup policy implications (must be respected by any future
-- cleanup-job implementation):
--   * Delete oldest-first. Walk each family from the head (the row
--     whose replaced_by is NULL) backwards, NULL-ing replaced_by on
--     each step before deleting, OR delete by ascending issued_at and
--     accept that the predecessor row goes away before any successor
--     row that pointed at it (fine, because the successor is no longer
--     referenced after the chain head moves).
--   * Or use soft-delete: set revoked_at and an explicit deleted_at
--     marker, leaving the row in place. Audit chain remains intact.
-- Either path is fine; the schema now refuses the third path (random
-- DELETE order) that the previous SET NULL tolerated.

ALTER TABLE refresh_tokens
    DROP CONSTRAINT refresh_tokens_replaced_by_fkey;

ALTER TABLE refresh_tokens
    ADD CONSTRAINT refresh_tokens_replaced_by_fkey
        FOREIGN KEY (replaced_by)
        REFERENCES refresh_tokens(id)
        ON DELETE RESTRICT;

COMMENT ON COLUMN refresh_tokens.replaced_by IS
    'Points to the token this one was rotated into; NULL for the current (latest) token in the chain. ON DELETE RESTRICT: cleanup must walk chains oldest-first or use soft-delete - random-order DELETE will fail loudly instead of silently NULLing the chain pointer.';
