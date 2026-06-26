//! Unit tests for the production stub-provider startup gate
//! ([`api::server::reject_stub_providers_in_production`]).
//!
//! Pure logic - no database, Redis, or process env - so these run in the
//! default test profile without the `integration` feature.

use api::{AppEnv, server};

/// Production must refuse to boot while any stub is wired, and the error must
/// name every active stub so the operator knows exactly what to configure.
#[test]
fn production_with_active_stubs_is_rejected() {
    let stubs = ["KYC (FakeKycProvider)", "IPFS pinning (FakePinner)"];

    let err = server::reject_stub_providers_in_production(AppEnv::Production, &stubs)
        .expect_err("production must refuse to boot with stubs active");

    let message = err.to_string();
    assert!(
        message.contains("KYC (FakeKycProvider)") && message.contains("IPFS pinning (FakePinner)"),
        "error must list every active stub; got: {message}",
    );
}

/// With every real provider wired (no stubs), production boots.
#[test]
fn production_with_no_stubs_boots() {
    server::reject_stub_providers_in_production(AppEnv::Production, &[])
        .expect("production with no stubs active must boot");
}

/// Development is the stub-friendly default: active stubs must not block boot.
#[test]
fn development_with_active_stubs_boots() {
    server::reject_stub_providers_in_production(AppEnv::Development, &["KYC (FakeKycProvider)"])
        .expect("development must permit stubs");
}

/// Staging mirrors development for stubs: permitted, only logged.
#[test]
fn staging_with_active_stubs_boots() {
    server::reject_stub_providers_in_production(AppEnv::Staging, &["KYC (FakeKycProvider)"])
        .expect("staging must permit stubs");
}
