use odra::{casper_types::U256, prelude::*, uints::ToU512, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::constants::{INCENTIVES_REWARDS_BPS, ONE_HUNDRED_PERCENT_BPS, STAKING_REWARDS_BPS};
use crate::staking::StakingContractRef;
use crate::treasury::{
    errors::Error,
    events::{BigCoinSet, ReservesWithdrawn, RewardsDeposited, StakingSet, TokenWithdrawn},
};

// =============================================================================
// Events
// =============================================================================

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct RewardsDeposited {
        pub amount: U256,
    }

    #[odra::event]
    pub struct ReservesWithdrawn {
        pub recipient: Address,
        pub amount: U256,
    }

    #[odra::event]
    pub struct TokenWithdrawn {
        pub token: Option<Address>,
        pub amount: U256,
        pub recipient: Address,
    }

    #[odra::event]
    pub struct StakingSet {
        pub staking: Address,
    }

    #[odra::event]
    pub struct BigCoinSet {
        pub big_coin: Address,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        BigCoinContractIsNotSet = 200,
        StakingContractIsNotSet = 201,
        NotEnoughReserves = 202,
        InvalidWithdrawalAmount = 203,
        DirectReservesTokenWithdrawalIsNotAllowed = 204,
        InsufficientWithdrawalTokenAmount = 205,
        RenounceOwnershipNotAllowed = 206,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [
  RewardsDeposited,
  ReservesWithdrawn,
  TokenWithdrawn,
  StakingSet,
  BigCoinSet,
])]
pub struct Treasury {
    ownable: SubModule<Ownable>,
    staking: Var<Address>,
    big_coin: Var<Address>,
}

#[odra::module]
impl Treasury {
    // =============================================================================
    // Init
    // =============================================================================

    pub fn init(&mut self, owner: Address) {
        self.ownable.init(owner);
    }

    // =========================================================================
    // Owner-only configuration
    // =========================================================================

    /// Sets the Staking contract address by the owner
    pub fn set_staking(&mut self, staking: Address) {
        self.assert_owner();
        self.staking.set(staking);

        self.env().emit_event(StakingSet { staking });
    }

    /// Sets the BIG token contract address by the owner
    pub fn set_big_coin(&mut self, big_coin: Address) {
        self.assert_owner();
        self.big_coin.set(big_coin);

        self.env().emit_event(BigCoinSet { big_coin });
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    /// Returns the BIG token reserves stored on this contract and available to withdraw by the owner
    pub fn get_reserves(&self) -> U256 {
        Cep18ContractRef::new(self.env(), self.get_big_coin_contract_address())
            .balance_of(&self.env().self_address())
    }

    /// Returns the Staking contract address
    pub fn get_staking_contract_address(&self) -> Address {
        self.staking
            .get_or_revert_with(Error::StakingContractIsNotSet)
    }

    /// Returns the BIG token contract address
    pub fn get_big_coin_contract_address(&self) -> Address {
        self.big_coin
            .get_or_revert_with(Error::BigCoinContractIsNotSet)
    }

    // =========================================================================
    // Deposit
    // =========================================================================

    /// Allows to deposit any rewards amount in the BIG token by anyone, then distributes these rewards
    /// between the Staking contract and internal reserves.
    ///
    /// This is the mechanism by which protocol fee revenue (e.g. the 2% rent fee collected
    /// by Escrow and held in the Treasury as CSPR/USDC/USDT) reaches stakers:
    /// 1. Fees accumulate in the Treasury (as non-BIG tokens).
    /// 2. The Treasury owner withdraws them (via withdraw_token / self-balance).
    /// 3. Off-chain, the fee revenue is converted to BIG.
    /// 4. The owner (or any provider of the BIG) calls this function with the BIG amount
    ///    (after approve), routing 60% (STAKING_REWARDS_BPS) to stakers via Staking.deposit_rewards
    ///    (when stake > 0) and keeping 40% (INCENTIVES_REWARDS_BPS) as BIG reserves for future
    ///    incentives.
    ///
    /// If there is no active stake yet, the full deposit remains in Treasury reserves instead of reverting.
    #[odra(non_reentrant)]
    pub fn deposit_rewards(&mut self, amount: U256) {
        if amount > U256::zero() {
            let mut big_coin =
                Cep18ContractRef::new(self.env(), self.get_big_coin_contract_address());
            let staking_rewards = amount * STAKING_REWARDS_BPS / ONE_HUNDRED_PERCENT_BPS;
            let _incentive_reserves = amount * INCENTIVES_REWARDS_BPS / ONE_HUNDRED_PERCENT_BPS;
            let staking_address = self.get_staking_contract_address();
            let mut staking = StakingContractRef::new(self.env(), staking_address);

            big_coin.transfer_from(&self.env().caller(), &self.env().self_address(), &amount);

            // _incentive_reserves (40%) stay in Treasury as reserves (the amount not forwarded to staking);
            // explicit reference to INCENTIVES_REWARDS_BPS eliminates the previous dead code.

            if !staking_rewards.is_zero() && !staking.get_total_staked().is_zero() {
                big_coin.approve(&staking_address, &staking_rewards);
                staking.deposit_rewards(staking_rewards);
            }

            self.env().emit_event(RewardsDeposited { amount });
        }
    }

    /// Allows to receive CSPR tokens by this contract
    #[odra(payable)]
    pub fn receive(&self) {}

    // =========================================================================
    // Withdrawal
    // =========================================================================

    /// Allows to withdraw any available reserves amount by the owner
    #[odra(non_reentrant)]
    pub fn withdraw_reserves(&mut self, recipient: Address, amount: U256) {
        self.assert_owner();

        if self.get_reserves() < amount {
            self.env().revert(Error::NotEnoughReserves);
        }

        if amount > U256::zero() {
            Cep18ContractRef::new(self.env(), self.get_big_coin_contract_address())
                .transfer(&recipient, &amount);

            self.env()
                .emit_event(ReservesWithdrawn { recipient, amount });
        }
    }

    /// Allows to withdraw any token that is stored on this contract except of the BIG token which is the
    /// reserves token. Only the owner can interact with this entrypoint
    #[odra(non_reentrant)]
    pub fn withdraw_token(&mut self, token: Option<Address>, amount: U256, recipient: Address) {
        self.assert_owner();

        if amount.is_zero() {
            self.env().revert(Error::InvalidWithdrawalAmount);
        }

        match token {
            None => {
                let amount = amount.to_u512();

                if amount > self.env().self_balance() {
                    self.env().revert(Error::InsufficientWithdrawalTokenAmount);
                }

                self.env().transfer_tokens(&recipient, &amount);
            }
            Some(token) => {
                if token == self.get_big_coin_contract_address() {
                    self.env()
                        .revert(Error::DirectReservesTokenWithdrawalIsNotAllowed);
                }

                let mut token = Cep18ContractRef::new(self.env(), token);

                if amount > token.balance_of(&self.env().self_address()) {
                    self.env().revert(Error::InsufficientWithdrawalTokenAmount);
                }

                token.transfer(&recipient, &amount);
            }
        }

        self.env().emit_event(TokenWithdrawn {
            token,
            amount,
            recipient,
        });
    }

    // =========================================================================
    // Ownable Delegation
    // =========================================================================

    /// renounce_ownership is disabled to prevent accidental or malicious permanent
    /// removal of admin controls on this contract (which would brick fee handling,
    /// reward distribution, etc.).
    pub fn renounce_ownership(&mut self) {
        self.env().revert(Error::RenounceOwnershipNotAllowed);
    }

    delegate! {
        to self.ownable {
            fn transfer_ownership(&mut self, new_owner: &Address);
            fn get_owner(&self) -> Address;
        }
    }
}

// =============================================================================
// Internal helpers
// =============================================================================

impl Treasury {
    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }
}
