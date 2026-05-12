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
//!   `StubMediaStorage`, future S3-backed impl).
//!
//! New external-service adapters (KYC, SMS, payment processors) belong
//! here, not in [`common`](crate::common): `common` is reserved for
//! passive shared types (config, errors, models) that have no
//! trait-and-implementation shape.

/// Email-sending abstraction.
pub mod email;
/// Media-storage abstraction.
pub mod storage;

pub use email::{EmailError, EmailMessage, EmailSender, LoggingEmailSender};
pub use storage::{MediaStorage, StorageError, StubMediaStorage};
