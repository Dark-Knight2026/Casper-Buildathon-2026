#[tokio::main]
async fn main() {
    if let Err(e) = api::implementation::main().await {
        eprintln!("API server failed to start: {e:?}");
        std::process::exit(1);
    }
}
