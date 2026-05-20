//! Email-sending abstraction.
//!
//! Defines the [`EmailSender`] capability and a no-delivery [`LoggingEmailSender`]
//! implementation used in dev/test. Production deployments are expected to swap
//! the mailer in [`AppState`](crate::common::AppState) for an SMTP- or
//! transactional-API-backed implementation without touching call sites: handlers
//! depend on the trait, not on the concrete sender.

use async_trait::async_trait;

/// Split on retryability so the retry-queue worker can route a failure
/// straight from `mailer.send` without re-classifying provider codes.
///
/// `#[non_exhaustive]` keeps future axes (e.g. `RateLimited` with
/// `Retry-After`) non-breaking. Payload strings are operator-only:
/// never echo them to API clients - they can carry provider hostnames
/// or rate-limit headers.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum EmailError {
    /// Recoverable: same payload may succeed on retry.
    #[error("transient email transport error: {0}")]
    Transient(String),
    /// Permanent: same payload will keep failing.
    #[error("permanent email transport error: {0}")]
    Permanent(String),
}

/// Plain transactional email message.
///
/// Intentionally minimal: a single plain-text `body`. HTML alternatives,
/// attachments, and templating engines are out of scope for the bootstrap
/// trait; introducing them now would force every implementation to handle
/// shape-conversion before any real provider is wired up. They can be added
/// as separate trait methods (`send_html`, `send_template`) once a concrete
/// flow needs them.
#[derive(Debug, Clone)]
pub struct EmailMessage {
    /// Recipient address. Validation lives at the call site - the mailer
    /// trusts what it receives because providers will reject bad addresses
    /// at delivery time anyway.
    pub to: String,
    /// Subject line as it should appear in the recipient's inbox.
    pub subject: String,
    /// Plain-text body. Newlines are preserved verbatim by all
    /// implementations.
    pub body: String,
}

/// Capability to deliver a transactional email.
///
/// Object-safe (via `#[async_trait]`) so it can be stored as
/// `Arc<dyn EmailSender>` in [`AppState`](crate::common::AppState) and
/// shared across handlers without making the entire state struct generic
/// over the concrete sender type.
#[async_trait]
pub trait EmailSender: Send + Sync {
    /// Delivers `message` through the underlying transport.
    ///
    /// Implementations SHOULD be idempotent only at the provider level
    /// (deduplication keys, etc.) - this trait does not retry on its own.
    /// Callers that need retry semantics must wrap the call in their own
    /// backoff loop.
    ///
    /// # Errors
    ///
    /// Returns [`EmailError`] when the transport-level delivery attempt
    /// fails. Validation errors (malformed `to`, oversize `body`) are the
    /// caller's responsibility and are not represented here.
    async fn send(&self, message: EmailMessage) -> Result<(), EmailError>;
}

/// No-delivery implementation that emits the email as a `tracing` event.
///
/// Used in local dev and tests where wiring up an SMTP relay or a paid
/// provider is overkill. Test code can capture the event via a
/// `tracing-subscriber` test layer; manual development can read it from
/// stdout. The token-bearing link inside the body is therefore visible in
/// server logs, which is acceptable for non-production: anyone reading the
/// logs already has stronger-than-email access to the system.
///
/// MUST NOT be installed in any environment where real users could trigger
/// flows that depend on email delivery (login, password reset, email change).
/// Such flows will succeed on the server side but the user will never see
/// the follow-up message.
#[derive(Debug, Default)]
pub struct LoggingEmailSender;

#[async_trait]
impl EmailSender for LoggingEmailSender {
    #[inline]
    async fn send(&self, message: EmailMessage) -> Result<(), EmailError> {
        tracing::info!(
            event = "email_logged",
            to = %message.to,
            subject = %message.subject,
            body = %message.body,
            "Email logged (no real delivery configured)"
        );
        Ok(())
    }
}
