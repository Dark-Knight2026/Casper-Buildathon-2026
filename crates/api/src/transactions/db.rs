//! Database queries for transaction history endpoints.

use chrono::{DateTime, SecondsFormat, Utc};
use sqlx::PgPool;

use crate::transactions::models::{self, TransactionResponse};

/// Intermediate row fetched from `blockchain_transactions`.
struct TransactionRow {
    transaction_hash: String,
    block_number: Option<i64>,
    block_timestamp: Option<DateTime<Utc>>,
    amount: Option<String>,
    contract_hash: Option<String>,
    from_address: String,
    from_type: Option<i16>,
    to_address: Option<String>,
    to_type: Option<i16>,
    transaction_type: String,
    transform_idx: Option<i32>,
}

impl From<TransactionRow> for TransactionResponse {
    #[inline]
    fn from(row: TransactionRow) -> Self {
        Self {
            deploy_hash: row.transaction_hash,
            block_height: row.block_number.unwrap_or(0),
            timestamp: row
                .block_timestamp
                .map(|ts| ts.to_rfc3339_opts(SecondsFormat::Secs, true)),
            amount: row.amount,
            contract_package_hash: row.contract_hash,
            from_hash: row.from_address,
            from_type: row.from_type,
            to_hash: row.to_address,
            to_type: row.to_type,
            ft_action_type_id: models::ft_action_type_id(&row.transaction_type),
            transform_idx: row.transform_idx,
        }
    }
}

/// Fetches paginated transactions where the given address is sender or recipient.
///
/// Uses a single transaction to keep the SELECT and COUNT on one connection.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_account_transactions(
    pool: &PgPool,
    address: &str,
    limit: i64,
    offset: i64,
) -> Result<(Vec<TransactionResponse>, i64), sqlx::Error> {
    let mut tx = pool.begin().await?;

    let rows = sqlx::query_as!(
        TransactionRow,
        r"
            SELECT transaction_hash, block_number, block_timestamp, amount, contract_hash, from_address, from_type, to_address, to_type, transaction_type, transform_idx
            FROM blockchain_transactions
            WHERE from_address = $1 OR to_address = $1
            ORDER BY block_number DESC NULLS LAST, confirmed_at DESC
            LIMIT $2 OFFSET $3
        ",
        address,
        limit,
        offset,
    )
    .fetch_all(tx.as_mut())
    .await?;

    let count = sqlx::query_scalar!(
        r"
            SELECT COUNT(*) FROM blockchain_transactions
            WHERE from_address = $1 OR to_address = $1
        ",
        address,
    )
    .fetch_one(tx.as_mut())
    .await?
    .unwrap_or(0);

    tx.commit().await?;
    Ok((rows.into_iter().map(Into::into).collect(), count))
}

/// Fetches paginated transactions for a specific token contract.
///
/// Uses a single transaction to keep the SELECT and COUNT on one connection.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_token_transactions(
    pool: &PgPool,
    contract_hash: &str,
    limit: i64,
    offset: i64,
) -> Result<(Vec<TransactionResponse>, i64), sqlx::Error> {
    let mut tx = pool.begin().await?;

    let rows = sqlx::query_as!(
        TransactionRow,
        r"
            SELECT transaction_hash, block_number, block_timestamp, amount, contract_hash, from_address, from_type, to_address, to_type, transaction_type, transform_idx
            FROM blockchain_transactions
            WHERE contract_hash = $1
            ORDER BY block_number DESC NULLS LAST, confirmed_at DESC
            LIMIT $2 OFFSET $3
        ",
        contract_hash,
        limit,
        offset,
    )
    .fetch_all(&mut *tx)
    .await?;

    let count = sqlx::query_scalar!(
        r"
            SELECT COUNT(*) FROM blockchain_transactions
            WHERE contract_hash = $1
        ",
        contract_hash,
    )
    .fetch_one(&mut *tx)
    .await?
    .unwrap_or(0);

    tx.commit().await?;
    Ok((rows.into_iter().map(Into::into).collect(), count))
}
