use odra::{
    casper_types::{bytesrepr::Bytes, U256},
    prelude::*,
};
use odra_modules::{
    access::Ownable,
    cep95::{CEP95Interface, Cep95},
};

use crate::nft::{
    errors::Error,
    events::{BurnerAdded, BurnerRemoved, MinterAdded, MinterRemoved},
};

#[odra::module(errors = Error, events = [MinterAdded, MinterRemoved, BurnerAdded, BurnerRemoved])]
pub struct NFT {
    ownable: SubModule<Ownable>,
    cep95: SubModule<Cep95>,
    minters: Mapping<Address, bool>,
    burners: Mapping<Address, bool>,
    tokens_count: Var<U256>,
}

#[odra::module]
impl NFT {
    pub fn init(
        &mut self,
        owner: Address,
        symbol: String,
        name: String,
        minters: Vec<Address>,
        burners: Vec<Address>,
    ) {
        self.ownable.init(owner);
        self.cep95.init(symbol, name);

        minters
            .iter()
            .for_each(|minter| self.add_minter_internal(minter));
        burners
            .iter()
            .for_each(|burner| self.add_burner_internal(burner));
    }

    /// Allows to add a new minter by the owner
    pub fn add_minter(&mut self, minter: &Address) {
        self.assert_owner();
        self.add_minter_internal(minter);
    }

    /// Allows to remove a minter by the owner
    pub fn remove_minter(&mut self, minter: &Address) {
        self.assert_owner();
        self.minters.set(&minter, false);

        self.env()
            .emit_native_event(MinterRemoved { minter: *minter });
    }

    /// Allows to add a new burner by the owner
    pub fn add_burner(&mut self, burner: &Address) {
        self.assert_owner();
        self.add_burner_internal(burner);
    }

    /// Allows to remove a burner by the owner
    pub fn remove_burner(&mut self, burner: &Address) {
        self.assert_owner();
        self.burners.set(&burner, false);

        self.env()
            .emit_native_event(BurnerRemoved { burner: *burner });
    }

    /// Allows to mint new token and set its metadata by the minter
    pub fn mint(&mut self, to: Address, metadata: Vec<(String, String)>) {
        self.assert_minter();

        let token_id = self.tokens_count.get_or_default();

        self.cep95.raw_mint(to, token_id, metadata);
        self.tokens_count.set(token_id + 1);
    }

    /// Allows to burn a token by the burner
    pub fn burn(&mut self, token_id: U256) {
        self.assert_burner();
        self.cep95.raw_burn(token_id);
    }

    /// Allows to set new metadata for a token by the minter or the burner
    pub fn set_metadata(&mut self, token_id: U256, metadata: Vec<(String, String)>) {
        self.assert_minter_or_burner();
        self.cep95.set_metadata(token_id, metadata);
    }

    /// Allows to update metadata for a token by the minter or the burner
    pub fn update_metadata(&mut self, token_id: U256, metadata: Vec<(String, String)>) {
        self.assert_minter_or_burner();
        self.cep95.update_metadata(token_id, metadata);
    }

    /// Returns `true` if `address` has the `minter` role, `false` otherwise
    pub fn is_minter(&self, address: &Address) -> bool {
        self.minters.get_or_default(&address)
    }

    /// Returns `true` if `address` has the `burner` role, `false` otherwise
    pub fn is_burner(&self, address: &Address) -> bool {
        self.burners.get_or_default(&address)
    }

    /// Returns a number of minted tokens
    pub fn get_tokens_count(&self) -> U256 {
        self.tokens_count.get_or_default()
    }

    delegate! {
        to self.ownable {
            fn transfer_ownership(&mut self, new_owner: &Address);
            fn renounce_ownership(&mut self);
            fn get_owner(&self) -> Address;
        }

        to self.cep95 {
            fn name(&self) -> String;
            fn symbol(&self) -> String;
            fn balance_of(&self, owner: Address) -> U256;
            fn owner_of(&self, token_id: U256) -> Option<Address>;
            fn safe_transfer_from(&mut self, from: Address, to: Address, token_id: U256, data: Option<Bytes>);
            fn transfer_from(&mut self, from: Address, to: Address, token_id: U256);
            fn approve(&mut self, spender: Address, token_id: U256);
            fn revoke_approval(&mut self, token_id: U256);
            fn approved_for(&self, token_id: U256) -> Option<Address>;
            fn approve_for_all(&mut self, operator: Address);
            fn revoke_approval_for_all(&mut self, operator: Address);
            fn is_approved_for_all(&self, owner: Address, operator: Address) -> bool;
            fn token_metadata(&self, token_id: U256) -> Vec<(String, String)>;
        }
    }
}

impl NFT {
    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }

    #[inline]
    fn assert_minter(&self) {
        if !self.is_minter(&self.env().caller()) {
            self.env().revert(Error::CallerNotMinter);
        }
    }

    #[inline]
    fn assert_burner(&self) {
        if !self.is_burner(&self.env().caller()) {
            self.env().revert(Error::CallerNotBurner);
        }
    }

    #[inline]
    fn assert_minter_or_burner(&self) {
        if !self.is_minter(&self.env().caller()) && !self.is_burner(&self.env().caller()) {
            self.env().revert(Error::CallerNotMinterNorBurner);
        }
    }

    fn add_minter_internal(&mut self, minter: &Address) {
        self.minters.set(&minter, true);

        self.env()
            .emit_native_event(MinterAdded { minter: *minter });
    }

    fn add_burner_internal(&mut self, burner: &Address) {
        self.burners.set(&burner, true);

        self.env()
            .emit_native_event(BurnerAdded { burner: *burner });
    }
}

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        CallerNotMinter = 62_000,
        CallerNotBurner = 62_001,
        CallerNotMinterNorBurner = 62_002,
    }
}

pub mod events {
    use odra::prelude::*;

    #[odra::event]
    pub struct MinterAdded {
        pub minter: Address,
    }

    #[odra::event]
    pub struct MinterRemoved {
        pub minter: Address,
    }

    #[odra::event]
    pub struct BurnerAdded {
        pub burner: Address,
    }

    #[odra::event]
    pub struct BurnerRemoved {
        pub burner: Address,
    }
}

#[cfg(test)]
mod tests {
    use odra::host::{Deployer, HostEnv};
    use odra_modules::{
        access::errors::Error as AccessError,
        cep95::{Burn, MetadataUpdate, Mint},
    };

    use super::*;

    struct TestData {
        env: HostEnv,
        nft: NFTHostRef,
        minters: Vec<Address>,
        burners: Vec<Address>,
    }

    #[test]
    fn test_init_should_initialize_contract_properly() {
        let test_data = setup(odra_test::env());

        assert_eq!(
            test_data.nft.get_owner(),
            test_data.env.get_account(0),
            "Invalid owner"
        );
        assert_eq!(
            test_data.nft.symbol(),
            String::from("NFT"),
            "Invalid symbol"
        );
        assert_eq!(test_data.nft.name(), String::from("NFT"), "Invalid name");
        assert_eq!(
            test_data.nft.get_tokens_count(),
            U256::zero(),
            "Invalid tokens count"
        );

        for i in 0..test_data.minters.len() {
            assert!(
                test_data.nft.is_minter(&test_data.minters[i]),
                "Should have been set as minter"
            );
            assert!(
                test_data.nft.is_burner(&test_data.burners[i]),
                "Should have been set as burner"
            );
        }
    }

    #[test]
    fn test_add_minter_should_revert_if_not_owner_is_calling() {
        let mut test_data = setup(odra_test::env());

        test_data.env.set_caller(test_data.env.get_account(1));

        assert_eq!(
            test_data
                .nft
                .try_add_minter(&test_data.env.get_account(1))
                .unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_add_minter_should_add_minter_properly() {
        let mut test_data = setup(odra_test::env());
        let minter = test_data.env.get_account(5);

        test_data.nft.add_minter(&minter);

        assert!(test_data
            .env
            .emitted_native_event(&test_data.nft, MinterAdded { minter }));
        assert!(
            test_data.nft.is_minter(&minter),
            "Should have been set as minter"
        )
    }

    #[test]
    fn test_remove_minter_should_revert_if_not_owner_is_calling() {
        let mut test_data = setup(odra_test::env());

        test_data.env.set_caller(test_data.env.get_account(1));

        assert_eq!(
            test_data
                .nft
                .try_remove_minter(&test_data.env.get_account(1))
                .unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_remove_minter_should_remove_minter_properly() {
        let mut test_data = setup(odra_test::env());
        let minter = test_data.env.get_account(5);

        test_data.nft.add_minter(&minter);
        test_data.nft.remove_minter(&minter);

        assert!(test_data
            .env
            .emitted_native_event(&test_data.nft, MinterRemoved { minter }));
        assert!(
            !test_data.nft.is_minter(&minter),
            "Should have been unset as minter"
        )
    }

    #[test]
    fn test_add_burner_should_revert_if_not_owner_is_calling() {
        let mut test_data = setup(odra_test::env());

        test_data.env.set_caller(test_data.env.get_account(1));

        assert_eq!(
            test_data
                .nft
                .try_add_burner(&test_data.env.get_account(1))
                .unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_add_burner_should_add_burner_properly() {
        let mut test_data = setup(odra_test::env());
        let burner = test_data.env.get_account(5);

        test_data.nft.add_burner(&burner);

        assert!(test_data
            .env
            .emitted_native_event(&test_data.nft, BurnerAdded { burner }));
        assert!(
            test_data.nft.is_burner(&burner),
            "Should have been set as burner"
        )
    }

    #[test]
    fn test_remove_burner_should_revert_if_not_owner_is_calling() {
        let mut test_data = setup(odra_test::env());

        test_data.env.set_caller(test_data.env.get_account(1));

        assert_eq!(
            test_data
                .nft
                .try_remove_burner(&test_data.env.get_account(1))
                .unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_remove_burner_should_remove_burner_properly() {
        let mut test_data = setup(odra_test::env());
        let burner = test_data.env.get_account(5);

        test_data.nft.add_burner(&burner);
        test_data.nft.remove_burner(&burner);

        assert!(test_data
            .env
            .emitted_native_event(&test_data.nft, BurnerRemoved { burner }));
        assert!(
            !test_data.nft.is_burner(&burner),
            "Should have been unset as burner"
        )
    }

    #[test]
    fn test_mint_should_fail_if_not_minter_is_calling() {
        let mut test_data = setup(odra_test::env());

        assert_eq!(
            test_data
                .nft
                .try_mint(test_data.env.get_account(1), vec![])
                .unwrap_err(),
            Error::CallerNotMinter.into(),
            "Should revert when is called by not a minter"
        );
    }

    #[test]
    fn test_mint_should_mint_properly() {
        let mut test_data = setup(odra_test::env());
        let recipient = test_data.env.get_account(5);
        let metadata = vec![(
            String::from("description"),
            String::from("Token description"),
        )];
        let token_id = mint(&mut test_data, recipient, metadata.clone());

        assert_eq!(
            test_data.nft.balance_of(recipient),
            U256::one(),
            "Invalid recipient balance"
        );
        assert_eq!(
            test_data.nft.owner_of(token_id),
            Some(recipient),
            "Invalid owner of a token"
        );
        assert_eq!(
            test_data.nft.token_metadata(token_id),
            metadata,
            "Invalid token metadata"
        );
    }

    #[test]
    fn test_burn_should_fail_if_not_burner_is_calling() {
        let mut test_data = setup(odra_test::env());

        assert_eq!(
            test_data.nft.try_burn(U256::zero()).unwrap_err(),
            Error::CallerNotBurner.into(),
            "Should revert when is called by not a burner"
        );
    }

    #[test]
    fn test_burn_should_burn_properly() {
        let mut test_data = setup(odra_test::env());
        let recipient = test_data.env.get_account(5);
        let token_id = mint(
            &mut test_data,
            recipient,
            vec![(
                String::from("description"),
                String::from("Token description"),
            )],
        );

        burn(&mut test_data, token_id);

        assert_eq!(
            test_data.nft.balance_of(recipient),
            U256::zero(),
            "Invalid recipient balance"
        );
        assert_eq!(
            test_data.nft.owner_of(token_id),
            None,
            "Invalid owner of a token"
        );
    }

    #[test]
    fn test_set_metadata_should_fail_if_not_minter_nor_burner_is_calling() {
        let mut test_data = setup(odra_test::env());

        assert_eq!(
            test_data
                .nft
                .try_set_metadata(U256::zero(), vec![])
                .unwrap_err(),
            Error::CallerNotMinterNorBurner.into(),
            "Should revert when is called by not a minter nor a burner"
        );
    }

    #[test]
    fn test_set_metadata_should_set_metadata_properly() {
        let mut test_data = setup(odra_test::env());
        let recipient = test_data.env.get_account(5);
        let token_id = mint(&mut test_data, recipient, vec![]);
        let new_metadata = vec![(
            String::from("description"),
            String::from("Token description (v0.0.2)"),
        )];

        test_data.env.set_caller(test_data.minters[0]);
        test_data.nft.set_metadata(token_id, new_metadata.clone());

        assert!(test_data
            .env
            .emitted_event(&test_data.nft, MetadataUpdate { token_id }));
        assert_eq!(
            test_data.nft.token_metadata(token_id),
            new_metadata,
            "Invalid token metadata"
        );
    }

    #[test]
    fn test_update_metadata_should_fail_if_not_minter_nor_burner_is_calling() {
        let mut test_data = setup(odra_test::env());

        assert_eq!(
            test_data
                .nft
                .try_update_metadata(U256::zero(), vec![])
                .unwrap_err(),
            Error::CallerNotMinterNorBurner.into(),
            "Should revert when is called by not a minter nor a burner"
        );
    }

    #[test]
    fn test_update_metadata_should_update_metadata_properly() {
        let mut test_data = setup(odra_test::env());
        let recipient = test_data.env.get_account(5);
        let mut metadata = vec![(
            String::from("description"),
            String::from("Token description (v0.0.1)"),
        )];
        let mut metadata_update =
            vec![(String::from("website"), String::from("https://website.com"))];

        let token_id = mint(&mut test_data, recipient, metadata.clone());

        test_data.env.set_caller(test_data.minters[0]);
        test_data
            .nft
            .set_metadata(token_id, metadata_update.clone());

        metadata.append(&mut metadata_update);

        assert!(test_data
            .env
            .emitted_event(&test_data.nft, MetadataUpdate { token_id }));
        assert_eq!(
            test_data.nft.token_metadata(token_id),
            metadata_update,
            "Invalid token metadata"
        );
    }

    fn setup(env: HostEnv) -> TestData {
        let minters = vec![env.get_account(10), env.get_account(11)];
        let burners = vec![env.get_account(12), env.get_account(13)];
        let nft = NFT::deploy(
            &env,
            NFTInitArgs {
                owner: env.get_account(0),
                symbol: String::from("NFT"),
                name: String::from("NFT"),
                minters: minters.clone(),
                burners: burners.clone(),
            },
        );

        TestData {
            env,
            nft,
            minters,
            burners,
        }
    }

    fn mint(test_data: &mut TestData, to: Address, metadata: Vec<(String, String)>) -> U256 {
        let expected_token_id = test_data.nft.get_tokens_count();

        test_data.env.set_caller(test_data.minters[0]);
        test_data.nft.mint(to, metadata);

        assert!(test_data.env.emitted_event(
            &test_data.nft,
            Mint {
                to,
                token_id: expected_token_id
            }
        ));
        assert_eq!(
            test_data.nft.get_tokens_count(),
            expected_token_id + 1,
            "Invalid tokens count"
        );

        expected_token_id
    }

    fn burn(test_data: &mut TestData, token_id: U256) {
        let owner = test_data.nft.owner_of(token_id);
        let prev_tokens_count = test_data.nft.get_tokens_count();

        if owner.is_some() {
            test_data.env.set_caller(test_data.burners[0]);
            test_data.nft.burn(token_id);

            assert!(test_data.env.emitted_event(
                &test_data.nft,
                Burn {
                    from: owner.unwrap(),
                    token_id
                }
            ));
            assert_eq!(
                test_data.nft.get_tokens_count(),
                prev_tokens_count,
                "Invalid tokens count"
            );
        }
    }
}
