use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::staking::StakingContractRef;
use crate::vesting::{errors::*, events::*};

// =============================================================================
// Vesting Types
// =============================================================================

/// Unique identifier for each vesting schedule (auto-incrementing counter).
pub type VestingId = U256;

#[odra::odra_type]
pub struct VestingSchedule {
    /// The address that can claim tokens from this schedule.
    pub beneficiary: Address,
    /// Total number of tokens locked in this schedule.
    pub total_amount: U256,
    /// Number of tokens claimed (unstaking initiated, pending unbonding).
    pub claimed_amount: U256,
    /// Block timestamp when the vesting clock starts (set at creation time).
    pub start_timestamp: u64,
    /// Duration (in time units) before any tokens become claimable.
    /// Must be <= vesting_duration.
    pub cliff_duration: u64,
    /// Total duration (in time units) from start to full vesting.
    /// After start + vesting_duration, all tokens are claimable.
    pub vesting_duration: u64,
}

// =============================================================================
// Events
// =============================================================================

pub mod events {
    use crate::vesting::VestingId;
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct WhitelistedCreatorAdded {
        pub creator: Address,
    }

    #[odra::event]
    pub struct WhitelistedCreatorRemoved {
        pub creator: Address,
    }

    #[odra::event]
    pub struct ScheduleCreated {
        pub vesting_id: VestingId,
        pub whitelisted_creator: Address,
        pub beneficiary: Address,
        pub total_amount: U256,
        pub start_timestamp: u64,
        pub cliff_duration: u64,
        pub vesting_duration: u64,
    }

    #[odra::event]
    pub struct TokensClaimed {
        pub vesting_id: VestingId,
        pub beneficiary: Address,
        pub amount: U256,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::OdraError;

    #[odra::odra_error]
    pub enum Error {
        CallerNotWhitelisted = 65_001,
        InvalidAmount = 65_002,
        InvalidVestingDuration = 65_003,
        CliffExceedsVestingDuration = 65_004,
        ScheduleNotFound = 65_005,
        CallerNotBeneficiary = 65_006,
        NothingToClaim = 65_007,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(
    errors = Error,
    events = [ScheduleCreated, TokensClaimed, WhitelistedCreatorAdded, WhitelistedCreatorRemoved],
)]
pub struct Vesting {
    /// Ownership control — only the owner can configure the contract.
    ownable: SubModule<Ownable>,

    /// Reference to the TailorCoin (BIG) CEP-18 token contract.
    /// Used to pull tokens in (create_schedule) and transfer tokens out (claim).
    tailor_coin: External<Cep18ContractRef>,

    /// TODO: Remove the next two comments when staking is implemented.
    /// Reference to the Staking contract (for future auto-staking of vested tokens).
    /// Currently unused — the staking contract does not yet have stake/unstake functions.
    /// Kept here so the address can be wired during deployment, ready for when
    /// staking integration is implemented.
    staking: External<StakingContractRef>,

    /// Stores each vesting schedule by its unique ID.
    schedules: Mapping<VestingId, VestingSchedule>,

    /// Auto-incrementing counter for generating unique schedule IDs.
    schedules_count: Var<VestingId>,

    /// Tracks which addresses are allowed to create vesting schedules.
    /// Typically the ICO contract is whitelisted so it can create schedules
    /// on behalf of token purchasers.
    whitelisted_creators: Mapping<Address, bool>,

    /// Maps (beneficiary, index) to schedule IDs for per-user lookup.
    /// Use with `user_schedules_counts` to iterate a user's schedules.
    user_schedules: Mapping<Address, Vec<VestingId>>,
}

#[odra::module]
impl Vesting {
    // =========================================================================
    // Initialization
    // =========================================================================

    pub fn init(&mut self, owner: Address) {
        self.ownable.init(owner);
    }

    // =========================================================================
    // Owner-only configuration
    // =========================================================================

    /// Sets the TailorCoin (BIG) token contract address.
    /// Must be called before any schedules can be created or claimed.
    pub fn set_tailor_coin(&mut self, tailor_coin: Address) {
        self.assert_owner();
        self.tailor_coin.set(tailor_coin);
    }

    /// Sets the Staking contract address (for future auto-staking integration).
    /// Currently unused — kept for forward compatibility.
    /// TODO: Remove above comment when staking is implemented.
    pub fn set_staking(&mut self, staking: Address) {
        self.assert_owner();
        self.staking.set(staking);
    }

    /// Grants an address permission to create vesting schedules.
    /// Typically used to whitelist the ICO contract.
    pub fn add_whitelisted_creator(&mut self, creator: Address) {
        self.assert_owner();
        self.whitelisted_creators.set(&creator, true);

        self.env()
            .emit_native_event(WhitelistedCreatorAdded { creator });
    }

    /// Revokes an address's permission to create vesting schedules.
    pub fn remove_whitelisted_creator(&mut self, creator: Address) {
        self.assert_owner();
        self.whitelisted_creators.set(&creator, false);

        self.env()
            .emit_native_event(WhitelistedCreatorRemoved { creator });
    }

    // =========================================================================
    // View functions
    // =========================================================================

    /// Returns schedule data for a given Vesting ID, or None if doesn't exist
    pub fn get_schedule(&self, vesting_id: VestingId) -> Option<VestingSchedule> {
        self.schedules.get(&vesting_id)
    }

    /// Returns total number of schedules ever created
    pub fn get_schedules_count(&self) -> U256 {
        self.schedules_count.get_or_default()
    }

    /// Returns how many schedules a user has
    // TODO: Odra contract entry points must return types that implement CLTyped and usize is not in that list.
    pub fn get_user_schedules_count(&self, user: Address) -> u32 {
        let user_schedules = self.user_schedules.get_or_default(&user);
        user_schedules.len() as u32
    }

    /// Returns how many tokens are currently claimable for a given schedule
    /// Total Vested - already claimed
    pub fn get_claimable_amount(&self, vesting_id: VestingId) -> U256 {
        match self.schedules.get(&vesting_id) {
            Some(schedule) => {
                let vested = self.calculate_vested_amt(&schedule);
                vested - schedule.claimed_amount
            }
            None => U256::zero(),
        }
    }

    /// Returns total amount vested including tokens already claimed
    pub fn get_vested_amount(&self, vesting_id: VestingId) -> U256 {
        match self.schedules.get(&vesting_id) {
            Some(schedule) => self.calculate_vested_amt(&schedule),
            None => U256::zero(),
        }
    }

    pub fn is_whitelisted_creator(&self, creator: &Address) -> bool {
        self.whitelisted_creators.get_or_default(creator)
    }

    pub fn get_tailor_coin_contract_address(&self) -> Address {
        *self.tailor_coin.address()
    }

    pub fn get_staking_contract_address(&self) -> Address {
        *self.staking.address()
    }

    // =========================================================================
    // Schedule creation (called by whitelisted EOA's or contracts like ICO)
    // =========================================================================

    /// Creates a new vesting schedule for a beneficiary
    ///
    /// The caller (ICO contract for example) must:
    ///   - Be whitelisted via `add_whitelisted_creator`
    ///   - Have already approved `total_amount` of BIG tokens to the Staking contract
    ///
    /// @dev This contract records vesting schedules only. No tokens are held by this contract or the Staking contract at this time. Token delivery is deferred pending Staking contract implementation.
    // TODO: Delete the above comment and replace with the comment below when staking is implemented:
    //  @dev This contract does not hold tokens; it only records the schedule.
    //  Tokens are held by the Staking contract. Beneficiary can claim according
    // to the vesting model (cliff, linear, or both) which triggers unstaking.
    pub fn create_schedule(
        &mut self,
        beneficiary: Address,
        total_amount: U256,
        cliff_duration: u64,
        vesting_duration: u64,
    ) -> VestingId {
        self.assert_whitelisted_creator();

        if total_amount.is_zero() {
            self.env().revert(Error::InvalidAmount);
        }
        if vesting_duration == 0 {
            self.env().revert(Error::InvalidVestingDuration);
        }
        if cliff_duration > vesting_duration {
            self.env().revert(Error::CliffExceedsVestingDuration);
        }

        let now = self.env().get_block_time();

        // Assign next available ID and store the created schedule
        let vesting_id = self.schedules_count.get_or_default();
        let schedule = VestingSchedule {
            beneficiary,
            total_amount,
            claimed_amount: U256::zero(),
            start_timestamp: now,
            cliff_duration,
            vesting_duration,
        };
        self.schedules.set(&vesting_id, schedule);
        self.schedules_count.set(vesting_id + 1);

        let mut user_schedules = self.user_schedules.get_or_default(&beneficiary);
        user_schedules.push(vesting_id);
        self.user_schedules.set(&beneficiary, user_schedules);

        self.env().emit_native_event(ScheduleCreated {
            vesting_id,
            whitelisted_creator: self.env().caller(),
            beneficiary,
            total_amount,
            start_timestamp: now,
            cliff_duration,
            vesting_duration,
        });

        vesting_id
    }

    // =========================================================================
    // Token claiming (called by beneficiaries)
    // =========================================================================

    /// Claims all unclaimed-vested tokens from a specific schedule
    ///
    /// Calculates how many tokens vested so far minus whats already been claimed,
    /// then initiates unstaking. That kicks off the unbonding period, which has be
    /// be pass by before the user can withdraw.
    ///
    /// @dev only the schedule's beneficiary can call this
    #[odra(non_reentrant)]
    pub fn claim(&mut self, vesting_id: VestingId) {
        let mut schedule = self
            .schedules
            .get(&vesting_id)
            .unwrap_or_revert_with(&self.env(), Error::ScheduleNotFound);

        let beneficiary = schedule.beneficiary;

        if self.env().caller() != beneficiary {
            self.env().revert(Error::CallerNotBeneficiary);
        }

        // Calculate how much vested minus whats already been claimed
        let vested = self.calculate_vested_amt(&schedule);
        let claimable = vested - schedule.claimed_amount;

        if claimable.is_zero() {
            self.env().revert(Error::NothingToClaim);
        }

        // Update claimed amount before transferring
        schedule.claimed_amount += claimable;
        self.schedules.set(&vesting_id, schedule);

        // TODO: Unstake the tokens from the staking contract
        // Will probably look something like this:
        // self.staking.unstake_for(beneficiary);

        self.env().emit_native_event(TokensClaimed {
            vesting_id,
            beneficiary,
            amount: claimable,
        });
    }

    // =========================================================================
    // Ownable delegation
    // =========================================================================

    delegate! {
      to self.ownable {
        fn transfer_ownership(&mut self, new_owner: &Address);
        fn renounce_ownership(&mut self);
        fn get_owner(&self) -> Address;
      }
    }
}

// =============================================================================
// Internal helpers
// =============================================================================

impl Vesting {
    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }

    #[inline]
    fn assert_whitelisted_creator(&self) {
        let is_whitelisted_creator = self.is_whitelisted_creator(&self.env().caller());
        if !is_whitelisted_creator {
            self.env().revert(Error::CallerNotWhitelisted)
        }
    }

    /// @dev this returns TOTAL vested amount. It does not account for prior claims
    fn calculate_vested_amt(&self, schedule: &VestingSchedule) -> U256 {
        let now = self.env().get_block_time();

        let cliff_period = schedule
            .start_timestamp
            .checked_add(schedule.cliff_duration)
            .unwrap_or(u64::MAX);

        let vesting_period = schedule
            .start_timestamp
            .checked_add(schedule.vesting_duration)
            .unwrap_or(u64::MAX);

        if now < cliff_period {
            // still in the cliff period, nothing vested yet
            U256::zero()
        } else if now >= vesting_period {
            // past the vesting period, everything is vested
            schedule.total_amount
        } else {
            // linear vesting when between cliff and vesting periods
            let elapsed = now - schedule.start_timestamp;
            schedule.total_amount * U256::from(elapsed) / U256::from(schedule.vesting_duration)
        }
    }
}
