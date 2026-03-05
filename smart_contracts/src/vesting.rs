use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::{staking::StakingContractRef, vesting};

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
    /// Number of tokens actually withdrawn (sent to beneficiary after unbonding).
    pub withdrawn_amount: U256,
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

#[odra::event]
pub struct TailorCoinAddressSet {
    pub tailor_coin: Address,
}

#[odra::event]
pub struct StakingAddressSet {
    pub staking: Address,
}

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
pub struct TokensWithdrawn {
    pub vesting_id: VestingId,
    pub beneficiary: Address,
    pub amount: U256,
}

// =============================================================================
// Errors
// =============================================================================

#[odra::odra_error]
pub enum Error {
    CallerNotWhitelisted = 65_001,
    InvalidAmount = 65_002,
    InvalidVestingDuration = 65_003,
    CliffExceedsVestingDuration = 65_004,
    ScheduleNotFound = 65_005,
    CallerNotBeneficiary = 65_006,
    NothingToClaim = 65_007,
    NothingToWithdraw = 65_008,
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(
    errors = Error,
    events = [ScheduleCreated, TokensClaimed, TokensWithdrawn],
)]
pub struct Vesting {
    /// Ownership control — only the owner can configure the contract.
    ownable: SubModule<Ownable>,

    /// Reference to the TailorCoin (BIG) CEP-18 token contract.
    /// Used to pull tokens in (create_schedule) and transfer tokens out (claim).
    tailor_coin: External<Cep18ContractRef>,

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

        self.env()
            .emit_native_event(TailorCoinAddressSet { tailor_coin });
    }

    /// Sets the Staking contract address (for future auto-staking integration).
    /// Currently unused — kept for forward compatibility.
    pub fn set_staking(&mut self, staking: Address) {
        self.assert_owner();
        self.staking.set(staking);

        self.env().emit_native_event(StakingAddressSet { staking });
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
        // return the schedule data basesd on vesting id
        self.schedules.get(&vesting_id)
    }

    /// Returns total number of schedules ever created
    pub fn get_schedules_count(&self) -> U256 {
        self.schedules_count.get_or_default()
    }

    /// Returns how many schedules a user has
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
    // Schedule creation (called by whitelisted contracts like ICO)
    // =========================================================================

    /// Creates a new vesting schedule for a beneficiary
    ///
    /// The caller (ICO contract for example) must:
    ///   - Be whitelisted via `add_whitelisted_creator`
    ///   - Have approved this contract to spend `total_amount` of BIG tokens
    ///
    /// @dev The contract pulls tokens from the caller, locks them and
    /// records the schedule. Beneficiary can claim them to withdraw vestedd tokens
    /// according to the vesting model (cliff, linear, or both)
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

        // Transfer BIG tokens from the caller to this contract
        // TODO: Pretty sure the caller must approved this contract first before transfer
        // Need to check on that
        let sender = self.env().caller().clone();
        let receiver = self.env().self_address().clone();
        self.tailor_coin
            .transfer_from(&sender, &receiver, &total_amount);

        // Assign next available ID and store the created schedule
        let vesting_id = self.schedules_count.get_or_default();
        let schedule = VestingSchedule {
            beneficiary,
            total_amount,
            claimed_amount: U256::zero(),
            withdrawn_amount: U256::zero(),
            start_timestamp: self.env().get_block_time(),
            cliff_duration,
            vesting_duration,
        };
        self.schedules.set(&vesting_id, schedule);
        self.schedules_count.set(vesting_id + 1);

        // Add this schedule ID to beneficiary list
        let mut user_schedules = self.user_schedules.get_or_default(&beneficiary);
        user_schedules.push(vesting_id);

        // TODO: once staking contract is implemented with staking/unstaking functions, auto-stake
        // Something like:
        // self.staking.stake(beneficiary, total_amount)

        self.env().emit_native_event(ScheduleCreated {
            vesting_id,
            whitelisted_creator: self.env().caller(),
            beneficiary,
            total_amount,
            start_timestamp: self.env().get_block_time(),
            cliff_duration,
            vesting_duration,
        });

        vesting_id
    }

    // =========================================================================
    // Token claiming and Withdrawing (called by beneficiaries)
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

        if self.env().caller() != schedule.beneficiary {
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
        self.schedules.set(&vesting_id, schedule.clone());

        // TODO: Unstake the tokens from the staking contract
        // Will probably look something like this:
        // self.staking.unstake_for(&schedule.beneficiary);

        self.env().emit_native_event(TokensClaimed {
            vesting_id,
            beneficiary: schedule.beneficiary,
            amount: claimable,
        });
    }

    /// Withdraws claimed tokens after the staking contract's unbonding period
    /// Transfers tokens that have been claimed via `claimed()`
    ///
    /// @dev only the schedule's beneficiary can call this
    #[odra(non_reentrant)]
    pub fn withdraw(&mut self, vesting_id: VestingId) {
        let mut schedule = self
            .schedules
            .get(&vesting_id)
            .unwrap_or_revert_with(&self.env(), Error::ScheduleNotFound);

        if self.env().caller() != schedule.beneficiary {
            self.env().revert(Error::CallerNotBeneficiary);
        }

        let withdrawable = schedule.claimed_amount - schedule.withdrawn_amount;

        if withdrawable.is_zero() {
            self.env().revert(Error::NothingToWithdraw);
        }

        schedule.withdrawn_amount += withdrawable;
        self.schedules.set(&vesting_id, schedule.clone());

        // TODO: Pull tokens back from staking after unbonding period.
        // Will probably look something like this:
        // self.staking.withdraw_for(&schedule.beneficiary);
        // And then can delete this transfer function:
        self.tailor_coin
            .transfer(&schedule.beneficiary, &withdrawable);

        self.env().emit_native_event(TokensWithdrawn {
            vesting_id,
            beneficiary: schedule.beneficiary,
            amount: withdrawable,
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

        if now < schedule.start_timestamp + schedule.cliff_duration {
            // still in the cliff period, nothing vested yet
            U256::zero()
        } else if now >= schedule.start_timestamp + schedule.vesting_duration {
            // past the vesting period, everything is vested
            schedule.total_amount
        } else {
            // TODO: I'm not sure if this straight linear vesting is congruent with the white paper.
            //       This needs to be checked especially since I think different distributions have //       different vesting strategies
            // linear vesting when between cliff and vesting periods
            // vested = total_amount * elapsed_since_start / total_vesting_duration
            let elapsed = now - schedule.start_timestamp;
            schedule.total_amount * U256::from(elapsed) / U256::from(schedule.vesting_duration)
        }
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use odra::{
        casper_types::U256,
        host::{Deployer, HostEnv, HostRef},
    };
    use odra_modules::access::errors::Error as AccessError;

    use crate::tailor_coin::{TailorCoin, TailorCoinHostRef, TailorCoinInitArgs};

    use super::*;

    // =============================================================================
    // Test Constants
    // =============================================================================

    const ONE_MINUTE: u64 = 60;
    const ONE_HOUR: u64 = 60 * ONE_MINUTE;
    const ONE_DAY: u64 = 24 * ONE_HOUR;
    const ONE_MONTH: u64 = 30 * ONE_DAY;

    const INITIAL_SUPPLY: u64 = 5_000_000_000;

    /// Initial supply converted into wei
    fn initial_supply() -> U256 {
        U256::from(INITIAL_SUPPLY) * U256::from(10).pow(U256::from(18))
    }

    /// Some vesting amount for tests: 1000 tokens converted to wei
    fn vesting_amount() -> U256 {
        U256::from(1000u64) * U256::from(10).pow(U256::from(18))
    }

    // =============================================================================
    // Test Context
    // =============================================================================

    struct Users {
        owner: Address,
        alice: Address,
        bob: Address,
    }

    struct Context {
        env: HostEnv,
        tailor_coin: TailorCoinHostRef,
        vesting: VestingHostRef,
        users: Users,
        cliff_duration: u64,
        vesting_duration: u64,
    }

    fn setup(env: HostEnv) -> Context {
        let users = Users {
            owner: env.get_account(0),
            alice: env.get_account(1),
            bob: env.get_account(2),
        };

        let tailor_coin = TailorCoin::deploy(
            &env,
            TailorCoinInitArgs {
                symbol: String::from("BIG"),
                name: String::from("BIG"),
                decimals: 18,
                initial_supply: initial_supply(),
            },
        );

        // Set up Vesting contract
        let mut vesting = Vesting::deploy(&env, VestingInitArgs { owner: users.owner });
        vesting.set_tailor_coin(tailor_coin.address());
        vesting.add_whitelisted_creator(users.owner);

        // Set duration variables
        let cliff_duration = 6 * ONE_MONTH;
        let vesting_duration = 12 * ONE_MONTH;

        Context {
            env,
            tailor_coin,
            vesting,
            users,
            cliff_duration,
            vesting_duration,
        }
    }

    // =============================================================================
    // Helpers
    // =============================================================================

    fn create_test_schedule(
        ctx: &mut Context,
        beneficiary: Address,
        total_amount: U256,
        cliff_duration: u64,
        vesting_duration: u64,
    ) -> VestingId {
        ctx.tailor_coin
            .approve(&ctx.vesting.address(), &total_amount);
        ctx.vesting
            .create_schedule(beneficiary, total_amount, cliff_duration, vesting_duration)
    }

    // =============================================================================
    // init()
    // =============================================================================

    #[test]
    fn test_init_should_initialize_contract_properly() {
        let ctx = setup(odra_test::env());

        assert_eq!(ctx.vesting.get_owner(), ctx.users.owner, "Invalid Owner");
        assert_eq!(
            ctx.vesting.get_tailor_coin_contract_address(),
            ctx.tailor_coin.address(),
            "Invalid TailorCoin contract address"
        );
        assert_eq!(
            ctx.vesting.get_schedules_count(),
            U256::zero(),
            "Should start with zero schedules"
        );
    }

    // =============================================================================
    // set_tailor_coin()
    // =============================================================================

    #[test]
    fn test_set_tailor_coin_should_revert_if_not_owner_is_calling() {
        let mut ctx = setup(odra_test::env());
        ctx.env.set_caller(ctx.users.alice);

        assert_eq!(
            ctx.vesting
                .try_set_tailor_coin(ctx.users.alice)
                .unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by non-owner",
        );
    }

    #[test]
    fn test_set_tailor_coin_should_set_tailor_coin_properly() {
        let mut ctx = setup(odra_test::env());
        let new_address = ctx.users.alice;

        ctx.vesting.set_tailor_coin(new_address);

        assert_eq!(
            ctx.vesting.get_tailor_coin_contract_address(),
            new_address,
            "Invalid TailorCoin contract address",
        );
    }

    // =============================================================================
    // add/remove_whitelisted_creator()
    // =============================================================================

    #[test]
    fn test_add_whitelisted_creator_should_revert_if_not_owner_calling() {
        let mut ctx = setup(odra_test::env());
        ctx.env.set_caller(ctx.users.alice);

        assert_eq!(
            ctx.vesting
                .try_add_whitelisted_creator(ctx.users.alice)
                .unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by non-owner",
        )
    }

    #[test]
    fn test_add_whitelisted_creator_should_add_properly() {
        let mut ctx = setup(odra_test::env());
        ctx.env.set_caller(ctx.users.owner);

        assert!(
            !ctx.vesting.is_whitelisted_creator(&ctx.users.alice),
            "Alice should not initially be whitelisted",
        );

        ctx.vesting.add_whitelisted_creator(ctx.users.alice);
        assert!(
            ctx.vesting.is_whitelisted_creator(&ctx.users.alice),
            "Alice should be whitelisted",
        );
    }

    #[test]
    fn test_remove_whitelisted_creator_should_remove_properly() {
        let mut ctx = setup(odra_test::env());
        ctx.env.set_caller(ctx.users.owner);

        // Owner was whitelisted in the setup
        assert!(
            ctx.vesting.is_whitelisted_creator(&ctx.users.owner),
            "Owner should be whitelisted",
        );

        ctx.vesting.remove_whitelisted_creator(ctx.users.owner);
        assert!(
            !ctx.vesting.is_whitelisted_creator(&ctx.users.owner),
            "Owner should no longer be whitelisted",
        );
    }

    // =============================================================================
    // create_schedule()
    // =============================================================================

    #[test]
    fn test_create_schedule_should_revert_if_not_whitelisted() {
        let mut ctx = setup(odra_test::env());
        ctx.env.set_caller(ctx.users.alice);

        assert_eq!(
            ctx.vesting
                .try_create_schedule(
                    ctx.users.alice,
                    vesting_amount(),
                    ctx.cliff_duration,
                    ctx.vesting_duration
                )
                .unwrap_err(),
            Error::CallerNotWhitelisted.into(),
            "Should revert when caller is not whitelisted",
        )
    }

    #[test]
    fn test_create_schedule_should_revert_if_amount_is_zero() {
        let mut ctx = setup(odra_test::env());

        assert_eq!(
            ctx.vesting
                .try_create_schedule(
                    ctx.users.alice,
                    U256::zero(),
                    ctx.cliff_duration,
                    ctx.vesting_duration,
                )
                .unwrap_err(),
            Error::InvalidAmount.into(),
            "Should revert with zero amount"
        )
    }

    #[test]
    fn test_create_schedule_should_revert_if_vesting_duration_is_zero() {
        let mut ctx = setup(odra_test::env());

        assert_eq!(
            ctx.vesting
                .try_create_schedule(
                    ctx.users.alice,
                    vesting_amount(),
                    ctx.cliff_duration,
                    ctx.vesting_duration,
                )
                .unwrap_err(),
            Error::InvalidVestingDuration.into(),
            "Should revert with zero vesting duration"
        )
    }

    #[test]
    fn test_create_schedule_should_revert_if_cliff_exceeds_duration() {
        let mut ctx = setup(odra_test::env());

        let cliff_duration = ctx.vesting_duration + ONE_DAY;

        assert_eq!(
            ctx.vesting
                .try_create_schedule(
                    ctx.users.alice,
                    vesting_amount(),
                    cliff_duration,
                    ctx.vesting_duration,
                )
                .unwrap_err(),
            Error::CliffExceedsVestingDuration.into(),
            "Should revert if cliff duration exceeds vesting duration"
        )
    }

    #[test]
    fn test_create_schedule_should_create_properly() {
        let mut ctx = setup(odra_test::env());
        let cliff = ctx.cliff_duration;
        let vesting = ctx.vesting_duration;
        let alice = ctx.users.alice;

        let prev_owner_balance = ctx.tailor_coin.balance_of(&ctx.users.owner);
        let prev_vesting_balance = ctx.tailor_coin.balance_of(&ctx.vesting.address());

        let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

        // Verify schedule ID.
        assert_eq!(vesting_id, U256::zero(), "First schedule should have ID 0");
        assert_eq!(
            ctx.vesting.get_schedules_count(),
            U256::from(1),
            "Schedules count should be 1"
        );

        // Verify Tailor coins were pulled from the owner into the vestin contract
        let current_owner_balance = ctx.tailor_coin.balance_of(&ctx.users.owner);
        let current_vesting_balance = ctx.tailor_coin.balance_of(&ctx.vesting.address());
        assert_eq!(
            current_owner_balance,
            prev_owner_balance - vesting_amount(),
            "Owner balance should decrease by vesting amount"
        );
        assert_eq!(
            current_vesting_balance,
            prev_vesting_balance + vesting_amount(),
            "Vesting contract balance should increase by vesting amount"
        );

        // Verified stored data
        let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();
        assert_eq!(schedule.beneficiary, alice, "Invalid beneficiary");
        assert_eq!(
            schedule.total_amount,
            vesting_amount(),
            "Invalid total amount"
        );
        assert_eq!(
            schedule.claimed_amount,
            U256::zero(),
            "Claimed should be zero"
        );
        assert_eq!(schedule.cliff_duration, cliff, "Invalid Cliff duration");
        assert_eq!(
            schedule.vesting_duration, vesting,
            "Invalid Vesting duration"
        );

        // Verify user tracking
        assert_eq!(
            ctx.vesting.get_user_schedules_count(alice),
            1,
            "Alice should have 1 schedule"
        );

        // Verify event.
        assert!(
            ctx.env.emitted_native_event(
                &ctx.vesting,
                ScheduleCreated {
                    vesting_id,
                    whitelisted_creator: ctx.users.owner,
                    beneficiary: ctx.users.alice,
                    total_amount: vesting_amount(),
                    start_timestamp: ctx.env.block_time(),
                    cliff_duration: cliff,
                    vesting_duration: vesting,
                }
            ),
            "ScheduleCreated event should be emitted"
        );
    }

    #[test]
    fn test_create_schedule_should_support_multiple_schedules_per_user() {
        let mut ctx = setup(odra_test::env());
        let amount = vesting_amount();
        let cliff = ctx.cliff_duration;
        let vesting = ctx.vesting_duration;
        let alice = ctx.users.alice;

        let id_0 = create_test_schedule(&mut ctx, alice, amount, cliff, vesting);
        let id_1 = create_test_schedule(
            &mut ctx,
            alice,
            amount,
            cliff + 3 * ONE_MONTH,
            vesting + 6 * ONE_MONTH,
        );

        assert_eq!(id_0, U256::zero(), "First schedule ID should be 0");
        assert_eq!(id_1, U256::from(1), "Second schedule ID should be 1");
        assert_eq!(
            ctx.vesting.get_schedules_count(),
            U256::from(2),
            "Total schedules should be 2"
        );
        assert_eq!(
            ctx.vesting.get_user_schedules_count(alice),
            2,
            "Alice should have 2 schedules"
        );
    }

    // =============================================================================
    // claim()
    // =============================================================================
    
    #[test]
    fn test_claim_should_revert_if_schedule_not_found() {
      
    }
}
