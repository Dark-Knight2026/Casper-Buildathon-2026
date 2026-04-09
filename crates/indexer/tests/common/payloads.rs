//! Shared JSON payload builders used across backfill integration tests.
//!
//! Each function returns either a `serde_json::Value` representing a full API
//! response body, or a `wiremock::ResponseTemplate` ready to mount on a
//! `MockServer`.

use serde_json::{Value, json};

use super::FakeAddress;

/// Build a CSPR.cloud WebSocket message with the given fields.
///
/// Mirrors the `WssMessage` shape expected by `handle_text_message`.
/// Unknown extra fields (`"action"`, `"transform_id"`, `"timestamp"`)
/// are included to verify that the deserializer ignores them correctly.
#[allow(clippy::needless_pass_by_value)]
pub fn wss_message(
    contract_package_hash: &str,
    event_name: &str,
    event_data: Value,
    deploy_hash: &str,
    event_id: i64,
    block_height: u64,
) -> Value {
    json!({
        "data": {
            "contract_package_hash": contract_package_hash,
            "contract_hash": "def456",
            "name": event_name,
            "data": event_data
        },
        "action": "emitted",
        "extra": {
            "deploy_hash": deploy_hash,
            "event_id": event_id,
            "transform_id": 0,
            "block_height": block_height
        },
        "timestamp": "2025-01-01T12:00:00.000Z"
    })
}

/// One page of `/ft-token-actions` with a single CEP-18 Transfer action.
///
/// Used to verify that `fetch_ft_token_actions_page` correctly deserializes
/// all fields. Fixed values (`deploy_hash`, `block_height`, `amount`,
/// `ft_action_type_id`) are asserted on directly in the test.
pub fn ft_actions_one_transfer_page() -> Value {
    json!({
        "data": [
            {
                "deploy_hash":       "deploy_abc",
                "block_height":      1234,
                "from_hash":         "sender",
                "to_hash":           "receiver",
                "amount":            "9999",
                "ft_action_type_id": 2
            }
        ],
        "page_count": 5
    })
}

/// Build a `/ft-token-actions` response with exactly one action.
///
/// Useful for tests that need a single action with specific fields without
/// duplicating the full JSON structure every time.
pub fn ft_actions_single(
    deploy_hash: &str,
    block_height: u64,
    from_hash: Option<&str>,
    to_hash: Option<&str>,
    amount: &str,
    ft_action_type_id: u8,
    page_count: u32,
) -> Value {
    json!({
        "data": [
            {
                "deploy_hash":       deploy_hash,
                "block_height":      block_height,
                "from_hash":         from_hash,
                "to_hash":           to_hash,
                "amount":            amount,
                "ft_action_type_id": ft_action_type_id
            }
        ],
        "page_count": page_count
    })
}

/// Build a CEP-18 Transfer `event_data` JSON with Alice as sender and Bob as recipient.
pub fn transfer_event_data(amount: &str) -> Value {
    json!({
        "sender": FakeAddress::Alice.as_str(),
        "recipient": FakeAddress::Bob.as_str(),
        "amount": amount
    })
}

/// Build a CSPR.cloud `args` object for a `purchase` deploy.
///
/// Used by `parse_purchase_args` unit tests and integration tests
/// to construct the args format returned inline by CSPR.cloud `/deploys`.
pub fn purchase_args(amount: &Value, currency: u64) -> Value {
    json!({
        "amount_to_spend": { "cl_type": "U256", "parsed": amount },
        "currency":        { "cl_type": "U8",   "parsed": currency }
    })
}

/// Build a CSPR.cloud `args` object for an `add_schedule` deploy.
///
/// Used by `parse_add_schedule_args` unit tests and integration tests.
pub fn schedule_args(id: &str, start: u64, end: u64, sale_amount: &Value, price: &Value) -> Value {
    json!({
        "id":              { "cl_type": "String", "parsed": id },
        "start_timestamp": { "cl_type": "U64",    "parsed": start },
        "end_timestamp":   { "cl_type": "U64",    "parsed": end },
        "sale_amount":     { "cl_type": "U256",   "parsed": sale_amount },
        "price":           { "cl_type": "U256",   "parsed": price }
    })
}
