//! Modular event system with trait-based dispatch.
//!
//! Each event type lives in its own module and implements [`IndexableEvent`].
//! The [`EventRegistry`] provides static dispatch to the appropriate handler
//! based on contract type and event name.

pub mod cep18;
pub mod db;
pub mod ico;
pub mod lease;
pub mod staking;
pub mod user_registry;
pub mod vesting;

use serde_json::Value;

use crate::{
    config::ContractType,
    error::{IndexerError, IndexerResult},
    event_trait::{EventContext, IndexableEvent},
    events::{
        cep18::Cep18EventType, ico::IcoEventType, lease::LeaseEventType, staking::StakingEventType,
        user_registry::UserRegistryEventType, vesting::VestingEventType,
    },
};

/// A typed event from any known contract — the single source of truth for
/// valid `(contract_type, event_name)` pairs.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EventType {
    /// An event emitted by the ICO contract.
    Ico(IcoEventType),
    /// An event emitted by a CEP-18 token contract (BIG, USDC, USDT).
    Cep18(Cep18EventType),
    /// An event emitted by the Vesting contract.
    Vesting(VestingEventType),
    /// An event emitted by the Staking contract.
    Staking(StakingEventType),
    /// An event emitted by the `UserRegistry` contract.
    UserRegistry(UserRegistryEventType),
    /// An event emitted by the `Lease` contract.
    Lease(LeaseEventType),
}

impl EventType {
    /// Parse a raw `(contract_type, event_name)` pair into a typed variant.
    ///
    /// # Errors
    ///
    /// Returns [`IndexerError::UnknownEvent`] if the event name is not
    /// recognized for the given contract type.
    #[inline]
    pub fn parse(contract_type: ContractType, event_name: &str) -> IndexerResult<Self> {
        let unknown = || IndexerError::UnknownEvent {
            contract_type: contract_type.as_str(),
            event_name: event_name.to_owned(),
        };

        match contract_type {
            ContractType::Ico => event_name
                .parse::<IcoEventType>()
                .map(Self::Ico)
                .map_err(|_| unknown()),

            ContractType::Big | ContractType::Usdc | ContractType::Usdt => event_name
                .parse::<Cep18EventType>()
                .map(Self::Cep18)
                .map_err(|_| unknown()),

            ContractType::Vesting => event_name
                .parse::<VestingEventType>()
                .map(Self::Vesting)
                .map_err(|_| unknown()),

            ContractType::Staking => event_name
                .parse::<StakingEventType>()
                .map(Self::Staking)
                .map_err(|_| unknown()),

            ContractType::UserRegistry => event_name
                .parse::<UserRegistryEventType>()
                .map(Self::UserRegistry)
                .map_err(|_| unknown()),

            ContractType::Lease => event_name
                .parse::<LeaseEventType>()
                .map(Self::Lease)
                .map_err(|_| unknown()),

            _ => Err(unknown()),
        }
    }
}

/// Dispatch a typed event to the correct handler.
///
/// Generates a `match` over `$event_type`. Each `$pat => $handler` arm
/// deserializes `$data` into `$handler` and calls [`IndexableEvent::process`].
/// The wildcard arm logs a warning and returns [`IndexerError::UnknownEvent`].
macro_rules! dispatch_events {
    (
        $event_type:expr, $ctx:expr, $data:expr, $name:expr;
        $($pat:pat => $handler:ty),+ $(,)?
    ) => {
        match $event_type {
            $( $pat => process_typed_event::<$handler>($ctx, $data).await, )+
            other => {
               tracing::warn!(event_type = ?other, "Event type recognized but not implemented yet");
                Err(IndexerError::UnknownEvent {
                    contract_type: $ctx.contract_type.as_str(),
                    event_name: $name.to_owned(),
                })

            }
        }
    };
}

/// Registry of event handlers for static dispatch.
#[derive(Debug, Clone, Copy, Default)]
pub struct EventRegistry;

impl EventRegistry {
    /// Create a new event registry with all known event handlers.
    #[must_use]
    #[inline]
    pub const fn new() -> Self {
        Self
    }

    /// Process an event by dispatching to the appropriate handler.
    ///
    /// # Errors
    ///
    /// Returns [`IndexerError::UnknownEvent`] if no handler is registered for
    /// this `(contract_type, event_name)` pair.
    #[inline]
    pub async fn process_event(
        &self,
        ctx: &mut EventContext<'_>,
        event_name: &str,
        event_data: Value,
    ) -> IndexerResult<()> {
        // Parse raw string into typed event (single validation point).
        let event_type = EventType::parse(ctx.contract_type, event_name)?;

        // Admin-only events that are parsed but require no indexing.
        if matches!(
            event_type,
            EventType::Vesting(
                VestingEventType::WhitelistedCreatorAdded
                    | VestingEventType::WhitelistedCreatorRemoved
            )
        ) {
            return Ok(());
        }

        // Type-safe dispatch - compiler enforces exhaustiveness.
        // Add new event handlers here. Unhandled event types fall through to
        // the wildcard arm and are stored as raw data in `blockchain_events`
        // without updating derived tables.
        dispatch_events!(
            event_type, ctx, event_data, event_name;
            EventType::Ico(IcoEventType::TokensPurchased) => ico::TokensPurchased,
            EventType::Ico(IcoEventType::IcoScheduleAdded) => ico::IcoScheduleAdded,
            EventType::Cep18(Cep18EventType::Transfer) => cep18::Transfer,
            EventType::Cep18(Cep18EventType::Mint) => cep18::Mint,
            EventType::Cep18(Cep18EventType::SetAllowance) => cep18::SetAllowance,
            EventType::Vesting(VestingEventType::ScheduleCreated) => vesting::ScheduleCreated,
            EventType::Vesting(VestingEventType::TokensClaimed) => vesting::TokensClaimed,
            EventType::Staking(StakingEventType::Staked) => staking::Staked,
            EventType::Staking(StakingEventType::UnstakedInitiated) => staking::UnstakedInitiated,
            EventType::Staking(StakingEventType::UnbondedWithdrawn) => staking::UnbondedWithdrawn,
            EventType::Staking(StakingEventType::RewardsDeposited) => staking::RewardsDeposited,
            EventType::Staking(StakingEventType::RewardsClaimed) => staking::RewardsClaimed,
            EventType::Staking(StakingEventType::StakerSnapshot) => staking::StakerSnapshot,
            EventType::UserRegistry(UserRegistryEventType::UserCreated) => user_registry::UserCreated,
            EventType::Lease(LeaseEventType::LeaseAgreementCreated) => lease::LeaseAgreementCreated,
            EventType::Lease(LeaseEventType::LeaseAgreementFinished) => lease::LeaseAgreementFinished,
            EventType::Lease(LeaseEventType::EquityEligibilityGranted) => lease::EquityEligibilityGranted,
            EventType::Lease(LeaseEventType::EquityEligibilityRevoked) => lease::EquityEligibilityRevoked,
        )
    }
}

/// Helper to deserialize and process a typed event.
async fn process_typed_event<E: IndexableEvent>(
    ctx: &mut EventContext<'_>,
    event_data: Value,
) -> IndexerResult<()> {
    serde_json::from_value::<E>(event_data)?.process(ctx).await
}
