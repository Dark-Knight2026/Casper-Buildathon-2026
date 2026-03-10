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

        if now < schedule.start_timestamp + schedule.cliff_duration {
            // still in the cliff period, nothing vested yet
            U256::zero()
        } else if now >= schedule.start_timestamp + schedule.vesting_duration {
            // past the vesting period, everything is vested
            schedule.total_amount
        } else {
            // linear vesting when between cliff and vesting periods
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
        host::{Deployer, HostEnv},
    };
    use odra_modules::access::errors::Error as AccessError;

    use crate::constants::{
        ONE_MONTH_IN_MILLISECONDS, PRIVATE_SALE_CLIFF_DURATION, PRIVATE_SALE_VESTING_DURATION,
    };
    use crate::tailor_coin::{TailorCoin, TailorCoinHostRef, TailorCoinInitArgs};

    use super::*;

    // =============================================================================
    // Test Constants
    // =============================================================================

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

        Context {
            env,
            tailor_coin,
            vesting,
            users,
            cliff_duration: PRIVATE_SALE_CLIFF_DURATION,
            vesting_duration: PRIVATE_SALE_VESTING_DURATION,
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
        // Note: In production, the ICO contract transfers tokens directly to the Staking contract
        // before calling create_schedule.
        // For testing, we just call create_schedule.
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
    // set_staking()
    // =============================================================================

    #[test]
    fn test_set_staking_should_revert_if_not_owner_is_calling() {
        let mut ctx = setup(odra_test::env());
        ctx.env.set_caller(ctx.users.alice);

        assert_eq!(
            ctx.vesting.try_set_staking(ctx.users.alice).unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by non-owner",
        );
    }

    #[test]
    fn test_set_staking_should_set_staking_properly() {
        let mut ctx = setup(odra_test::env());
        let new_address = ctx.users.alice;

        ctx.vesting.set_staking(new_address);

        assert_eq!(
            ctx.vesting.get_staking_contract_address(),
            new_address,
            "Invalid Staking contract address",
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
                .try_create_schedule(ctx.users.alice, vesting_amount(), 0, 0)
                .unwrap_err(),
            Error::InvalidVestingDuration.into(),
            "Should revert with zero vesting duration"
        )
    }

    #[test]
    fn test_create_schedule_should_revert_if_cliff_exceeds_duration() {
        let mut ctx = setup(odra_test::env());

        let cliff_duration = ctx.vesting_duration + ONE_MONTH_IN_MILLISECONDS;

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

        let current_owner_balance = ctx.tailor_coin.balance_of(&ctx.users.owner);
        let current_vesting_balance = ctx.tailor_coin.balance_of(&ctx.vesting.address());
        assert_eq!(
            current_owner_balance, prev_owner_balance,
            "Owner balance should not change"
        );
        assert_eq!(
            current_vesting_balance, prev_vesting_balance,
            "Vesting contract balance should not change"
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
            cliff + 3 * ONE_MONTH_IN_MILLISECONDS,
            vesting + 6 * ONE_MONTH_IN_MILLISECONDS,
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
        let mut ctx = setup(odra_test::env());
        ctx.env.set_caller(ctx.users.alice);

        assert_eq!(
            ctx.vesting.try_claim(U256::from(999)).unwrap_err(),
            Error::ScheduleNotFound.into(),
            "Should revert when schedule does not exist"
        );
    }

    #[test]
    fn test_claim_should_revert_if_caller_not_beneficiary() {
        let mut ctx = setup(odra_test::env());
        let cliff = ctx.cliff_duration;
        let vesting = ctx.vesting_duration;
        let alice = ctx.users.alice;

        let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

        ctx.env
            .advance_block_time(cliff + ONE_MONTH_IN_MILLISECONDS);

        // Bob tries to claim Alice's schedule
        ctx.env.set_caller(ctx.users.bob);

        assert_eq!(
            ctx.vesting.try_claim(vesting_id).unwrap_err(),
            Error::CallerNotBeneficiary.into(),
            "Should revert when caller is not the beneficiary"
        );
    }

    #[test]
    fn test_claim_should_revert_if_still_in_cliff_period() {
        let mut ctx = setup(odra_test::env());
        let cliff = ctx.cliff_duration;
        let vesting = ctx.vesting_duration;
        let alice = ctx.users.alice;

        let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

        // Advance to just before the cliff
        ctx.env
            .advance_block_time(cliff - ONE_MONTH_IN_MILLISECONDS);

        ctx.env.set_caller(alice);

        assert_eq!(
            ctx.vesting.try_claim(vesting_id).unwrap_err(),
            Error::NothingToClaim.into(),
            "Should revert if still in the cliff period"
        );
    }

    #[test]
    fn test_claim_should_update_claimed_amount_after_cliff() {
        let mut ctx = setup(odra_test::env());
        let cliff = ctx.cliff_duration;
        let vesting = ctx.vesting_duration;
        let alice = ctx.users.alice;

        let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

        // Advance to exactly the cliff, 50% vested
        ctx.env.advance_block_time(cliff);
        ctx.env.set_caller(alice);
        ctx.vesting.claim(vesting_id);

        let expected_claim = vesting_amount() / 2;

        // Verify schedule state
        let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();

        assert_eq!(
            schedule.claimed_amount, expected_claim,
            "Claim amount should be 50% (cliff/vesting)"
        );

        assert!(
            ctx.env.emitted_native_event(
                &ctx.vesting,
                TokensClaimed {
                    vesting_id,
                    beneficiary: alice,
                    amount: expected_claim,
                }
            ),
            "TokensCLaimed event should be emitted",
        );
    }

    #[test]
    #[ignore = "Enable once staking/unstaking token delivery is implemented"]
    fn test_claim_should_increase_beneficiary_balance_by_claimed_amount() {
        // Placeholder for the future delivery-path test. Until staking exists,
        // claim() intentionally only updates vesting accounting.
    }

    #[test]
    fn test_claim_should_claim_full_amt_after_vesting_ends() {
        let mut ctx = setup(odra_test::env());
        let cliff = ctx.cliff_duration;
        let vesting = ctx.vesting_duration;
        let alice = ctx.users.alice;

        let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

        ctx.env
            .advance_block_time(vesting + ONE_MONTH_IN_MILLISECONDS);
        ctx.env.set_caller(alice);
        ctx.vesting.claim(vesting_id);

        let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();

        assert_eq!(
            schedule.claimed_amount,
            vesting_amount(),
            "Claimed amt should equal total amount",
        );

        // Nothing left to claim
        ctx.env.set_caller(alice);

        assert_eq!(
            ctx.vesting.try_claim(vesting_id).unwrap_err(),
            Error::NothingToClaim.into(),
            "Should revert when fully claimed",
        );
    }

    #[test]
    fn test_claim_should_allow_incremental_claims() {
        let mut ctx = setup(odra_test::env());
        let cliff = ctx.cliff_duration;
        let vesting = ctx.vesting_duration;
        let alice = ctx.users.alice;

        let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

        // First claim at cliff
        ctx.env.advance_block_time(cliff);
        ctx.env.set_caller(alice);
        ctx.vesting.claim(vesting_id);

        let first_claim = vesting_amount() / 2;
        let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();

        assert_eq!(
            schedule.claimed_amount, first_claim,
            "First claim should be 50%",
        );

        // Second claim at 9 months (75%)
        ctx.env.advance_block_time(3 * ONE_MONTH_IN_MILLISECONDS);
        ctx.env.set_caller(alice);
        ctx.vesting.claim(vesting_id);

        let expected_total_claim = vesting_amount() * U256::from(9) / U256::from(12);
        let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();

        assert_eq!(
            schedule.claimed_amount, expected_total_claim,
            "Second claim should be for 75%",
        );

        //  Nothing more to claim at the same timestamp
        ctx.env.set_caller(alice);
        assert_eq!(
            ctx.vesting.try_claim(vesting_id).unwrap_err(),
            Error::NothingToClaim.into(),
            "Should revert when nothing to claim",
        );
    }

    #[test]
    fn test_claim_end_to_end_lifecycle() {
        let mut ctx = setup(odra_test::env());
        let cliff = ctx.cliff_duration;
        let vesting = ctx.vesting_duration;
        let alice = ctx.users.alice;
        let total_amount = vesting_amount();

        let start_time = ctx.env.block_time();
        let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

        // Advanced to just before the cliff period ends
        ctx.env.advance_block_time(5 * ONE_MONTH_IN_MILLISECONDS);

        // Try claiming before the cliff period has ended
        ctx.env.set_caller(alice);
        assert_eq!(
            ctx.vesting.try_claim(vesting_id).unwrap_err(),
            Error::NothingToClaim.into(),
            "Should revert when claiming before cliff period has ended",
        );

        // Advanced to exactly to the cliff end
        ctx.env.advance_block_time(ONE_MONTH_IN_MILLISECONDS);
        let cliff_time = start_time + cliff;
        assert_eq!(ctx.env.block_time(), cliff_time, "Should be at cliff time");

        // At cliff, half should be vested and claimable
        let expected_vested_at_cliff = total_amount / 2;
        assert_eq!(
            ctx.vesting.get_vested_amount(vesting_id),
            expected_vested_at_cliff,
            "50% should be vested at cliff",
        );
        assert_eq!(
            ctx.vesting.get_claimable_amount(vesting_id),
            expected_vested_at_cliff,
            "50% should be claimable at cliff",
        );

        // Claim the vested amount and check that none are left to claim at this timestamp
        ctx.env.set_caller(alice);
        ctx.vesting.claim(vesting_id);
        assert_eq!(
            ctx.vesting.get_claimable_amount(vesting_id),
            U256::zero(),
            "No more claim amount should be left",
        );

        // Advanced to after the cliff end
        ctx.env.advance_block_time(3 * ONE_MONTH_IN_MILLISECONDS);

        // 9 months at this point so should be 75% vested
        let expected_vested_at_9mo = total_amount * U256::from(9) / U256::from(12);

        // Expected claimable should be 25% of total amount:
        // Expected vested at 9 months (75%) - Expected vested at cliff (50%)
        let expected_claimable_at_9mo = expected_vested_at_9mo - expected_vested_at_cliff;

        assert_eq!(
            ctx.vesting.get_vested_amount(vesting_id),
            expected_vested_at_9mo,
            "Should be 75% vested at 9 months",
        );

        assert_eq!(
            ctx.vesting.get_claimable_amount(vesting_id),
            expected_claimable_at_9mo,
            "Should have 25% more available to be claimed",
        );

        // Claim the tokens and see if it matches the expected 75% vested amt
        ctx.env.set_caller(alice);
        ctx.vesting.claim(vesting_id);
        let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();
        assert_eq!(
            schedule.claimed_amount, expected_vested_at_9mo,
            "Total claimed so far should be at 75%",
        );

        // Advanced to the full vesting period, which is 12 months
        ctx.env.advance_block_time(3 * ONE_MONTH_IN_MILLISECONDS);

        let vesting_end_time = start_time + vesting;
        assert_eq!(
            ctx.env.block_time(),
            vesting_end_time,
            "Should be at the vesting end time"
        );

        assert_eq!(
            ctx.vesting.get_vested_amount(vesting_id),
            total_amount,
            "Should be 100% vested at 12 months",
        );

        // Should be 25% more left to claim
        let last_claimable = total_amount - expected_vested_at_9mo;
        assert_eq!(
            ctx.vesting.get_claimable_amount(vesting_id),
            last_claimable,
            "Should have remaining 25% left to be claimed",
        );

        // Claim the remaining tokens
        ctx.env.set_caller(alice);
        ctx.vesting.claim(vesting_id);
        let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();
        assert_eq!(
            schedule.claimed_amount, total_amount,
            "All the tokens should be claimed",
        );

        // Advance past vesting
        ctx.env.advance_block_time(ONE_MONTH_IN_MILLISECONDS);

        // Try to to claim past the vesting period
        ctx.env.set_caller(alice);
        assert_eq!(
            ctx.vesting.try_claim(vesting_id).unwrap_err(),
            Error::NothingToClaim.into(),
            "Should reveret when all tokens have been claimed",
        );

        // Verify the entire final state
        let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();
        assert_eq!(schedule.beneficiary, alice);
        assert_eq!(schedule.total_amount, total_amount);
        assert_eq!(schedule.claimed_amount, total_amount);
        assert_eq!(schedule.start_timestamp, start_time);
        assert_eq!(schedule.cliff_duration, cliff);
        assert_eq!(schedule.vesting_duration, vesting);
    }
}
