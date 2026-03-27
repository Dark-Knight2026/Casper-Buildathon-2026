//! Database queries for transaction history endpoints.

use chrono::{DateTime, SecondsFormat, Utc};
use sqlx::PgPool;

use crate::transactions::models::{self, HashType, TransactionResponse, TxType};

/// Intermediate row fetched from `blockchain_transactions`.
struct TransactionRow {
    transaction_hash: String,
    block_number: Option<i64>,
    block_timestamp: Option<DateTime<Utc>>,
    amount: Option<String>,
    currency: Option<String>,
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
            block_height: row.block_number,
            timestamp: row
                .block_timestamp
                .map(|ts| ts.to_rfc3339_opts(SecondsFormat::Secs, true)),
            amount: row.amount,
            currency: row.currency,
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
/// When `transaction_type` is `Some`, only transactions of that type are returned.
/// When `from_type` is `Some`, only transactions with that sender type are returned
/// (0 = Account, 1 = Contract).
///
/// Uses `REPEATABLE READ` isolation so that SELECT and COUNT see the same snapshot.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_account_transactions(
    pool: &PgPool,
    address: &str,
    tx_type: Option<TxType>,
    from_type: Option<HashType>,
    limit: i64,
    offset: i64,
) -> Result<(Vec<TransactionResponse>, i64), sqlx::Error> {
    let transaction_type = tx_type.map(TxType::as_str);
    let from_type_val = from_type.map(HashType::as_i16);

    let mut tx = pool.begin().await?;
    sqlx::query!("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let rows = sqlx::query_as!(
        TransactionRow,
        r"
            SELECT transaction_hash, block_number, block_timestamp, amount, currency, contract_hash, from_address, from_type, to_address, to_type, transaction_type, transform_idx
            FROM blockchain_transactions
            WHERE (from_address = $1 OR to_address = $1)
              AND ($4::TEXT IS NULL OR transaction_type = $4)
              AND ($5::SMALLINT IS NULL OR from_type = $5)
            ORDER BY block_number DESC NULLS LAST, transform_idx NULLS LAST, transaction_hash DESC
            LIMIT $2 OFFSET $3
        ",
        address,
        limit,
        offset,
        transaction_type,
        from_type_val,
    )
    .fetch_all(tx.as_mut())
    .await?;

    let count = sqlx::query_scalar!(
        r"
            SELECT COUNT(*) FROM blockchain_transactions
            WHERE (from_address = $1 OR to_address = $1)
              AND ($2::TEXT IS NULL OR transaction_type = $2)
              AND ($3::SMALLINT IS NULL OR from_type = $3)
        ",
        address,
        transaction_type as Option<&str>,
        from_type_val,
    )
    .fetch_one(tx.as_mut())
    .await?
    .unwrap_or(0);

    tx.commit().await?;
    Ok((rows.into_iter().map(Into::into).collect(), count))
}

/// Fetches paginated transactions for a specific token contract.
///
/// Uses `REPEATABLE READ` isolation so that SELECT and COUNT see the same snapshot.
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
    sqlx::query!("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let rows = sqlx::query_as!(
        TransactionRow,
        r"
            SELECT transaction_hash, block_number, block_timestamp, amount, currency, contract_hash, from_address, from_type, to_address, to_type, transaction_type, transform_idx
            FROM blockchain_transactions
            WHERE contract_hash = $1
            ORDER BY block_number DESC NULLS LAST, transform_idx NULLS LAST, transaction_hash DESC
            LIMIT $2 OFFSET $3
        ",
        contract_hash,
        limit,
        offset,
    )
    .fetch_all(tx.as_mut())
    .await?;

    let count = sqlx::query_scalar!(
        r"
            SELECT COUNT(*) FROM blockchain_transactions
            WHERE contract_hash = $1
        ",
        contract_hash,
    )
    .fetch_one(tx.as_mut())
    .await?
    .unwrap_or(0);

    tx.commit().await?;
    Ok((rows.into_iter().map(Into::into).collect(), count))
}
