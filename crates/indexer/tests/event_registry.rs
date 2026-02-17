//! Integration tests for the trait-based event registry.

use serde_json::json;

use indexer::{
    config::ContractType,
    events::{EventRegistry, EventType},
};

/// Test that the event registry can dispatch ICO `TokensPurchased` events.
#[tokio::test]
async fn test_registry_dispatch_ico_purchase() {
    let _registry = EventRegistry::new();

    // Mock event data matching TokensPurchased structure
    let _event_data = json!({
        "amount": "1000000000",
        "currency": 0,  // CSPR
        "price": "50000000",
        "cost": "50000000000",
        "timestamp": 1_700_000_000
    });

    // Note: This test requires a real database connection to fully execute.
    // In a real scenario, you would:
    // 1. Set up a test database (e.g., using testcontainers)
    // 2. Create EventContext with real connection
    // 3. Call registry.process_event()
    // 4. Verify data was inserted correctly

    assert!(
        EventType::parse(ContractType::Ico, "TokensPurchased").is_ok(),
        "EventRegistry should have handler for ICO TokensPurchased"
    );
}

/// Test that unknown events are handled gracefully.
#[tokio::test]
async fn test_registry_unknown_event() {
    let _registry = EventRegistry::new();

    assert!(
        EventType::parse(ContractType::Ico, "UnknownEvent").is_err(),
        "EventRegistry should not have handler for UnknownEvent"
    );
}

/// Test that CEP-18 Transfer is registered for all token contracts.
#[tokio::test]
async fn test_registry_cep18_transfer_multi_contract() {
    let _registry = EventRegistry::new();

    // Transfer should be registered for BIG, USDC, USDT
    assert!(EventType::parse(ContractType::Big, "Transfer").is_ok());
    assert!(EventType::parse(ContractType::Usdc, "Transfer").is_ok());
    assert!(EventType::parse(ContractType::Usdt, "Transfer").is_ok());
}
