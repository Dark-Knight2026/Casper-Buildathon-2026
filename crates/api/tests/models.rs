//! Unit tests for transaction type-conversion functions.
//! These run without a database.

use api::transactions::models::{HashType, TxType, ft_action_type_id};

#[test]
fn tx_type_as_str() {
    assert_eq!(TxType::TokenPurchase.as_str(), "token_purchase");
    assert_eq!(TxType::TokenTransfer.as_str(), "token_transfer");
    assert_eq!(TxType::TokenMint.as_str(), "token_mint");
    assert_eq!(TxType::TokenAllowance.as_str(), "token_allowance");
}

#[test]
fn hash_type_from_u8() {
    assert!(matches!(HashType::from(0), HashType::Account));
    assert!(matches!(HashType::from(1), HashType::Contract));
    assert!(matches!(HashType::from(255), HashType::Unknown(255)));
}

#[test]
fn hash_type_as_i16() {
    assert_eq!(HashType::Account.as_i16(), 0);
    assert_eq!(HashType::Contract.as_i16(), 1);
    assert_eq!(HashType::Unknown(42).as_i16(), 42);
}

#[test]
fn ft_action_type_id_known_types() {
    assert_eq!(ft_action_type_id("token_mint"), 1);
    assert_eq!(ft_action_type_id("token_transfer"), 2);
    assert_eq!(ft_action_type_id("token_allowance"), 3);
    assert_eq!(ft_action_type_id("token_purchase"), 4);
}

#[test]
fn ft_action_type_id_unknown() {
    assert_eq!(ft_action_type_id("unknown_type"), 0);
    assert_eq!(ft_action_type_id(""), 0);
}
