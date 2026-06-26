//! `LeaseFi` Backend API server entry point.

#[tokio::main]
async fn main() {
    if let Err(e) = api::server::main().await {
        eprintln!("API server failed to start: {e:?}");
        std::process::exit(1);
    }
}
