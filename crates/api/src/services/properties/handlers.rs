//! HTTP request handlers for property endpoints.

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
        auth::{LandlordRole, RoleUser},
        properties::{
            db,
            models::{
                CreatePropertyRequest, Property, PropertyListingSummary, PropertySearchParams,
            },
        },
    },
};

// `POST /api/v1/properties`
//
/// Creates a property, or returns the existing one on a dedup match.
///
/// Physical-asset identity is the address/parcel fingerprint computed by a DB
/// trigger; a second create of the same real-world property collapses onto the
/// existing row (`200`) instead of duplicating it (`201`).
///
/// # Errors
///
/// Returns [`ApiError::BadRequest`] on invalid input, or a database error.
#[utoipa::path(
    post,
    path = "/properties",
    tag = "Properties",
    request_body = CreatePropertyRequest,
    responses(
        (status = 201, description = "Property created", body = Property),
        (status = 200, description = "Existing property returned on dedup match", body = Property),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn create_property(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Json(payload): Json<CreatePropertyRequest>,
) -> ApiResult<(StatusCode, Json<Property>)> {
    let new_property = payload.into_validated()?;
    let (row, was_inserted) = db::upsert_property(&state.db, user.0.sub, new_property).await?;
    let status = if was_inserted {
        StatusCode::CREATED
    } else {
        StatusCode::OK
    };
    Ok((status, Json(Property::from(row))))
}

// `GET /api/v1/properties/{id}`
//
/// Returns a property's physical-asset record (no offer data). Public.
///
/// # Errors
///
/// Returns [`ApiError::NotFound`] when no live property has that id.
#[utoipa::path(
    get,
    path = "/properties/{id}",
    tag = "Properties",
    params(
        ("id" = Uuid, Path, description = "Property id")
    ),
    responses(
        (status = 200, description = "Property record", body = Property),
        (status = 404, description = "Property not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    )
)]
#[inline]
pub async fn get_property(
    State(state): State<Arc<AppState>>,
    Path(property_id): Path<Uuid>,
) -> ApiResult<Json<Property>> {
    let row = db::fetch_property(&state.db, property_id).await?;
    Ok(Json(Property::from(row)))
}

// `GET /api/v1/properties/{id}/listings`
//
/// Lists every listing (offer history) made against this property.
///
/// Landlord only, scoped to the property's owner: a non-owner gets `403`, a
/// missing property `404`.
///
/// # Errors
///
/// Returns [`ApiError::NotFound`] when the property does not exist,
/// [`ApiError::Forbidden`] when the caller is not its owner, or a database error.
#[utoipa::path(
    get,
    path = "/properties/{id}/listings",
    tag = "Properties",
    params(
        ("id" = Uuid, Path, description = "Property id")
    ),
    responses(
        (status = 200, description = "Listing history for the property", body = Vec<PropertyListingSummary>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the property owner", body = ErrorResponse),
        (status = 404, description = "Property not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_property_listings(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(property_id): Path<Uuid>,
) -> ApiResult<Json<Vec<PropertyListingSummary>>> {
    let owner = db::fetch_property_owner(&state.db, property_id)
        .await?
        .ok_or_else(|| ApiError::NotFound("property not found".to_owned()))?;
    if owner != user.0.sub {
        return Err(ApiError::Forbidden("not_property_owner".to_owned()));
    }
    let rows = db::list_property_listings(&state.db, property_id).await?;
    let listings = rows.into_iter().map(PropertyListingSummary::from).collect();
    Ok(Json(listings))
}

// `GET /api/v1/properties/search`
//
/// Geo + paginated property search (public).
///
/// Radius mode (`nearLat`+`nearLng`+`radiusMiles`) and/or bounding box
/// (`bbox=minLng,minLat,maxLng,maxLat`). Without geo params it lists all
/// properties, newest first; radius results are distance-ordered.
///
/// # Errors
///
/// Returns [`ApiError::BadRequest`] on malformed geo params, or a database error.
#[utoipa::path(
    get,
    path = "/properties/search",
    tag = "Properties",
    params(PropertySearchParams, Pagination),
    responses(
        (status = 200, description = "Matching properties (paginated)", body = PaginatedResponse<Property>),
        (status = 400, description = "Invalid search parameters", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    )
)]
#[inline]
pub async fn search_properties(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PropertySearchParams>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<Property>>> {
    let search = params.into_validated(&pagination)?;
    let (rows, total) = db::search_properties_geo(&state.db, &search).await?;
    let properties = rows.into_iter().map(Property::from).collect();
    Ok(Json(PaginatedResponse::new(properties, total, &pagination)))
}
