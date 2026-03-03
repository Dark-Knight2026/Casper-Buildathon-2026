//! HTTP request handlers for transaction history endpoints.

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, Query, State},
};

use crate::{
    auth::AuthUser,
    common::{ApiError, ApiResult, AppState, PaginatedResponse, Pagination},
    transactions::{db, models::TransactionResponse},
};

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
        Pagination,
    ),
    responses(
        (status = 200, description = "Paginated transaction list", body = inline(PaginatedResponse<TransactionResponse>)),
        (status = 400, description = "Invalid address format"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[inline]
pub async fn get_account_transactions(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(address): Path<String>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<TransactionResponse>>> {
    let address = address.to_ascii_lowercase();
    if address.len() != 64 || !address.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ApiError::BadRequest(
            "Address must be 64 hex characters (account hash without prefix)".to_owned(),
        ));
    }

    let (data, item_count) = db::fetch_account_transactions(
        &state.db,
        &address,
        pagination.page_size(),
        pagination.offset(),
    )
    .await?;

    Ok(Json(PaginatedResponse::new(data, item_count, &pagination)))
}

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
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error or BIG contract not configured")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[inline]
pub async fn get_big_token_transactions(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
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
