//! Handler for the `ScheduleCreated` vesting contract event.

use serde::{Deserialize, Serialize};

use crate::backfill::parser::{CesEvent, EventSchema, FieldType};
use crate::{
    address,
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
};

/// Emitted when a new vesting schedule is created (typically by the ICO contract).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleCreated {
    /// Unique vesting schedule ID (U256 as string).
    pub vesting_id: String,
    /// Address of the whitelisted creator (e.g. ICO contract).
    pub whitelisted_creator: String,
    /// Address of the beneficiary who can claim tokens.
    pub beneficiary: String,
    /// Total number of tokens locked (U256 as string).
    pub total_amount: String,
    /// Block timestamp when the vesting clock starts (epoch ms).
    pub start_timestamp: u64,
    /// Duration before any tokens become claimable (ms).
    pub cliff_duration: u64,
    /// Total duration from start to full vesting (ms).
    pub vesting_duration: u64,
}

impl CesEvent for ScheduleCreated {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("vesting_id", FieldType::U256),
            ("whitelisted_creator", FieldType::Key),
            ("beneficiary", FieldType::Key),
            ("total_amount", FieldType::U256),
            ("start_timestamp", FieldType::U64),
            ("cliff_duration", FieldType::U64),
            ("vesting_duration", FieldType::U64),
        ],
    };
}

impl IndexableEvent for ScheduleCreated {
    const EVENT_NAME: &'static str = "ScheduleCreated";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let beneficiary = address::normalize_to_account_hash(&self.beneficiary)?;
        let creator = address::normalize_to_account_hash(&self.whitelisted_creator)?;

        db::upsert_vesting_schedule(
            ctx.tx,
            &db::NewVestingSchedule {
                vesting_id: &self.vesting_id,
                beneficiary: &beneficiary,
                whitelisted_creator: &creator,
                total_amount: &self.total_amount,
                start_timestamp: self.start_timestamp.cast_signed(),
                cliff_duration: self.cliff_duration.cast_signed(),
                vesting_duration: self.vesting_duration.cast_signed(),
                transaction_hash: ctx.deploy_hash,
                block_height: ctx.block_height.cast_signed(),
            },
        )
        .await?;

        tracing::info!(
            vesting_id = %self.vesting_id,
            beneficiary = %beneficiary,
            total_amount = %self.total_amount,
            "Indexed vesting schedule"
        );

        Ok(())
    }
}
