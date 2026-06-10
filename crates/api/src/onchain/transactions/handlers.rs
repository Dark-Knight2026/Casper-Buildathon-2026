//! HTTP request handlers for transaction history endpoints.

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, Query, State},
};

use serde::Deserialize;
use utoipa::IntoParams;

use crate::{
    common::{self, ApiError, ApiResult, AppState, ErrorResponse, PaginatedResponse, Pagination},
    onchain::transactions::{
        db,
        models::{HashType, TransactionResponse, TxType},
    },
};

/// Query parameters for account transaction listing (pagination + filter).
///
/// `page` and `page_size` are duplicated from [`Pagination`] because
/// `serde_urlencoded` (used by axum's `Query`) does not support `#[serde(flatten)]`.
#[derive(Debug, Default, Deserialize, IntoParams)]
pub struct AccountTxQuery {
    /// Page number (1-based, defaults to 1).
    #[serde(default)]
    pub page: Option<i64>,
    /// Items per page (1-100, defaults to 25).
    #[serde(default)]
    pub page_size: Option<i64>,
    /// Filter by transaction type (e.g. `token_purchase`, `token_transfer`, `token_mint`, `token_allowance`).
    #[serde(rename = "type")]
    pub tx_type: Option<TxType>,
    /// Filter by sender address type (0 = Account, 1 = Contract).
    pub from_type: Option<HashType>,
}

impl AccountTxQuery {
    /// Convert the embedded pagination fields into a [`Pagination`] value.
    fn pagination(&self) -> Pagination {
        Pagination {
            page: self.page,
            page_size: self.page_size,
        }
    }
}

// `GET /api/v1/transactions/account/{address}`
//
/// Returns paginated transaction history for a specific account.
///
/// Matches transactions where the account is either the sender (`from_address`)
/// or the recipient (`to_address`).
///
/// # Errors
///
/// Returns `ApiError::BadRequest` if the address is not 64 hex characters.
#[utoipa::path(
    get,
    path = "/account/{address}",
    tag = "Transactions",
    params(
        ("address" = String, Path, description = "Account hash (64 hex, no prefix)"),
        ("type" = Option<TxType>, Query, description = "Filter by transaction type: token_purchase, token_transfer, token_mint, token_allowance"),
        ("from_type" = Option<HashType>, Query, description = "Filter by sender address type: 0 = Account, 1 = Contract"),
        Pagination,
    ),
    responses(
        (status = 200, description = "Paginated transaction list", body = inline(PaginatedResponse<TransactionResponse>)),
        (status = 400, description = "Invalid address format", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[inline]
pub async fn get_account_transactions(
    State(state): State<Arc<AppState>>,
    Path(address): Path<String>,
    Query(query): Query<AccountTxQuery>,
) -> ApiResult<Json<PaginatedResponse<TransactionResponse>>> {
    let address = common::validate_account(&address)?;

    if let Some(HashType::Unknown(v)) = query.from_type {
        return Err(ApiError::BadRequest(format!(
            "Invalid from_type: {v}. Expected 0 (Account) or 1 (Contract)"
        )));
    }

    let pagination = query.pagination();
    let (data, item_count) = db::fetch_account_transactions(
        &state.db,
        &address,
        query.tx_type,
        query.from_type,
        pagination.page_size(),
        pagination.offset(),
    )
    .await?;

    Ok(Json(PaginatedResponse::new(data, item_count, &pagination)))
}

// `GET /api/v1/transactions/token/big`
//
/// Returns paginated transaction history for the BIG token.
///
/// Filters by `contract_hash` matching the `CONTRACT_BIG` env var.
///
/// # Errors
///
/// Returns `ApiError::Internal` if `CONTRACT_BIG` is not configured.
#[utoipa::path(
    get,
    path = "/token/big",
    tag = "Transactions",
    params(Pagination),
    responses(
        (status = 200, description = "Paginated BIG token transaction list", body = inline(PaginatedResponse<TransactionResponse>)),
        (status = 500, description = "Internal server error or BIG contract not configured", body = ErrorResponse)
    )
)]
#[inline]
pub async fn get_big_token_transactions(
    State(state): State<Arc<AppState>>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<TransactionResponse>>> {
    let contract_hash = state
        .config
        .contract_big
        .as_deref()
        .ok_or_else(|| ApiError::Internal("CONTRACT_BIG not configured".to_owned()))?;

    let (data, item_count) = db::fetch_token_transactions(
        &state.db,
        contract_hash,
        pagination.page_size(),
        pagination.offset(),
    )
    .await?;

    Ok(Json(PaginatedResponse::new(data, item_count, &pagination)))
}
