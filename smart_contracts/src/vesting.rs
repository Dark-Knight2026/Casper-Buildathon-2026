use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::staking::StakingContractRef;

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
    /// Number of tokens already claimed by the beneficiary.
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

/// Emitted when a new vesting schedule is created.
#[odra::event]
pub struct ScheduleCreated {
    pub vesting_id: VestingId,
    pub beneficiary: Address,
    pub total_amount: U256,
    pub cliff_duration: u64,
    pub vesting_duration: u64,
}

/// Emitted when a beneficiary claims vested tokens.
#[odra::event]
pub struct TokensClaimed {
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
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(
    errors = Error,
    events = [ScheduleCreated, TokensClaimed],
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
    }

    /// Sets the Staking contract address (for future auto-staking integration).
    /// Currently unused — kept for forward compatibility.
    pub fn set_staking(&mut self, staking: Address) {
        self.assert_owner();
        self.staking.set(staking);
    }

    /// Grants an address permission to create vesting schedules.
    /// Typically used to whitelist the ICO contract.
    pub fn add_whitelisted_creator(&mut self, creator: Address) {
        self.assert_owner();
        self.whitelisted_creators.set(&creator, true);
    }

    /// Revokes an address's permission to create vesting schedules.
    pub fn remove_whitelisted_creator(&mut self, creator: Address) {
        self.assert_owner();
        self.whitelisted_creators.set(&creator, false);
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
            beneficiary,
            total_amount,
            cliff_duration,
            vesting_duration,
        });

        vesting_id
    }

    // =========================================================================
    // Token claiming (called by beneficiaries)
    // =========================================================================

    #[odra(non_reentrant)]
    pub fn claim(&self, vesting_id: VestingId) {
        // Check caller

        // Transfer claimable tokens
        let claimable_amt = self.get_claimable_amount(vesting_id);
        let schedule = self.get_schedule(vesting_id);

        // self.tailor_coin.transfer_from(
        //     &self.env().self_address,
        //     &self.env().caller(),
        //     &claimable_amt,
        // );

        self.env().emit_native_event(TokensClaimed {
            vesting_id,
            // TODO: Obviously need to fix this to not use unwrap()
            beneficiary: schedule.unwrap().beneficiary,
            amount: claimable_amt,
        });
        todo!()
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

    fn calculate_vested_amt(&self, schedule: &VestingSchedule) -> U256 {
        todo!()
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
}
