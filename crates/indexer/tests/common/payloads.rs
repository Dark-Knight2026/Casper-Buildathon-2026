//! Shared JSON payload builders used across backfill integration tests.
//!
//! Each function returns either a `serde_json::Value` representing a full API
//! response body, or a `wiremock::ResponseTemplate` ready to mount on a
//! `MockServer`.

use serde_json::{Value, json};
use wiremock::ResponseTemplate;

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

/// One page of `/ft-token-actions` with three items having different senders.
///
/// Used to verify that `load_big_transfers` keeps only entries where
/// `from_hash` matches the ICO contract:
/// - `"deploy_ico"` — ICO-initiated transfer (must be included)
/// - `"deploy_other"` — different sender (must be excluded)
/// - `"deploy_mint"` — Mint with `null` `from_hash` (must be excluded)
pub fn ft_actions_mixed_senders() -> Value {
    json!({
        "data": [
            { "deploy_hash": "deploy_ico",   "from_hash": "ico_hash",   "amount": "700" },
            { "deploy_hash": "deploy_other", "from_hash": "other_hash", "amount": "100" },
            { "deploy_hash": "deploy_mint",  "from_hash": null,         "amount": "5000" }
        ],
        "item_count": 3,
        "page_count": 1
    })
}

/// Page 1 of 2 — 100 ICO-initiated transfers, all from `"ico_hash"`.
///
/// `page_count: 2` ensures the paginator requests page 2 as well.
pub fn ft_actions_100_items_page1() -> Value {
    json!({
        "data": (0..100u32)
            .map(|i| json!({ "deploy_hash": format!("d{i}"), "from_hash": "ico_hash", "amount": "1" }))
            .collect::<Vec<_>>(),
        "item_count": 100,
        "page_count": 2
    })
}

/// Page 2 of 2 — two ICO-initiated transfers that conclude the pagination test.
pub fn ft_actions_2_items_page2() -> Value {
    json!({
        "data": [
            { "deploy_hash": "d100", "from_hash": "ico_hash", "amount": "2" },
            { "deploy_hash": "d101", "from_hash": "ico_hash", "amount": "3" }
        ],
        "item_count": 2,
        "page_count": 2
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

/// Build a `purchase` session value with the given amount and currency.
///
/// Used by `parse_purchase_args` unit tests to construct minimal deploy sessions
/// that mirror the structure returned by `info_get_deploy`.
pub fn purchase_session(amount: &Value, currency: u64) -> Value {
    json!({
        "StoredVersionedContractByHash": {
            "entry_point": "purchase",
            "args": [
                ["amount_to_spend", { "parsed": amount }],
                ["currency",        { "parsed": currency }]
            ]
        }
    })
}

/// Casper Node RPC success response for a `purchase` deploy.
///
/// Returns a `ResponseTemplate` ready to be mounted on a `MockServer`.
/// `amount` maps to `amount_to_spend`; `currency` is the `Currency` enum index
/// (`0` = CSPR, `1` = USDC, `2` = USDT).
pub fn rpc_purchase_deploy(amount: &str, currency: u64) -> ResponseTemplate {
    ResponseTemplate::new(200).set_body_json(json!({
        "jsonrpc": "2.0",
        "id": 1,
        "result": {
            "deploy": {
                "header": {
                    "timestamp": "2024-06-01T12:00:00.000Z",
                    "account": "buyer_public_key_hex"
                },
                "session": {
                    "StoredVersionedContractByHash": {
                        "entry_point": "purchase",
                        "args": [
                            ["amount_to_spend", { "parsed": amount }],
                            ["currency",        { "parsed": currency }]
                        ]
                    }
                }
            }
        }
    }))
}
