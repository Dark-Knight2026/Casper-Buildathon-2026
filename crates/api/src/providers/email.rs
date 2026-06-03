//! Email-sending abstraction.
//!
//! Defines the [`EmailSender`] capability and a no-delivery [`LoggingEmailSender`]
//! implementation used in dev/test. Production deployments are expected to swap
//! the mailer in [`AppState`](crate::common::AppState) for an SMTP- or
//! transactional-API-backed implementation without touching call sites: handlers
//! depend on the trait, not on the concrete sender.

use async_trait::async_trait;
use axum::http::StatusCode;
use postmark::{
    Query, QueryError,
    api::{Body, email::SendEmailRequest},
    reqwest::{PostmarkClient, PostmarkClientError},
};
use secrecy::{ExposeSecret, SecretString};

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

impl From<PostmarkClientError> for EmailError {
    /// Transport (network) errors -> Transient. Config and request-construction
    /// errors -> Permanent.
    #[inline]
    fn from(err: PostmarkClientError) -> Self {
        let summary = err.to_string();
        match err {
            PostmarkClientError::AuthError { .. }
            | PostmarkClientError::UrlParseError { .. }
            | PostmarkClientError::InvalidUri { .. } => {
                Self::Permanent(format!("postmark config: {summary}"))
            }
            // `Http` wraps an `http::Error` raised while building the request,
            // not a server response. It is deterministic: the identical call
            // fails the same way on every retry, so retrying is pointless.
            PostmarkClientError::Http { .. } => {
                Self::Permanent(format!("postmark request build: {summary}"))
            }
            PostmarkClientError::Communication { .. } => {
                Self::Transient(format!("postmark transport: {summary}"))
            }
        }
    }
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

    /// Whether this sender can defer delivery into the retry queue by
    /// returning [`EmailError::Transient`].
    ///
    /// **MUST return `true`** for any implementor whose `send` can return
    /// [`EmailError::Transient`]. Otherwise its enqueued rows pile up in
    /// `email_send_retries` with no worker to drain them, and the failure is
    /// silent - there is no error log, the worker simply never spawns.
    ///
    /// The server spawns the retry-queue worker iff its mailer reports `true`,
    /// so the spawn decision follows the *actual* mailer rather than a config
    /// flag read independently. A stub that always succeeds (the default)
    /// never enqueues a row, so draining it would be busy-work; a real
    /// external provider that can fail transiently needs the worker to drain
    /// what it enqueues. Defaults to `false` - only real delivery backends
    /// override it.
    #[inline]
    fn uses_retry_queue(&self) -> bool {
        false
    }
}

// -----------------------------------------------------------------------------

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
///
/// Worker-side invariant: `send` MUST NOT return [`EmailError::Transient`].
/// It leaves [`EmailSender::uses_retry_queue`] at the default `false`, so the
/// retry-queue worker is not spawned for it; any row that somehow landed in
/// `email_send_retries` under this sender would stay `pending` forever.
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

// -----------------------------------------------------------------------------

/// Production [`EmailSender`] backed by Postmark.
///
/// Pre-builds [`PostmarkClient`] once so the underlying `reqwest::Client`
/// pools connections across `send` calls. Maps provider failures onto
/// [`EmailError::Transient`] / [`EmailError::Permanent`] so the
/// retry-queue worker can route without re-classifying provider codes.
#[derive(Debug, Clone)]
pub struct PostmarkSender {
    client: PostmarkClient,
    from: String,
}

impl PostmarkSender {
    /// Binds the sender to a Postmark Server Token and a verified sender.
    ///
    /// `from` MUST match a confirmed Postmark sender signature -
    /// otherwise every send produces a `Permanent` failure.
    #[inline]
    #[must_use]
    pub fn new(server_token: &SecretString, from: &str) -> Self {
        let client = PostmarkClient::builder()
            .server_token(server_token.expose_secret())
            .build();
        Self {
            client,
            from: from.to_owned(),
        }
    }
}

#[async_trait]
impl EmailSender for PostmarkSender {
    /// Postmark can fail transiently (HTTP 429 / 5xx, network blips), so its
    /// failures land in the retry queue and the worker must run to drain them.
    #[inline]
    fn uses_retry_queue(&self) -> bool {
        true
    }

    #[inline]
    async fn send(&self, message: EmailMessage) -> Result<(), EmailError> {
        let request = SendEmailRequest::builder()
            .from(self.from.clone())
            .to(message.to)
            .subject(message.subject)
            .body(Body::text(message.body))
            .build();

        match request.execute(&self.client).await {
            Ok(response) => response.error_for_status().map(|_| ()).map_err(|failed| {
                classify_postmark_failure(None, Some(failed.error_code), &failed.message)
            }),
            Err(QueryError::Api {
                status,
                error_code,
                message,
                ..
            }) => Err(classify_postmark_failure(
                Some(status),
                error_code,
                message.as_deref().unwrap_or("(no message)"),
            )),
            Err(QueryError::Client { source }) => Err(source.into()),
            // Body failed to deserialize on a response Postmark may already
            // have accepted. Transient risks a duplicate send if the message
            // was queued before the body got mangled; Permanent risks silently
            // dropping a genuinely transient truncation. We pick Transient - a
            // duplicate verification email is recoverable, a silently lost one
            // is not, and the re-send is visible in the retry-worker log.
            Err(QueryError::Json { source }) => Err(EmailError::Transient(format!(
                "postmark response parse: {source}"
            ))),
            // `Body` wraps an `http::Error` from serializing the request body -
            // a deterministic client-side construction failure, so the same
            // payload will fail identically on every retry.
            Err(QueryError::Body { source }) => Err(EmailError::Permanent(format!(
                "postmark request build: {source}"
            ))),
        }
    }
}

/// Postmark `ErrorCode` values that mean "do not retry".
///
/// `postmark` crate exposes only `ApiErrorCode = i64`. See
/// <https://postmarkapp.com/developer/api/overview#error-codes>.
const PM_BAD_SERVER_TOKEN: i64 = 10;
const PM_INVALID_FROM_ADDRESS: i64 = 300;
const PM_SENDER_SIGNATURE_NOT_FOUND: i64 = 400;
const PM_SENDER_SIGNATURE_NOT_CONFIRMED: i64 = 401;
const PM_SERVER_NOT_ALLOWED: i64 = 405;
const PM_INACTIVE_RECIPIENT: i64 = 406;
const PM_ACCOUNT_PENDING_APPROVAL: i64 = 412;

/// Routes a Postmark API failure onto a retry classification.
///
/// HTTP 429 / 5xx -> Transient. Known `PM_*` -> Permanent. Unknown ->
/// Transient (a spurious retry is cheaper than a silently dropped mail).
fn classify_postmark_failure(
    http_status: Option<StatusCode>,
    error_code: Option<i64>,
    message: &str,
) -> EmailError {
    let code = error_code.unwrap_or_default();
    let summary = match http_status {
        Some(status) => format!("postmark http={} code={code}: {message}", status.as_u16()),
        None => format!("postmark code={code}: {message}"),
    };

    if http_status.is_some_and(|s| s == StatusCode::TOO_MANY_REQUESTS || s.is_server_error()) {
        return EmailError::Transient(summary);
    }
    match code {
        PM_BAD_SERVER_TOKEN
        | PM_INVALID_FROM_ADDRESS
        | PM_SENDER_SIGNATURE_NOT_FOUND
        | PM_SENDER_SIGNATURE_NOT_CONFIRMED
        | PM_SERVER_NOT_ALLOWED
        | PM_INACTIVE_RECIPIENT
        | PM_ACCOUNT_PENDING_APPROVAL => EmailError::Permanent(summary),
        _ => {
            tracing::warn!(
                http_status = ?http_status,
                postmark_error_code = code,
                postmark_message = message,
                "unexpected postmark failure - defaulting to Transient",
            );
            EmailError::Transient(summary)
        }
    }
}
