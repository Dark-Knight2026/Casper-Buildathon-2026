use crate::staking::StakingContractRef;
use crate::vesting::{errors::*, events::*};
use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

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
    /// Number of tokens for which unstaking has been initiated (pending unbonding).
    pub unstaked_amount: U256,
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

    #[odra::event]
    pub struct EmergencyModeSet {
        pub is_enabled: bool,
    }

    #[odra::event]
    pub struct EmergencyClaim {
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
        ClaimBlockedByActiveUnbonding = 65_008,
        NotInEmergencyMode = 65_009,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(
    errors = Error,
    events = [
      ScheduleCreated, TokensClaimed, WhitelistedCreatorAdded, WhitelistedCreatorRemoved, EmergencyModeSet, EmergencyClaim
    ],
)]
pub struct Vesting {
    /// Ownership control — only the owner can configure the contract.
    ownable: SubModule<Ownable>,

    /// Reference to the Staking contract.
    /// Used to unstake tokens when transfer tokens out (claim).
    staking: External<StakingContractRef>,

    /// Reference to the TailorCoin (BIG) CEP-18 token contract.
    /// Used for emergency claims when staking is unavailable.
    tailor_coin: External<Cep18ContractRef>,

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

    /// Emergency mode flag. When enabled, owner can bypass staking for claims.
    is_emergency: Var<bool>,
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

    /// Sets the Staking contract address.
    pub fn set_staking(&mut self, staking: Address) {
        self.assert_owner();
        self.staking.set(staking);
    }

    /// Sets the TailorCoin (BIG) contract address.
    pub fn set_tailor_coin(&mut self, tailor_coin: Address) {
        self.assert_owner();
        self.tailor_coin.set(tailor_coin);
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

    /// Enables or disables emergency mode.
    pub fn toggle_emergency_mode(&mut self) {
        self.assert_owner();
        let current = self.is_emergency.get_or_default();
        self.is_emergency.set(!current);

        self.env().emit_native_event(EmergencyModeSet {
            is_enabled: !current,
        });
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

    /// Returns all of a given user's vesting schedules
    pub fn get_user_schedules(&self, user: Address) -> Vec<VestingId> {
        self.user_schedules.get_or_default(&user)
    }

    /// Returns how many schedules a user has
    pub fn get_user_schedules_count(&self, user: Address) -> u32 {
        let user_schedules = self.user_schedules.get_or_default(&user);
        user_schedules.len() as u32
    }

    /// Returns how many tokens are currently claimable for a given schedule
    /// Total Vested - already unstaked (unbonding initiated)
    pub fn get_claimable_amount(&self, vesting_id: VestingId) -> U256 {
        match self.schedules.get(&vesting_id) {
            Some(schedule) => {
                let vested = self.calculate_vested_amt(&schedule);
                vested - schedule.unstaked_amount
            }
            None => U256::zero(),
        }
    }

    /// Returns total amount vested including tokens already unstaked
    pub fn get_vested_amount(&self, vesting_id: VestingId) -> U256 {
        match self.schedules.get(&vesting_id) {
            Some(schedule) => self.calculate_vested_amt(&schedule),
            None => U256::zero(),
        }
    }

    pub fn is_whitelisted_creator(&self, creator: &Address) -> bool {
        self.whitelisted_creators.get_or_default(creator)
    }

    pub fn get_staking_contract_address(&self) -> Address {
        *self.staking.address()
    }

    pub fn get_tailor_coin_contract_address(&self) -> Address {
        *self.tailor_coin.address()
    }

    pub fn is_emergency_mode(&self) -> bool {
        self.is_emergency.get_or_default()
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
    /// @dev This contract does not hold tokens; it only records the schedule.
    /// Tokens are held by the Staking contract. Beneficiary can claim according
    /// to the vesting model (cliff, linear, or both) which triggers unstaking.
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
            unstaked_amount: U256::zero(),
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
    /// @dev Requires no active unbonding position in the Staking contract for the
    /// beneficiary. If a prior claim or direct unstake initiated unbonding, you must:
    /// 1. Wait for the 48-hour unbonding period to complete
    /// 2. Call `staking::withdraw_unbonded()` to clear the unbonding state
    /// 3. Then call this function
    /// Calling claim() while unbonding is in progress will revert with `ClaimBlock edByActiveUnbonding`.
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

        if !self
            .staking
            .get_staker_info(beneficiary)
            .unbonding_amount
            .is_zero()
        {
            self.env().revert(Error::ClaimBlockedByActiveUnbonding);
        }

        // Calculate how much vested minus whats already been unstaked
        let vested = self.calculate_vested_amt(&schedule);
        let claimable = vested - schedule.unstaked_amount;

        if claimable.is_zero() {
            self.env().revert(Error::NothingToClaim);
        }

        // Update unstaked amount before initiating unstake
        schedule.unstaked_amount += claimable;
        self.schedules.set(&vesting_id, schedule);

        // This only initiates the unbonding period, it does not transfer tokens yet.
        self.staking.unstake_for(beneficiary, claimable);

        self.env().emit_native_event(TokensClaimed {
            vesting_id,
            beneficiary,
            amount: claimable,
        });
    }

    // =========================================================================
    // Emergency Claiming (called if Staking is unavailable )
    // =========================================================================

    /// Emergency claim for vested tokens, bypassing the staking contract.
    ///
    /// Can only be called by the owner when emergency mode is enabled.
    /// Transfers tokens directly from the vesting contract's balance to the benificiary
    ///
    /// @dev This is a safety mechanism for when the staking contract is unavailable.
    /// The owner must ensure the vesting contract has sufficient token balance
    #[odra(non_reentrant)]
    pub fn emergency_claim(&mut self, vesting_id: VestingId) {
        self.assert_owner();

        if !self.is_emergency.get_or_default() {
            self.env().revert(Error::NotInEmergencyMode)
        }

        let mut schedule = self
            .schedules
            .get(&vesting_id)
            .unwrap_or_revert_with(&self.env(), Error::ScheduleNotFound);

        let beneficiary = schedule.beneficiary;

        // Calculate how much is vested but not yet claimed
        let vested = self.calculate_vested_amt(&schedule);
        let claimable = vested - schedule.unstaked_amount;

        if claimable.is_zero() {
            self.env().revert(Error::NothingToClaim);
        }

        // Update unstaked amount to track the emergency claim
        schedule.unstaked_amount += claimable;
        self.schedules.set(&vesting_id, schedule);

        self.tailor_coin.transfer(&beneficiary, &claimable);

        self.env().emit_native_event(EmergencyClaim {
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
