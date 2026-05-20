//! Unit tests for the shutdown broadcast fan-out in `server::notify_workers`.
//!
//! These do not exercise the real signal handler (SIGINT/SIGTERM are
//! awkward to fake portably and `tokio::signal::ctrl_c` resists
//! dependency injection). Instead we cover the broadcast-side contract
//! that the signal path leans on: every active subscriber must receive
//! the shutdown edge, and the "no subscribers" path must not surface
//! as a hard error.

use tokio::sync::broadcast;

use api::server::notify_workers;

/// Each active subscriber observes the shutdown send.
#[tokio::test]
async fn notify_workers_reaches_each_subscriber() {
    let (tx, _) = broadcast::channel::<()>(1);
    let mut rx_first = tx.subscribe();
    let mut rx_second = tx.subscribe();

    notify_workers(&tx);

    rx_first
        .recv()
        .await
        .expect("first subscriber should receive the shutdown signal");
    rx_second
        .recv()
        .await
        .expect("second subscriber should receive the shutdown signal");
}

/// `notify_workers` must complete cleanly when no worker has subscribed.
///
/// This is the normal state between server startup (channel created) and
/// the first worker spawn (subscribes), as well as the steady state for
/// deployments that disable background jobs entirely. A panic or hard
/// error here would block graceful HTTP shutdown.
#[tokio::test]
async fn notify_workers_tolerates_zero_subscribers() {
    let (tx, rx) = broadcast::channel::<()>(1);
    drop(rx);

    notify_workers(&tx);
}
