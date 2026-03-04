//! Indexer entrypoint — runs backfill and WebSocket streaming concurrently.
//!
//! # Usage
//!
//! ```bash
//! cargo run -p indexer --release
//! ```

#[tokio::main]
async fn main() {
    if let Err(e) = indexer::runner::run().await {
        eprintln!("Indexer failed to start: {e:?}");
        std::process::exit(1);
    }
}
