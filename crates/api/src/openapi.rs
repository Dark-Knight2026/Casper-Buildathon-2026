//! OpenAPI specification configuration.

#![allow(clippy::needless_for_each)]

use utoipa::{
    Modify, OpenApi as OpenApiDerive,
    openapi::{
        OpenApi,
        security::{ApiKey, ApiKeyValue, SecurityScheme},
    },
};

use crate::{
    onchain::{ico, staking, transactions, vesting},
    services::{analytics, auth, health, tax, users},
};

/// `OpenAPI` documentation configuration.
///
/// Note: `paths` is empty because routes are registered automatically
/// via `OpenApiRouter` and `routes!` macro.
#[derive(Debug, OpenApiDerive)]
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
            // Common models
            crate::common::Claims,
            crate::common::TokenType,
            crate::common::UserInfo,
            crate::common::UserRole,
            crate::common::UserStatus,
            crate::common::VerificationLevel,
            // Auth models
            auth::models::LoginRequest,
            auth::models::LoginResponse,
            auth::models::NonceRequest,
            auth::models::NonceResponse,
            auth::models::PasswordLoginRequest,
            auth::models::RegisterRequest,
            auth::models::RevokeAllSessionsRequest,
            auth::models::RevokeAllSessionsResponse,
            auth::models::RoleRequiredResponse,
            auth::models::SessionResponse,
            auth::models::VerificationRequiredResponse,
            auth::models::VerifyConfirmRequest,
            auth::models::VerifySendResponse,
            // Users models
            users::models::AvatarUploadResponse,
            users::models::DeleteAccountRequest,
            users::models::EmailChangeConfirmRequest,
            users::models::EmailChangeRequest,
            users::models::UpdateProfileRequest,
            users::models::UpdateRoleRequest,
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
            // Vesting models
            vesting::models::VestingScheduleItem,
            vesting::models::TokenSupplyResponse,
            vesting::models::ReleaseSchedulePoint,
            vesting::models::ReleaseScheduleResponse,
            // Staking models
            staking::models::StakingInfoResponse,
            staking::models::PortfolioResponse,
            staking::models::EarningsPoint,
            staking::models::EarningsResponse,
            staking::models::RewardsHistoryPoint,
            staking::models::RewardsHistoryResponse,
            staking::models::UnbondingResponse,
            staking::models::UnbondingEvent,
        )
    ),
    modifiers(&SecurityAddon),
    tags(
        (name = "Health", description = "Health check endpoints"),
        (name = "Auth", description = "Authentication endpoints"),
        (name = "Users", description = "Authenticated user-profile endpoints"),
        (name = "Tax", description = "Tax calculation endpoints"),
        (name = "Analytics", description = "Property analytics endpoints"),
        (name = "Transactions", description = "Transaction history endpoints"),
        (name = "ICO", description = "ICO balance and progress endpoints"),
        (name = "Vesting", description = "Vesting schedule and token supply endpoints"),
        (name = "Staking", description = "Staking, portfolio and rewards endpoints")
    )
)]
pub struct ApiDoc;

/// Adds cookie-based JWT authentication (`access_token` cookie) to the
/// `OpenAPI` spec. The previous bearer scheme was removed when the access
/// token migrated from `Authorization: Bearer` to `Set-Cookie`.
struct SecurityAddon;

impl Modify for SecurityAddon {
    #[inline]
    fn modify(&self, openapi: &mut OpenApi) {
        let components = openapi.components.get_or_insert_with(Default::default);
        components.add_security_scheme(
            "cookie_auth",
            SecurityScheme::ApiKey(ApiKey::Cookie(ApiKeyValue::new("access_token"))),
        );
    }
}
