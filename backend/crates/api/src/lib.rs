//! `LeaseFi` Backend API
//!
//! This crate provides the backend API for the `LeaseFi` platform,
//! including authentication, business logic handlers, and health checks.
//!
//! # Module Structure
//!
//! - [`services`] - Business logic: auth, tax, analytics, health
//! - [`onchain`] - On-chain data: ICO, staking, transactions, vesting
//! - [`common`] - Shared utilities (config, errors, crypto, models)
//! - [`providers`] - External-integration adapters (email, storage)
//! - [`openapi`] - `OpenAPI` documentation configuration
//! - [`server`] - Server startup logic

#![cfg_attr(not(feature = "enabled"), allow(unused))]

/// Common utilities shared across all feature modules.
#[cfg(feature = "enabled")]
pub mod common;
/// On-chain data modules.
#[cfg(feature = "enabled")]
pub mod onchain;
/// OpenAPI documentation configuration.
#[cfg(feature = "enabled")]
pub mod openapi;
/// External-integration adapters (email, storage, ...).
#[cfg(feature = "enabled")]
pub mod providers;
/// Server implementation and startup logic.
#[cfg(feature = "enabled")]
pub mod server;
/// Business logic services.
#[cfg(feature = "enabled")]
pub mod services;
/// Background workers (retry queues, scheduled cleanup, etc.).
#[cfg(feature = "enabled")]
pub mod workers;

// Re-exports
#[cfg(feature = "enabled")]
pub use common::{
    AppEnv, AppState, Claims, IcoFallback, Pageable, PaginatedResponse, Pagination, PropertyId,
    RedisStore, S3Config, ServerConfig, ServerError, UserId, UserRole,
};
#[cfg(feature = "enabled")]
pub use openapi::ApiDoc;
#[cfg(feature = "enabled")]
pub use providers::{
    BackgroundCheckError, BackgroundCheckProvider, BackgroundCheckStatus, BackgroundCheckType,
    CheckOutcome, CheckSubject, ContentPinner, EmailError, EmailMessage, EmailSender,
    FairHousingError, FairHousingScreen, FakeBackgroundCheckProvider, FakeKycProvider,
    FakeLeaseChainReader, FakePinner, KycError, KycOutcome, KycProvider, LeaseChainError,
    LeaseChainReader, LeaseChainResult, LeaseDocumentData, LeaseDocumentError,
    LeaseDocumentRenderer, LeaseDocumentResult, LoggingEmailSender, MediaStorage, MetadataStripper,
    NoopMetadataStripper, OnchainLeaseAgreement, PinError, PostmarkSender, S3MediaStorage,
    ScreenOutcome, SharedBackgroundCheckProvider, SharedContentPinner, SharedFairHousingScreen,
    SharedKycProvider, SharedLeaseChainReader, SharedLeaseDocumentRenderer, SharedMediaStorage,
    SharedMetadataStripper, SimpleLeaseDocumentRenderer, StubFairHousingScreen, StubMediaStorage,
};
#[cfg(feature = "enabled")]
pub use services::auth::AuthUser;
