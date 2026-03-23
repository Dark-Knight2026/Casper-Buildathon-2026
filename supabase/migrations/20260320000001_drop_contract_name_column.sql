-- Drop redundant contract_name column from contract_registry.
-- contract_name has always been identical to contract_type and carries no
-- distinct information (see review finding D-3).

ALTER TABLE contract_registry DROP COLUMN IF EXISTS contract_name;
