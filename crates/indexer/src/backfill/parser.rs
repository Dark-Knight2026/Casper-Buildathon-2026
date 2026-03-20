//! CES (Contract Event Standard) binary event parser.
//!
//! Casper CES events are stored in the `__events` dictionary using Casper's
//! `bytesrepr` binary format. This module uses [`casper_types::bytesrepr::FromBytes`]
//! to deserialize primitives (`String`, `U256`, `u64`, `Key`, `bool`) directly,
//! rather than hand-rolling binary parsers.
//!
//! Event schemas are defined via the [`CesEvent`] trait on each event struct,
//! co-located with the event definition. Admin-only events without handlers
//! use raw [`EventSchema`] constants directly.

use casper_types::{
    Key, U128, U256,
    bytesrepr::{Error, FromBytes},
};
use serde_json::{Map, Value};

use crate::error::{IndexerError, IndexerResult};

/// Trait for event types that can be deserialized from CES binary format.
///
/// Implement this on [`IndexableEvent`] structs to co-locate the CES binary
/// schema with the event definition. Admin-only events that don't implement
/// [`IndexableEvent`] should use raw [`EventSchema`] constants instead.
///
/// [`IndexableEvent`]: crate::event_trait::IndexableEvent
pub trait CesEvent {
    /// CES binary field schema (field names + types in emit order).
    const SCHEMA: EventSchema;
}

/// `Copy` subset of [`casper_types::CLType`] for use in `static` event schemas.
///
/// `CLType` itself contains `Box`-based variants (`Option`, `List`, etc.),
/// making it neither `Copy` nor `const`-constructible in `static` arrays.
#[derive(Debug, Clone, Copy)]
pub enum FieldType {
    /// UTF-8 string (u32 length-prefixed).
    /// Not used by current event schemas but needed for future CES contracts.
    #[allow(dead_code)]
    String,
    /// Casper Key - rendered as formatted string (e.g. `account-hash-abcd...`).
    Key,
    /// Boolean (1 byte).
    /// Not used by current event schemas but needed for future CES contracts.
    #[allow(dead_code)]
    Bool,
    /// u8 (1 byte) - rendered as a JSON number.
    U8,
    /// u64 (8 bytes LE).
    U64,
    /// U128 - rendered as decimal string.
    U128,
    /// U256 - rendered as decimal string.
    U256,
}

/// Schema for a single CES event: its name and ordered list of fields.
#[derive(Debug, Clone, Copy)]
pub struct EventSchema {
    /// CES event name (without the `event_` prefix).
    pub name: &'static str,
    /// Ordered field names and types (must match the contract's emit order).
    pub fields: &'static [(&'static str, FieldType)],
}

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
        FieldType::Key => {
            let (val, rest) = Key::from_bytes(bytes).map_err(bytesrepr_err)?;
            Ok((Value::String(val.to_formatted_string()), rest))
        }
        FieldType::Bool => {
            let (val, rest) = bool::from_bytes(bytes).map_err(bytesrepr_err)?;
            Ok((Value::Bool(val), rest))
        }
        FieldType::U8 => {
            let (val, rest) = u8::from_bytes(bytes).map_err(bytesrepr_err)?;
            Ok((Value::Number(val.into()), rest))
        }
        FieldType::U64 => {
            let (val, rest) = u64::from_bytes(bytes).map_err(bytesrepr_err)?;
            Ok((Value::Number(val.into()), rest))
        }
        FieldType::U128 => {
            let (val, rest) = U128::from_bytes(bytes).map_err(bytesrepr_err)?;
            Ok((Value::String(val.to_string()), rest))
        }
        FieldType::U256 => {
            let (val, rest) = U256::from_bytes(bytes).map_err(bytesrepr_err)?;
            Ok((Value::String(val.to_string()), rest))
        }
    }
}

/// Convert a `casper_types::bytesrepr::Error` into [`IndexerError::Parse`].
fn bytesrepr_err(e: Error) -> IndexerError {
    IndexerError::Parse(format!("CES bytesrepr: {e:?}"))
}
