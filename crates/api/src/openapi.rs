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
    services::{
        analytics, applications, auth, favorites, health, leases, listings, properties, tax, users,
        viewings,
    },
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
            auth::models::ForgotPasswordRequest,
            auth::models::ForgotPasswordResponse,
            auth::models::LoginRequest,
            auth::models::LoginResponse,
            auth::models::NonceRequest,
            auth::models::NonceResponse,
            auth::models::PasswordLoginRequest,
            auth::models::RegisterRequest,
            auth::models::ResetPasswordRequest,
            auth::models::RevokeAllSessionsRequest,
            auth::models::RevokeAllSessionsResponse,
            auth::models::RoleRequiredResponse,
            auth::models::SessionResponse,
            auth::models::VerificationRequiredResponse,
            auth::models::VerifyConfirmRequest,
            auth::models::VerifySendResponse,
            // Users models
            users::models::AvatarUploadResponse,
            users::models::ChangePasswordRequest,
            users::models::DeleteAccountRequest,
            users::models::EmailChangeConfirmRequest,
            users::models::EmailChangeRequest,
            users::models::LinkWalletRequest,
            users::models::OnchainRegistrationResponse,
            users::models::UpdateProfileRequest,
            users::models::UpdateRoleRequest,
            // Properties models
            properties::models::CreatePropertyRequest,
            properties::models::UpdatePropertyRequest,
            properties::models::PropertyType,
            properties::models::Property,
            properties::models::PropertyListingSummary,
            // Listings models
            listings::models::Listing,
            listings::models::ListingProvenance,
            listings::models::MediaRef,
            listings::models::ModerationStatus,
            listings::models::ListingIntent,
            listings::models::ListingState,
            listings::models::AuthorityTier,
            listings::models::CreateListingRequest,
            listings::models::UpdateListingRequest,
            listings::models::UpdateStateRequest,
            listings::models::ViewResponse,
            listings::models::ListingStatistics,
            listings::models::ListingHistoricalData,
            listings::models::AuthorityDocumentType,
            listings::models::AuthorityDocumentResponse,
            listings::models::FairHousingScreenResponse,
            listings::models::MediaModerationRequest,
            listings::models::MediaReorderRequest,
            listings::models::RentLtrTerms,
            listings::models::ListingSort,
            listings::models::SortOrder,
            // Leases models
            leases::models::Lease,
            leases::models::CreateLeaseRequest,
            leases::models::LeaseStatus,
            leases::models::LeaseType,
            leases::models::Clause,
            leases::models::DocumentLinks,
            // Favorites models
            favorites::models::AddFavoriteRequest,
            favorites::models::FavoriteResponse,
            // Applications models
            applications::models::ApplicationStatus,
            applications::models::RentalApplication,
            applications::models::SubmitApplicationRequest,
            applications::models::ReviewApplicationRequest,
            // Viewings models
            viewings::models::Viewing,
            viewings::models::ViewingStatus,
            viewings::models::BookViewingRequest,
            viewings::models::UpdateViewingStatusRequest,
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
        (name = "Properties", description = "Property (physical-asset) endpoints"),
        (name = "Listings", description = "Listing (time-bound offer) endpoints"),
        (name = "Leases", description = "Lease-agreement endpoints"),
        (name = "Favorites", description = "Tenant saved-listing endpoints"),
        (name = "Applications", description = "Rental-application endpoints"),
        (name = "Viewings", description = "In-person viewing-booking endpoints"),
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
