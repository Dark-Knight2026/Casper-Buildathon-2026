//! Integration tests for WebSocket message deserialization and contract helpers.

use indexer::{
    config::{ContractRegistry, ContractType},
    streaming::{self, WssMessage},
};

const SAMPLE_MESSAGE: &str = r#"
    {
        "data": {
            "contract_package_hash": "abc123",
            "contract_hash": "def456",
            "name": "TokensPurchased",
            "data": {
                "amount": "1000000000",
                "currency": 0,
                "price": "500000",
                "cost": "500000000",
                "timestamp": 1234567890
            },
            "raw_data": "deadbeef"
        },
        "action": "emitted",
        "extra": {
            "deploy_hash": "aabbcc",
            "event_id": 42,
            "transform_id": 5,
            "block_height": 1234567
        },
        "timestamp": "2025-01-01T12:00:00.000Z"
    }
"#;

#[test]
fn deserializes_wss_message() {
    let msg: WssMessage = serde_json::from_str(SAMPLE_MESSAGE).unwrap();

    assert_eq!(msg.data.contract_package_hash, "abc123");
    assert_eq!(msg.data.name, "TokensPurchased");
    assert_eq!(msg.data.data["amount"], "1000000000");
    assert_eq!(msg.extra.deploy_hash, "aabbcc");
    assert_eq!(msg.extra.event_id, 42);
    assert_eq!(msg.extra.block_height, 1_234_567);
}

#[test]
fn deserializes_ignores_unknown_fields() {
    // "timestamp", "action", "raw_data", "future_field" must not cause failure.
    let minimal = r#"{
        "data": { "contract_package_hash": "x", "name": "Foo", "data": {}, "extra_unknown": true },
        "action": "emitted",
        "extra": { "deploy_hash": "y", "event_id": 1, "transform_id": 0, "block_height": 1 },
        "timestamp": "2025-01-01T00:00:00Z",
        "future_field": "ignored"
    }"#;
    let msg: WssMessage = serde_json::from_str(minimal).unwrap();
    assert_eq!(msg.data.name, "Foo");
}

#[test]
fn build_contract_map_maps_hashes_to_types() {
    let registry = ContractRegistry {
        ico: Some("ico_hash".to_owned()),
        big: Some("big_hash".to_owned()),
        ..ContractRegistry::default()
    };

    let map = streaming::build_contract_map(&registry);

    assert_eq!(map.get("ico_hash"), Some(&ContractType::Ico));
    assert_eq!(map.get("big_hash"), Some(&ContractType::Big));
    assert_eq!(map.len(), 2);
}

#[test]
fn build_contract_map_empty_when_no_contracts() {
    let map = streaming::build_contract_map(&ContractRegistry::default());
    assert!(map.is_empty());
}

#[test]
fn build_hashes_csv_joins_with_comma() {
    let registry = ContractRegistry {
        ico: Some("aaa".to_owned()),
        big: Some("bbb".to_owned()),
        ..ContractRegistry::default()
    };

    let csv = streaming::build_hashes_csv(&registry);

    // Order follows active_contracts() iteration order (Usdc, Usdt, Big, ..., Ico).
    assert!(csv.contains("aaa"));
    assert!(csv.contains("bbb"));
    assert!(csv.contains(','));
    assert!(!csv.starts_with(','));
    assert!(!csv.ends_with(','));
}

#[test]
fn build_hashes_csv_empty_when_no_contracts() {
    let csv = streaming::build_hashes_csv(&ContractRegistry::default());
    assert!(csv.is_empty());
}
