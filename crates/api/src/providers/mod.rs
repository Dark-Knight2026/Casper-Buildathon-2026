//! External-integration adapters.
//!
//! Each submodule defines a capability trait (the port) plus one or more
//! implementations (the adapters). Production deployments swap in real
//! adapters via [`AppState`](crate::common::AppState) without touching
//! call sites: handlers depend on the trait, not on the concrete backend.
//!
//! Currently:
//! - [`email`] - transactional email delivery (`EmailSender`,
//!   `LoggingEmailSender`).
//! - [`storage`] - opaque media-blob storage (`MediaStorage`,
//!   `StubMediaStorage`, `S3MediaStorage`).
//! - [`kyc`] - identity verification (`KycProvider`, `FakeKycProvider`).
//! - [`fair_housing`] - advertising-text screen (`FairHousingScreen`,
//!   `StubFairHousingScreen`).
//! - [`content_pinner`] - content pinning / IPFS (`ContentPinner`,
//!   `FakePinner`).
//!
//! New external-service adapters (SMS, payment processors) belong
//! here, not in [`common`](crate::common): `common` is reserved for
//! passive shared types (config, errors, models) that have no
//! trait-and-implementation shape.

/// Content-pinning (IPFS) abstraction.
pub mod content_pinner;
/// Email-sending abstraction.
pub mod email;
/// Fair Housing advertising-screen abstraction.
pub mod fair_housing;
/// Identity-verification (KYC) abstraction.
pub mod kyc;
/// Media-storage abstraction.
pub mod storage;

pub use content_pinner::{ContentPinner, FakePinner, PinError, PinResult, SharedContentPinner};
pub use email::{EmailError, EmailMessage, EmailSender, LoggingEmailSender, PostmarkSender};
pub use fair_housing::{
    FairHousingError, FairHousingResult, FairHousingScreen, ScreenOutcome, SharedFairHousingScreen,
    StubFairHousingScreen,
};
pub use kyc::{FakeKycProvider, KycError, KycOutcome, KycProvider, KycResult, SharedKycProvider};
pub use storage::{
    MediaStorage, S3MediaStorage, SharedMediaStorage, StorageError, StubMediaStorage,
};
