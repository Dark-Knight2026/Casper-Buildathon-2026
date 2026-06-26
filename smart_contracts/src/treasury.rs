use odra::{casper_types::U256, prelude::*, uints::ToU512, ContractRef};
use odra_modules::{
    access::Ownable,
    cep18_token::Cep18ContractRef,
    cep96::{Cep96, Cep96ContractMetadata},
};

use crate::treasury::{
    errors::Error,
    events::{BigCoinSet, ReservesWithdrawn, RewardsDeposited, TokenWithdrawn},
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
  BigCoinSet,
])]
pub struct Treasury {
    ownable: SubModule<Ownable>,
    big_coin: Var<Address>,
    /// CEP-96 on-chain discoverability metadata. Immutable after deploy.
    metadata: SubModule<Cep96>,
}

#[odra::module]
impl Treasury {
    // =============================================================================
    // Init
    // =============================================================================

    pub fn init(&mut self, owner: Address) {
        self.ownable.init(owner);
        self.metadata.init(
            Some("BIG LeaseFi Treasury".into()),
            Some(
                "Protocol treasury for BIG token reserves and protocol fee revenue.".into(),
            ),
            None,
            None,
        );
    }

    // =========================================================================
    // Owner-only configuration
    // =========================================================================

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

    /// Returns the BIG token contract address
    pub fn get_big_coin_contract_address(&self) -> Address {
        self.big_coin
            .get_or_revert_with(Error::BigCoinContractIsNotSet)
    }

    // =========================================================================
    // Deposit
    // =========================================================================

    /// Allows anyone to deposit BIG token rewards into Treasury reserves.
    ///
    /// This is the on-chain step after protocol fee revenue (e.g. the 2% rent fee collected
    /// by Escrow as CSPR/USDC/USDT) is converted to BIG off-chain:
    /// 1. Fees accumulate in the Treasury (as non-BIG tokens).
    /// 2. The Treasury owner withdraws them (via withdraw_token / self-balance).
    /// 3. Off-chain, the fee revenue is converted to BIG.
    /// 4. The caller approves and deposits the full BIG amount here; 100% stays as reserves.
    #[odra(non_reentrant)]
    pub fn deposit_rewards(&mut self, amount: U256) {
        if amount > U256::zero() {
            let mut big_coin =
                Cep18ContractRef::new(self.env(), self.get_big_coin_contract_address());

            big_coin.transfer_from(&self.env().caller(), &self.env().self_address(), &amount);

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

        to self.metadata {
            fn contract_name(&self) -> Option<String>;
            fn contract_description(&self) -> Option<String>;
            fn contract_icon_uri(&self) -> Option<String>;
            fn contract_project_uri(&self) -> Option<String>;
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
