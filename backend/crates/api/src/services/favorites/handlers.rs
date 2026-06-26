//! HTTP request handlers for favorite endpoints (tenant-scoped).

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, AppState, ErrorResponse, PaginatedResponse, Pagination},
    services::{
        auth::{RoleUser, TenantRole},
        favorites::{
            db,
            models::{AddFavoriteRequest, FavoriteResponse},
        },
        listings::db as listings_db,
    },
};

// `GET /api/v1/favorites`
//
/// The caller's saved listings (newest first), paginated. Each entry nests the
/// full listing it points to (with its property and approved media).
///
/// # Errors
///
/// Returns a database error on failure.
#[utoipa::path(
    get,
    path = "/favorites",
    tag = "Favorites",
    params(Pagination),
    responses(
        (status = 200, description = "The tenant's favorites (paginated)", body = PaginatedResponse<FavoriteResponse>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Tenant role required", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn list_favorites(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<FavoriteResponse>>> {
    let (favorites, total) = db::list_favorites(
        &state.db,
        user.0.sub,
        pagination.page_size(),
        pagination.offset(),
    )
    .await?;
    Ok(Json(PaginatedResponse::new(favorites, total, &pagination)))
}

// `GET /api/v1/favorites/ids`
//
/// The listing ids the caller has favorited (newest first). A lightweight feed
/// for marking "favorited" state in listing cards without hydrating each one.
///
/// # Errors
///
/// Returns a database error on failure.
#[utoipa::path(
    get,
    path = "/favorites/ids",
    tag = "Favorites",
    responses(
        (status = 200, description = "Favorited listing ids", body = Vec<Uuid>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Tenant role required", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn list_favorite_ids(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
) -> ApiResult<Json<Vec<Uuid>>> {
    let ids = db::list_favorite_ids(&state.db, user.0.sub).await?;
    Ok(Json(ids))
}

// `POST /api/v1/favorites`
//
/// Saves a listing for the caller. Idempotent at the database level via the
/// composite key; a second save of the same listing is a `409`.
///
/// # Errors
///
/// Returns `404` when no live listing has that id, `409` when it is already
/// favorited, or a database error.
#[utoipa::path(
    post,
    path = "/favorites",
    tag = "Favorites",
    request_body = AddFavoriteRequest,
    responses(
        (status = 201, description = "Listing favorited", body = FavoriteResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Tenant role required", body = ErrorResponse),
        (status = 404, description = "Listing not found", body = ErrorResponse),
        (status = 409, description = "Listing already favorited", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn add_favorite(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
    Json(payload): Json<AddFavoriteRequest>,
) -> ApiResult<(StatusCode, Json<FavoriteResponse>)> {
    let favorited_at = match db::add_favorite(&state.db, user.0.sub, payload.listing_id).await? {
        db::AddFavorite::Added(favorited_at) => favorited_at,
        db::AddFavorite::Duplicate => {
            return Err(ApiError::Conflict("listing already favorited".to_owned()));
        }
        db::AddFavorite::ListingNotFound => {
            return Err(ApiError::NotFound("listing not found".to_owned()));
        }
    };

    // Hydrate the saved listing for the response. A concurrent withdraw between
    // the insert and this read is the only way it goes missing - treat that as
    // not found rather than fabricate an empty listing.
    let listing = listings_db::fetch_listings_by_ids(&state.db, &[payload.listing_id])
        .await?
        .remove(&payload.listing_id)
        .ok_or_else(|| ApiError::NotFound("listing not found".to_owned()))?;

    Ok((
        StatusCode::CREATED,
        Json(FavoriteResponse {
            listing_id: payload.listing_id,
            favorited_at,
            listing,
        }),
    ))
}

// `DELETE /api/v1/favorites/{listingId}`
//
/// Removes a listing from the caller's favorites. The delete is scoped by the
/// caller's user id, so it can only ever touch the caller's own save.
///
/// # Errors
///
/// Returns `404` when the listing was not favorited, or a database error.
#[utoipa::path(
    delete,
    path = "/favorites/{listingId}",
    tag = "Favorites",
    params(
        ("listingId" = Uuid, Path, description = "Favorited listing id")
    ),
    responses(
        (status = 204, description = "Favorite removed"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Tenant role required", body = ErrorResponse),
        (status = 404, description = "Favorite not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn remove_favorite(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
    Path(listing_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    if db::remove_favorite(&state.db, user.0.sub, listing_id).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(ApiError::NotFound("favorite not found".to_owned()))
    }
}
