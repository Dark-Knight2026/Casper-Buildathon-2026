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
//! - [`metadata_stripper`] - image metadata stripping (`MetadataStripper`,
//!   `NoopMetadataStripper`).
//! - [`lease_chain`] - on-chain Lease-contract reconciliation
//!   (`LeaseChainReader`, `FakeLeaseChainReader`).
//! - [`lease_document`] - lease-document rendering
//!   (`LeaseDocumentRenderer`, `SimpleLeaseDocumentRenderer`).
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
/// On-chain Lease-contract reconciliation abstraction.
pub mod lease_chain;
/// Lease-document rendering abstraction.
pub mod lease_document;
/// Image metadata-stripping abstraction.
pub mod metadata_stripper;
/// Media-storage abstraction.
pub mod storage;

pub use content_pinner::{ContentPinner, FakePinner, PinError, PinResult, SharedContentPinner};
pub use email::{EmailError, EmailMessage, EmailSender, LoggingEmailSender, PostmarkSender};
pub use fair_housing::{
    FairHousingError, FairHousingResult, FairHousingScreen, ScreenOutcome, SharedFairHousingScreen,
    StubFairHousingScreen,
};
pub use kyc::{FakeKycProvider, KycError, KycOutcome, KycProvider, KycResult, SharedKycProvider};
pub use lease_chain::{
    FakeLeaseChainReader, LeaseChainError, LeaseChainReader, LeaseChainResult,
    OnchainLeaseAgreement, SharedLeaseChainReader,
};
pub use lease_document::{
    LeaseDocumentData, LeaseDocumentError, LeaseDocumentRenderer, LeaseDocumentResult,
    SharedLeaseDocumentRenderer, SimpleLeaseDocumentRenderer,
};
pub use metadata_stripper::{MetadataStripper, NoopMetadataStripper, SharedMetadataStripper};
pub use storage::{
    MediaStorage, S3MediaStorage, SharedMediaStorage, StorageError, StubMediaStorage,
};
