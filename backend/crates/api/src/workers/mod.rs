//! Background workers: long-running tokio tasks operating outside the
//! HTTP request lifecycle.
//!
//! Each worker lives in its own submodule and exposes an async `run(...)`
//! entry-point that returns when the shutdown broadcast resolves. The
//! top-level [`spawn_all`] is called once from [`crate::server::main`]
//! and spawns every worker on its own task, each subscribed to the same
//! shutdown channel created by [`crate::server::notify_workers`].
//!
//! New workers should live alongside `email_retry` as sibling modules;
//! once we have 3+ unrelated workers (or want to deploy them as a
//! separate binary), this folder is a clean candidate to lift into its
//! own `crates/worker/` crate.

use std::sync::Arc;

use sqlx::PgPool;
use tokio::{sync::broadcast::Sender, task::JoinHandle};

use crate::EmailSender;

pub mod email_retry;
pub mod listing_expiry;

/// Spawns every background worker on its own tokio task.
///
/// The listing auto-expiry worker always runs (it has no external dependency).
/// The email retry worker is spawned only when the bound mailer can enqueue
/// retries (`uses_retry_queue`) - under a stub mailer no send ever fails, so its
/// queue would never receive a row to drain.
///
/// Each worker receives a fresh `broadcast::Receiver<()>` via
/// `shutdown_tx.subscribe()`, so a single
/// [`crate::server::notify_workers`] call reaches every loop. The
/// returned `JoinHandle`s let `server::main` optionally await orderly
/// drain after `axum::serve` returns.
#[inline]
pub fn spawn_all(
    pool: PgPool,
    mailer: Arc<dyn EmailSender>,
    shutdown_tx: &Sender<()>,
) -> Vec<JoinHandle<()>> {
    let mut handles = vec![tokio::spawn(listing_expiry::run(
        pool.clone(),
        shutdown_tx.subscribe(),
    ))];
    if mailer.uses_retry_queue() {
        handles.push(tokio::spawn(email_retry::run(
            pool,
            mailer,
            shutdown_tx.subscribe(),
        )));
    }
    handles
}
