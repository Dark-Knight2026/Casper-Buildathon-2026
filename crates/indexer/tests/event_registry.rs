//! Tests for `EventType::parse` — validates that raw `(ContractType, event_name)`
//! pairs are resolved to the correct typed variant.

use indexer::{
    config::ContractType,
    events::{EventType, cep18::Cep18EventType, ico::IcoEventType},
};

// -----------------------------------------------------------------------------
// ICO events
// -----------------------------------------------------------------------------

/// `TokensPurchased` on the ICO contract must resolve to the correct variant.
#[test]
fn ico_tokens_purchased_parses_to_correct_variant() {
    assert_eq!(
        EventType::parse(ContractType::Ico, "TokensPurchased").unwrap(),
        EventType::Ico(IcoEventType::TokensPurchased),
    );
}

/// All remaining ICO event names must each parse to their respective variant.
#[test]
fn ico_all_variants_parse_correctly() {
    let cases = [
        ("IcoScheduleAdded", IcoEventType::IcoScheduleAdded),
        ("CurrencyAdded", IcoEventType::CurrencyAdded),
        ("CurrencyRemoved", IcoEventType::CurrencyRemoved),
        ("UnsoldTokensWithdrawn", IcoEventType::UnsoldTokensWithdrawn),
    ];

    for (name, expected) in cases {
        assert_eq!(
            EventType::parse(ContractType::Ico, name).unwrap(),
            EventType::Ico(expected),
            "ICO event `{name}` must parse to the correct variant",
        );
    }
}

/// An unrecognized event name on an ICO contract must return `Err`.
#[test]
fn ico_unknown_event_name_returns_error() {
    assert!(EventType::parse(ContractType::Ico, "UnknownEvent").is_err());
}

// -----------------------------------------------------------------------------
// CEP-18 events
// -----------------------------------------------------------------------------

/// `Transfer` on BIG, USDC, and USDT must all resolve to
/// `EventType::Cep18(Cep18EventType::Transfer)`.
#[test]
fn cep18_transfer_parses_for_all_token_contracts() {
    let expected = EventType::Cep18(Cep18EventType::Transfer);

    assert_eq!(
        EventType::parse(ContractType::Big, "Transfer").unwrap(),
        expected
    );
    assert_eq!(
        EventType::parse(ContractType::Usdc, "Transfer").unwrap(),
        expected
    );
    assert_eq!(
        EventType::parse(ContractType::Usdt, "Transfer").unwrap(),
        expected
    );
}

/// All CEP-18 event names must each parse to their respective variant.
#[test]
fn cep18_all_variants_parse_correctly() {
    let cases = [
        ("TransferFrom", Cep18EventType::TransferFrom),
        ("Mint", Cep18EventType::Mint),
        ("Burn", Cep18EventType::Burn),
        ("SetAllowance", Cep18EventType::SetAllowance),
        ("IncreaseAllowance", Cep18EventType::IncreaseAllowance),
        ("DecreaseAllowance", Cep18EventType::DecreaseAllowance),
    ];

    for (name, expected) in cases {
        assert_eq!(
            EventType::parse(ContractType::Big, name).unwrap(),
            EventType::Cep18(expected),
            "CEP-18 event `{name}` must parse to the correct variant",
        );
    }
}

/// An unrecognized event name on a CEP-18 contract must return `Err`.
#[test]
fn cep18_unknown_event_name_returns_error() {
    assert!(EventType::parse(ContractType::Big, "UnknownEvent").is_err());
}

// -----------------------------------------------------------------------------
// Unknown contract type
// -----------------------------------------------------------------------------

/// An unrecognized `ContractType` must return `Err` regardless of event name.
#[test]
fn unknown_contract_type_returns_error() {
    assert!(EventType::parse(ContractType::Unknown, "Transfer").is_err());
}
