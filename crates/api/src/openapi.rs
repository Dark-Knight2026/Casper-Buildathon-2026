//! OpenAPI specification configuration.

#![allow(clippy::needless_for_each)]

use utoipa::{
    Modify, OpenApi,
    openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
};

use crate::{
    analytics::models as analytics_models, auth::models as auth_models,
    health::models as health_models, ico::models as ico_models, tax::models as tax_models,
    transactions::models as tx_models,
};

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
            auth_models::NonceRequest,
            auth_models::NonceResponse,
            auth_models::LoginRequest,
            auth_models::LoginResponse,
            auth_models::UserInfo,
            // Health models
            health_models::ConnectionStatus,
            health_models::HealthResponse,
            // Tax models
            tax_models::TaxCalculationRequest,
            tax_models::TaxReport,
            tax_models::TaxCategory,
            tax_models::TaxCategoryType,
            // Analytics models
            analytics_models::PropertyPerformanceRequest,
            analytics_models::PropertyPerformanceReport,
            // Pagination
            crate::common::Pagination,
            // Transaction models
            tx_models::TransactionDto,
            // ICO models
            ico_models::IcoBalanceResponse,
            ico_models::IcoProgressResponse,
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
