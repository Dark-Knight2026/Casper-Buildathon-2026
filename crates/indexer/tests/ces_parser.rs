//! Unit tests for the CES binary event parser.
//!
//! Each test constructs a valid CES binary blob using `casper_types::bytesrepr::ToBytes`
//! (the mirror of `FromBytes` used by the parser) and verifies that `parse_ces_event`
//! decodes it into the expected `(event_name, JSON)` pair.

use casper_types::{Key, U256, account::AccountHash, bytesrepr::ToBytes};

use indexer::{
    backfill::ces::parser::{parse_ces_event, schemas_for},
    config::ContractType,
};

/// Build a CES binary blob: `bytesrepr("event_{name}") ++ field_bytes`.
fn ces_blob(event_name: &str, field_bytes: &[u8]) -> Vec<u8> {
    let full_name = format!("event_{event_name}");
    let mut buf = full_name.to_bytes().expect("ToBytes for String");
    buf.extend_from_slice(field_bytes);
    buf
}

/// Fake account hash (32 zero bytes).
const ZERO_ACCOUNT: [u8; 32] = [0u8; 32];

/// Fake account hash (32 bytes filled with 0xAA).
const AA_ACCOUNT: [u8; 32] = [0xAAu8; 32];

/// Serialize a `Key::Account` from raw bytes.
fn account_key_bytes(raw: &[u8; 32]) -> Vec<u8> {
    Key::Account(AccountHash::new(*raw))
        .to_bytes()
        .expect("ToBytes for Key")
}

#[test]
fn parses_staked_event() {
    let schemas = schemas_for(ContractType::Staking);

    let mut fields = Vec::new();
    fields.extend_from_slice(&account_key_bytes(&ZERO_ACCOUNT));
    fields.extend_from_slice(&U256::from(5000).to_bytes().unwrap());

    let blob = ces_blob("Staked", &fields);
    let (name, data) = parse_ces_event(&blob, schemas).unwrap();

    assert_eq!(name, "Staked");
    assert_eq!(data["amount"], "5000");
    assert!(data["staker"].as_str().unwrap().contains("account-hash-"));
}

#[test]
fn parses_unstaked_initiated_event() {
    let schemas = schemas_for(ContractType::Staking);

    let mut fields = Vec::new();
    fields.extend_from_slice(&account_key_bytes(&AA_ACCOUNT));
    fields.extend_from_slice(&U256::from(3000).to_bytes().unwrap());
    fields.extend_from_slice(&1_700_000_000u64.to_bytes().unwrap());

    let blob = ces_blob("UnstakedInitiated", &fields);
    let (name, data) = parse_ces_event(&blob, schemas).unwrap();

    assert_eq!(name, "UnstakedInitiated");
    assert_eq!(data["amount"], "3000");
    assert_eq!(data["unbonding_ends_at"], 1_700_000_000u64);
    assert!(data["staker"].as_str().unwrap().contains("account-hash-"));
}

#[test]
fn parses_unbonded_withdrawn_event() {
    let schemas = schemas_for(ContractType::Staking);

    let mut fields = Vec::new();
    fields.extend_from_slice(&account_key_bytes(&ZERO_ACCOUNT));
    fields.extend_from_slice(&U256::from(9999).to_bytes().unwrap());

    let blob = ces_blob("UnbondedWithdrawn", &fields);
    let (name, data) = parse_ces_event(&blob, schemas).unwrap();

    assert_eq!(name, "UnbondedWithdrawn");
    assert_eq!(data["amount"], "9999");
}

#[test]
fn parses_rewards_deposited_event() {
    let schemas = schemas_for(ContractType::Staking);

    let mut fields = Vec::new();
    fields.extend_from_slice(&account_key_bytes(&AA_ACCOUNT));
    fields.extend_from_slice(&U256::from(100_000).to_bytes().unwrap());

    let blob = ces_blob("RewardsDeposited", &fields);
    let (name, data) = parse_ces_event(&blob, schemas).unwrap();

    assert_eq!(name, "RewardsDeposited");
    assert_eq!(data["amount"], "100000");
    assert!(data["caller"].as_str().unwrap().contains("account-hash-"));
}

#[test]
fn parses_rewards_claimed_event() {
    let schemas = schemas_for(ContractType::Staking);

    let mut fields = Vec::new();
    fields.extend_from_slice(&account_key_bytes(&ZERO_ACCOUNT));
    fields.extend_from_slice(&U256::from(500).to_bytes().unwrap());

    let blob = ces_blob("RewardsClaimed", &fields);
    let (name, data) = parse_ces_event(&blob, schemas).unwrap();

    assert_eq!(name, "RewardsClaimed");
    assert_eq!(data["amount"], "500");
}

#[test]
fn parses_schedule_created_event() {
    let schemas = schemas_for(ContractType::Vesting);

    let mut fields = Vec::new();
    fields.extend_from_slice(&U256::from(42).to_bytes().unwrap()); // vesting_id
    fields.extend_from_slice(&account_key_bytes(&AA_ACCOUNT)); // whitelisted_creator
    fields.extend_from_slice(&account_key_bytes(&ZERO_ACCOUNT)); // beneficiary
    fields.extend_from_slice(&U256::from(5_000_000).to_bytes().unwrap()); // total_amount
    fields.extend_from_slice(&1_700_000_000u64.to_bytes().unwrap()); // start_timestamp
    fields.extend_from_slice(&15_552_000u64.to_bytes().unwrap()); // cliff_duration
    fields.extend_from_slice(&31_104_000u64.to_bytes().unwrap()); // vesting_duration

    let blob = ces_blob("ScheduleCreated", &fields);
    let (name, data) = parse_ces_event(&blob, schemas).unwrap();

    assert_eq!(name, "ScheduleCreated");
    assert_eq!(data["vesting_id"], "42");
    assert_eq!(data["total_amount"], "5000000");
    assert_eq!(data["start_timestamp"], 1_700_000_000u64);
    assert_eq!(data["cliff_duration"], 15_552_000u64);
    assert_eq!(data["vesting_duration"], 31_104_000u64);
    assert!(
        data["whitelisted_creator"]
            .as_str()
            .unwrap()
            .contains("account-hash-")
    );
    assert!(
        data["beneficiary"]
            .as_str()
            .unwrap()
            .contains("account-hash-")
    );
}

#[test]
fn parses_tokens_claimed_event() {
    let schemas = schemas_for(ContractType::Vesting);

    let mut fields = Vec::new();
    fields.extend_from_slice(&U256::from(7).to_bytes().unwrap()); // vesting_id
    fields.extend_from_slice(&account_key_bytes(&ZERO_ACCOUNT)); // beneficiary
    fields.extend_from_slice(&U256::from(1234).to_bytes().unwrap()); // amount

    let blob = ces_blob("TokensClaimed", &fields);
    let (name, data) = parse_ces_event(&blob, schemas).unwrap();

    assert_eq!(name, "TokensClaimed");
    assert_eq!(data["vesting_id"], "7");
    assert_eq!(data["amount"], "1234");
}

#[test]
fn parses_whitelisted_creator_added_event() {
    let schemas = schemas_for(ContractType::Vesting);

    let fields = account_key_bytes(&AA_ACCOUNT);

    let blob = ces_blob("WhitelistedCreatorAdded", &fields);
    let (name, data) = parse_ces_event(&blob, schemas).unwrap();

    assert_eq!(name, "WhitelistedCreatorAdded");
    assert!(data["creator"].as_str().unwrap().contains("account-hash-"));
}

#[test]
fn parses_ownership_transferred_event() {
    let schemas = schemas_for(ContractType::Vesting);

    let mut fields = Vec::new();
    fields.extend_from_slice(&account_key_bytes(&ZERO_ACCOUNT)); // previous_owner
    fields.extend_from_slice(&account_key_bytes(&AA_ACCOUNT)); // new_owner

    let blob = ces_blob("OwnershipTransferred", &fields);
    let (name, data) = parse_ces_event(&blob, schemas).unwrap();

    assert_eq!(name, "OwnershipTransferred");
    assert!(
        data["previous_owner"]
            .as_str()
            .unwrap()
            .contains("account-hash-")
    );
    assert!(
        data["new_owner"]
            .as_str()
            .unwrap()
            .contains("account-hash-")
    );
}

#[test]
fn rejects_missing_event_prefix() {
    let schemas = schemas_for(ContractType::Staking);
    // "Staked" without the "event_" prefix
    let blob = "Staked".to_string().to_bytes().unwrap();

    let err = parse_ces_event(&blob, schemas).unwrap_err();
    assert!(
        err.to_string().contains("event_"),
        "Error should mention missing prefix: {err}"
    );
}

#[test]
fn rejects_unknown_event_name() {
    let schemas = schemas_for(ContractType::Staking);
    let blob = ces_blob("UnknownEvent", &[]);

    let err = parse_ces_event(&blob, schemas).unwrap_err();
    assert!(
        err.to_string().contains("UnknownEvent"),
        "Error should mention the unknown event: {err}"
    );
}

#[test]
fn rejects_truncated_payload() {
    let schemas = schemas_for(ContractType::Staking);
    // Staked expects Key + U256, but we only provide 2 bytes of garbage
    let blob = ces_blob("Staked", &[0x00, 0x01]);

    let result = parse_ces_event(&blob, schemas);
    assert!(result.is_err(), "Truncated payload must fail");
}

#[test]
fn schemas_for_unsupported_contract_returns_empty() {
    let schemas = schemas_for(ContractType::Usdc);
    assert!(schemas.is_empty());

    let schemas = schemas_for(ContractType::Treasury);
    assert!(schemas.is_empty());
}

#[test]
fn parses_large_u256_correctly() {
    let schemas = schemas_for(ContractType::Staking);

    // 10^24 = 1_000_000_000_000_000_000_000_000
    let large_amount = U256::from_dec_str("1000000000000000000000000").unwrap();

    let mut fields = Vec::new();
    fields.extend_from_slice(&account_key_bytes(&ZERO_ACCOUNT));
    fields.extend_from_slice(&large_amount.to_bytes().unwrap());

    let blob = ces_blob("Staked", &fields);
    let (_, data) = parse_ces_event(&blob, schemas).unwrap();

    assert_eq!(data["amount"], "1000000000000000000000000");
}

#[test]
fn key_format_matches_casper_convention() {
    let schemas = schemas_for(ContractType::Staking);

    let mut fields = Vec::new();
    fields.extend_from_slice(&account_key_bytes(&ZERO_ACCOUNT));
    fields.extend_from_slice(&U256::from(1).to_bytes().unwrap());

    let blob = ces_blob("Staked", &fields);
    let (_, data) = parse_ces_event(&blob, schemas).unwrap();

    let staker = data["staker"].as_str().unwrap();
    assert!(
        staker.starts_with("account-hash-"),
        "Key must use Casper formatted string: {staker}"
    );
    // account-hash- (13 chars) + 64 hex chars = 77
    assert_eq!(staker.len(), 77, "Formatted account hash length");
}
