#[tokio::main]
async fn main() {
    if let Err(e) = rust_service::implementation::main().await {
        eprintln!("API server failed to start: {e:?}");
        std::process::exit(1);
    }
}
