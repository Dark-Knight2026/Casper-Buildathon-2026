//! CES (Contract Event Standard) binary event parser.
//!
//! Casper CES events are stored in the `__events` dictionary using Casper's
//! `bytesrepr` binary format. This module uses [`casper_types::bytesrepr::FromBytes`]
//! to deserialize primitives (`String`, `U256`, `u64`, `Key`, `bool`) directly,
//! rather than hand-rolling binary parsers.
//!
//! Hardcoded schemas for vesting and staking events define the field order so
//! we can decode the binary without fetching `__events_schema` from chain.

use casper_types::{
    Key, U256,
    bytesrepr::{Error, FromBytes},
};
use serde_json::{Map, Value};

use crate::{
    config::ContractType,
    error::{IndexerError, IndexerResult},
    events::{staking::StakingEventType, vesting::VestingEventType},
};

/// `Copy` subset of [`casper_types::CLType`] for use in `static` event schemas.
///
/// `CLType` itself contains `Box`-based variants (`Option`, `List`, etc.),
/// making it neither `Copy` nor `const`-constructible in `static` arrays.
#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
pub enum FieldType {
    /// UTF-8 string (u32 length-prefixed).
    String,
    /// U256 - rendered as decimal string.
    U256,
    /// u64 (8 bytes LE).
    U64,
    /// Casper Key - rendered as formatted string (e.g. `account-hash-abcd...`).
    Key,
    /// Boolean (1 byte).
    Bool,
}

/// Schema for a single CES event: its name and ordered list of fields.
#[derive(Debug, Clone)]
pub struct EventSchema {
    /// CES event name (without the `event_` prefix).
    pub name: &'static str,
    /// Ordered field names and types (must match the contract's emit order).
    pub fields: &'static [(&'static str, FieldType)],
}

// -----------------------------------------------------------------------------
// CES event schemas
// -----------------------------------------------------------------------------

/// Returns event schemas for the given contract type.
///
/// Returns an empty slice for unsupported contract types.
#[inline]
#[must_use]
pub fn schemas_for(contract_type: ContractType) -> &'static [EventSchema] {
    match contract_type {
        ContractType::Vesting => VESTING_SCHEMAS,
        ContractType::Staking => STAKING_SCHEMAS,
        _ => &[],
    }
}

static VESTING_SCHEMAS: &[EventSchema] = &[
    EventSchema {
        name: VestingEventType::ScheduleCreated.as_str(),
        fields: &[
            ("vesting_id", FieldType::U256),
            ("whitelisted_creator", FieldType::Key),
            ("beneficiary", FieldType::Key),
            ("total_amount", FieldType::U256),
            ("start_timestamp", FieldType::U64),
            ("cliff_duration", FieldType::U64),
            ("vesting_duration", FieldType::U64),
        ],
    },
    EventSchema {
        name: VestingEventType::TokensClaimed.as_str(),
        fields: &[
            ("vesting_id", FieldType::U256),
            ("beneficiary", FieldType::Key),
            ("amount", FieldType::U256),
        ],
    },
    EventSchema {
        name: VestingEventType::WhitelistedCreatorAdded.as_str(),
        fields: &[("creator", FieldType::Key)],
    },
    EventSchema {
        name: VestingEventType::WhitelistedCreatorRemoved.as_str(),
        fields: &[("creator", FieldType::Key)],
    },
    // OwnershipTransferred is a generic CES event, not in VestingEventType.
    EventSchema {
        name: "OwnershipTransferred",
        fields: &[
            ("previous_owner", FieldType::Key),
            ("new_owner", FieldType::Key),
        ],
    },
];

static STAKING_SCHEMAS: &[EventSchema] = &[
    EventSchema {
        name: StakingEventType::Staked.as_str(),
        fields: &[("staker", FieldType::Key), ("amount", FieldType::U256)],
    },
    EventSchema {
        name: StakingEventType::UnstakedInitiated.as_str(),
        fields: &[
            ("staker", FieldType::Key),
            ("amount", FieldType::U256),
            ("unbonding_ends_at", FieldType::U64),
        ],
    },
    EventSchema {
        name: StakingEventType::UnbondedWithdrawn.as_str(),
        fields: &[("staker", FieldType::Key), ("amount", FieldType::U256)],
    },
    EventSchema {
        name: StakingEventType::RewardsDeposited.as_str(),
        fields: &[("caller", FieldType::Key), ("amount", FieldType::U256)],
    },
    EventSchema {
        name: StakingEventType::RewardsClaimed.as_str(),
        fields: &[("staker", FieldType::Key), ("amount", FieldType::U256)],
    },
];

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

/// Parse a CES binary event blob into `(event_name, JSON object)`.
///
/// The event name is returned without the `event_` prefix (e.g. `"ScheduleCreated"`).
///
/// # Errors
///
/// Returns [`IndexerError::Parse`] if the bytes are malformed or no matching
/// schema is found.
#[inline]
pub fn parse_ces_event(bytes: &[u8], schemas: &[EventSchema]) -> IndexerResult<(String, Value)> {
    // 1. Parse the event name string (prefixed with "event_").
    let (full_name, remainder) = String::from_bytes(bytes).map_err(bytesrepr_err)?;

    let event_name = full_name
        .strip_prefix("event_")
        .ok_or_else(|| {
            IndexerError::Parse(format!(
                "CES event name missing 'event_' prefix: {full_name}"
            ))
        })?
        .to_owned();

    // 2. Find matching schema.
    let schema = schemas
        .iter()
        .find(|s| s.name == event_name)
        .ok_or_else(|| IndexerError::Parse(format!("No CES schema for event: {event_name}")))?;

    // 3. Parse fields according to the schema.
    let mut remaining = remainder;
    let mut map = Map::with_capacity(schema.fields.len());

    for (field_name, field_type) in schema.fields {
        let (value, rest) = parse_field(remaining, *field_type)?;
        map.insert((*field_name).to_owned(), value);
        remaining = rest;
    }

    Ok((event_name, Value::Object(map)))
}

/// Parse a single field using `casper_types::bytesrepr::FromBytes`.
///
/// Returns the JSON value and the remaining unparsed bytes.
fn parse_field(bytes: &[u8], field_type: FieldType) -> IndexerResult<(Value, &[u8])> {
    match field_type {
        FieldType::String => {
            let (val, rest) = String::from_bytes(bytes).map_err(bytesrepr_err)?;
            Ok((Value::String(val), rest))
        }
        FieldType::U256 => {
            let (val, rest) = U256::from_bytes(bytes).map_err(bytesrepr_err)?;
            Ok((Value::String(val.to_string()), rest))
        }
        FieldType::U64 => {
            let (val, rest) = u64::from_bytes(bytes).map_err(bytesrepr_err)?;
            Ok((Value::Number(val.into()), rest))
        }
        FieldType::Key => {
            let (val, rest) = Key::from_bytes(bytes).map_err(bytesrepr_err)?;
            Ok((Value::String(val.to_formatted_string()), rest))
        }
        FieldType::Bool => {
            let (val, rest) = bool::from_bytes(bytes).map_err(bytesrepr_err)?;
            Ok((Value::Bool(val), rest))
        }
    }
}

/// Convert a `casper_types::bytesrepr::Error` into [`IndexerError::Parse`].
fn bytesrepr_err(e: Error) -> IndexerError {
    IndexerError::Parse(format!("CES bytesrepr: {e:?}"))
}
