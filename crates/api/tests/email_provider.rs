//! Regression tests for the Postmark error -> [`EmailError`] classification.
//!
//! The retry-queue worker routes on `Transient` vs `Permanent`, so a
//! misclassified provider error decides whether a doomed send is retried 12
//! times over ~25h or failed immediately. These tests pin the classification
//! for the deterministic, construction-error variants that must never be
//! retried.

use http::{Error, Request};
use postmark::reqwest::PostmarkClientError;

use api::providers::EmailError;

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
