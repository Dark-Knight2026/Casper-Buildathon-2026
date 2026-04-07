#!/usr/bin/env bash
#
# Rebuild blockchain_transactions composite indexes using CONCURRENTLY
# to avoid blocking locks on a live database.
#
# CONCURRENTLY cannot run inside a transaction block, which is why the
# Supabase CLI migration pipeline (SQLSTATE 25001) cannot use this form.
# Run this script manually against a live database instead.
#
# Usage:
#   ./scripts/rebuild_tx_indexes_concurrently.sh <DATABASE_URL>
#
# Example:
#   ./scripts/rebuild_tx_indexes_concurrently.sh "postgresql://user:pass@host:5432/db"

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <DATABASE_URL>"
    exit 1
fi

DATABASE_URL="$1"

# Parse DATABASE_URL into individual libpq env vars
# so the password never appears in the process list (ps aux / /proc/PID/cmdline).
export PGUSER PGPASSWORD PGHOST PGPORT PGDATABASE
PGUSER=$(echo     "$DATABASE_URL" | sed -E 's|.*://([^:@]*).*|\1|')
PGPASSWORD=$(echo "$DATABASE_URL" | sed -E 's|.*://[^:]*:([^@]*)@.*|\1|')
PGHOST=$(echo     "$DATABASE_URL" | sed -E 's|.*@([^:/]*).*|\1|')
PGPORT=$(echo     "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
PGDATABASE=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]*).*|\1|')

echo "Dropping old indexes concurrently..."

psql -c "DROP INDEX CONCURRENTLY IF EXISTS idx_blockchain_tx_from_address;"
psql -c "DROP INDEX CONCURRENTLY IF EXISTS idx_blockchain_tx_to_address;"
psql -c "DROP INDEX CONCURRENTLY IF EXISTS idx_blockchain_tx_contract_hash;"

echo "Creating composite indexes concurrently..."

psql -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blockchain_tx_from_address
    ON blockchain_transactions (from_address, block_number DESC NULLS LAST, transform_idx DESC NULLS LAST);"

psql -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blockchain_tx_to_address
    ON blockchain_transactions (to_address, block_number DESC NULLS LAST, transform_idx DESC NULLS LAST);"

psql -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blockchain_tx_contract_hash
    ON blockchain_transactions (contract_hash, block_number DESC NULLS LAST, transform_idx DESC NULLS LAST);"

echo "Done. Verify with: psql -c '\\di blockchain_transactions'"
