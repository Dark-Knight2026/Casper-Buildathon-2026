//! Regression tests for the Postmark error -> [`EmailError`] classification.
//!
//! The retry-queue worker routes on `Transient` vs `Permanent`, so a
//! misclassified provider error decides whether a doomed send is retried 12
//! times over ~25h or failed immediately. These tests pin the classification
//! for the deterministic, construction-error variants that must never be
//! retried.

use http::{Error, Request};
use postmark::reqwest::PostmarkClientError;
use secrecy::SecretString;

use api::providers::{EmailError, EmailSender, LoggingEmailSender, PostmarkSender};

/// Builds a genuine `http::Error` by driving the `http` request builder with an
/// invalid method: the builder defers the failure to `.body()`, which hands
/// back the `http::Error` we need to wrap in `PostmarkClientError::Http`.
fn make_http_error() -> Error {
    Request::builder()
        .method("INVALID METHOD")
        .body(())
        .expect_err("an invalid method must surface as http::Error")
}

/// `PostmarkClientError::Http` wraps an `http::Error` - a request-construction
/// failure that is deterministic: the same builder call fails identically on
/// every retry. It must classify as `Permanent`, not `Transient`.
#[test]
fn postmark_http_error_classified_as_permanent() {
    let classified = EmailError::from(PostmarkClientError::Http {
        source: make_http_error(),
    });
    assert!(
        matches!(classified, EmailError::Permanent(_)),
        "http::Error is a deterministic construction failure - must be Permanent, got {classified:?}",
    );
}

/// The retry-queue worker is spawned iff the mailer reports `uses_retry_queue`,
/// so the predicate must track the concrete backend: the logging stub never
/// enqueues a retry (default `false`), while Postmark can fail transiently and
/// must declare it needs the worker (`true`). Pins that the spawn decision in
/// `server::run` stays coupled to the actual mailer, not a config flag.
#[test]
fn uses_retry_queue_follows_the_concrete_mailer() {
    assert!(
        !LoggingEmailSender.uses_retry_queue(),
        "the logging stub never returns Transient, so it must not request a worker",
    );

    // `PostmarkSender::new` only builds the HTTP client; it performs no network
    // I/O, so a throwaway token is enough to construct one.
    let postmark = PostmarkSender::new(
        &SecretString::from("test-token".to_owned()),
        "from@example.com",
    );
    assert!(
        postmark.uses_retry_queue(),
        "a real provider can fail transiently and needs the retry worker",
    );
}
