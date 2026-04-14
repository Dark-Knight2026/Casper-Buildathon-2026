//! OpenAPI specification configuration.

#![allow(clippy::needless_for_each)]

use utoipa::{
    Modify, OpenApi,
    openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
};

use crate::{analytics, auth, health, ico, tax, transactions};

/// `OpenAPI` documentation configuration.
///
/// Note: `paths` is empty because routes are registered automatically
/// via `OpenApiRouter` and `routes!` macro.
#[derive(Debug, OpenApi)]
#[openapi(
    info(
        title = "LeaseFi API",
        version = "0.1.0",
        description = "Backend API for the LeaseFi real estate platform"
    ),
    servers(
        (url = "/", description = "Local development")
    ),
    components(
        schemas(
            // Auth models
            auth::models::NonceRequest,
            auth::models::NonceResponse,
            auth::models::LoginRequest,
            auth::models::LoginResponse,
            auth::models::UserInfo,
            // Health models
            health::models::ConnectionStatus,
            health::models::HealthResponse,
            // Tax models
            tax::models::TaxCalculationRequest,
            tax::models::TaxReport,
            tax::models::TaxCategory,
            tax::models::TaxCategoryType,
            // Analytics models
            analytics::models::PropertyPerformanceRequest,
            analytics::models::PropertyPerformanceReport,
            // Pagination
            crate::common::Pagination,
            // Transaction models
            transactions::models::TransactionResponse,
            transactions::models::TxType,
            transactions::models::HashType,
            // ICO models
            ico::models::IcoBalanceResponse,
            ico::models::IcoProgressResponse,
            // Common models
            crate::common::UserRole,
            crate::common::Claims,
        )
    ),
    modifiers(&SecurityAddon),
    tags(
        (name = "Health", description = "Health check endpoints"),
        (name = "Auth", description = "Authentication endpoints"),
        (name = "Tax", description = "Tax calculation endpoints"),
        (name = "Analytics", description = "Property analytics endpoints"),
        (name = "Transactions", description = "Transaction history endpoints"),
        (name = "ICO", description = "ICO balance and progress endpoints")
    )
)]
pub struct ApiDoc;

/// Adds JWT bearer authentication to the `OpenAPI` spec.
struct SecurityAddon;

impl Modify for SecurityAddon {
    #[inline]
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi.components.get_or_insert_with(Default::default);
        components.add_security_scheme(
            "bearer_auth",
            SecurityScheme::Http(
                HttpBuilder::new()
                    .scheme(HttpAuthScheme::Bearer)
                    .bearer_format("JWT")
                    .build(),
            ),
        );
    }
}
