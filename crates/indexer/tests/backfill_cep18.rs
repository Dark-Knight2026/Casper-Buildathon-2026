//! Tests for `ft_action_to_event` mapping logic in CEP-18 backfill.
//!
//! CSPR.cloud `/ft-token-action-types` reference (verified against testnet):
//!   1 = Mint
//!   2 = Transfer
//!   3 = Approve  (mapped to `SetAllowance` for our event system)
//!   4 = Burn     (no handler — skipped)

use indexer::backfill::cep18::{FtTokenAction, ft_action_to_event};

/// Helper: build a minimal `FtTokenAction` with given fields.
fn action(
    ft_action_type_id: u8,
    from_hash: Option<&str>,
    to_hash: Option<&str>,
    amount: &str,
) -> FtTokenAction {
    FtTokenAction::new(
        "deploy_hash",
        100,
        from_hash,
        to_hash,
        amount,
        ft_action_type_id,
    )
}

// ft_action_type_id = 1 (Mint)

#[test]
fn mint_produces_mint_event_name() {
    let (name, _) = ft_action_to_event(&action(1, None, Some("recipient"), "5000")).unwrap();
    assert_eq!(name, "Mint");
}

#[test]
fn mint_includes_recipient_and_amount() {
    let (_, data) = ft_action_to_event(&action(1, None, Some("addr_recipient"), "42")).unwrap();
    assert_eq!(data["recipient"], "addr_recipient");
    assert_eq!(data["amount"], "42");
}

#[test]
fn mint_with_null_recipient_falls_back_to_empty_string() {
    // to_hash = None → recipient field must be ""
    let (_, data) = ft_action_to_event(&action(1, None, None, "1000")).unwrap();
    assert_eq!(data["recipient"], "");
}

// ft_action_type_id = 2 (Transfer)

#[test]
fn transfer_type2_produces_transfer_event_name() {
    let (name, _) =
        ft_action_to_event(&action(2, Some("sender"), Some("recipient"), "1000")).unwrap();
    assert_eq!(name, "Transfer");
}

#[test]
fn transfer_type2_includes_sender_recipient_and_amount() {
    let (_, data) =
        ft_action_to_event(&action(2, Some("sender_addr"), Some("recv_addr"), "999")).unwrap();
    assert_eq!(data["sender"], "sender_addr");
    assert_eq!(data["recipient"], "recv_addr");
    assert_eq!(data["amount"], "999");
}

#[test]
fn transfer_type2_with_null_hashes_falls_back_to_empty_string() {
    let (_, data) = ft_action_to_event(&action(2, None, None, "1")).unwrap();
    assert_eq!(data["sender"], "");
    assert_eq!(data["recipient"], "");
}

// ft_action_type_id = 3 (Approve → "SetAllowance")

#[test]
fn approve_type3_produces_set_allowance_event_name() {
    let (name, _) = ft_action_to_event(&action(3, Some("owner"), Some("spender"), "200")).unwrap();
    assert_eq!(name, "SetAllowance");
}

#[test]
fn approve_type3_includes_owner_spender_and_amount() {
    let (_, data) =
        ft_action_to_event(&action(3, Some("owner_addr"), Some("spender_addr"), "200")).unwrap();
    assert_eq!(data["owner"], "owner_addr");
    assert_eq!(data["spender"], "spender_addr");
    assert_eq!(data["amount"], "200");
}

#[test]
fn approve_type3_with_null_hashes_falls_back_to_empty_string() {
    let (_, data) = ft_action_to_event(&action(3, None, None, "0")).unwrap();
    assert_eq!(data["owner"], "");
    assert_eq!(data["spender"], "");
}

// ft_action_type_id = 4 (Burn) and unknowns — all return None

#[test]
fn burn_type4_returns_none() {
    assert!(ft_action_to_event(&action(4, Some("holder"), None, "500")).is_none());
}

#[test]
fn unknown_action_types_return_none() {
    assert!(ft_action_to_event(&action(0, None, None, "0")).is_none());
    assert!(ft_action_to_event(&action(5, None, None, "0")).is_none());
    assert!(ft_action_to_event(&action(99, None, None, "0")).is_none());
    assert!(ft_action_to_event(&action(255, None, None, "0")).is_none());
}
