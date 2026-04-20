use crate::nft::{ROLE_FORCE_TRANSFERER, ROLE_FREEZER};
use leasefi_contracts::nft::{errors::*, events::*, NFTHostRef, NFTInitArgs, NFT};
use odra::casper_types::U256;
use odra::host::{Deployer, HostEnv};
use odra::prelude::*;
use odra_modules::{
    access::DEFAULT_ADMIN_ROLE,
    cep95::{Burn, MetadataUpdate, Mint},
};
// =============================================================================
// Test Context
// =============================================================================

struct TestData {
    env: HostEnv,
    nft: NFTHostRef,
    minters: Vec<Address>,
    burners: Vec<Address>,
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
            whitelist_managers: vec![env.get_account(0)],
            freezers: vec![],
            force_transferers: vec![],
        },
    );

    TestData {
        env,
        nft,
        minters,
        burners,
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn mint(test_data: &mut TestData, to: Address, metadata: Vec<(String, String)>) -> U256 {
    let expected_token_id = test_data.nft.get_tokens_count();

    // Whitelist the recipient before minting
    test_data.env.set_caller(test_data.env.get_account(0));
    test_data.nft.add_to_whitelist(&to);

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

// =============================================================================
// init()
// =============================================================================

#[test]
fn test_init_should_initialize_contract_properly() {
    let test_data = setup(odra_test::env());

    assert!(
        test_data
            .nft
            .has_role(&DEFAULT_ADMIN_ROLE, &test_data.env.get_account(0)),
        "Account 0 should have DEFAULT_ADMIN_ROLE"
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

// =============================================================================
// add_minter()
// =============================================================================

#[test]
fn test_add_minter_should_revert_if_not_owner_is_calling() {
    let mut test_data = setup(odra_test::env());

    test_data.env.set_caller(test_data.env.get_account(1));

    assert_eq!(
        test_data
            .nft
            .try_add_minter(&test_data.env.get_account(1))
            .unwrap_err(),
        Error::NotAuthorized.into(),
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
        .emitted_event(&test_data.nft, MinterAdded { minter }));
    assert!(
        test_data.nft.is_minter(&minter),
        "Should have been set as minter"
    )
}

// =============================================================================
// remove_minter()
// =============================================================================

#[test]
fn test_remove_minter_should_revert_if_not_owner_is_calling() {
    let mut test_data = setup(odra_test::env());

    test_data.env.set_caller(test_data.env.get_account(1));

    assert_eq!(
        test_data
            .nft
            .try_remove_minter(&test_data.env.get_account(1))
            .unwrap_err(),
        Error::NotAuthorized.into(),
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
        .emitted_event(&test_data.nft, MinterRemoved { minter }));
    assert!(
        !test_data.nft.is_minter(&minter),
        "Should have been unset as minter"
    )
}

// =============================================================================
// add_burner()
// =============================================================================

#[test]
fn test_add_burner_should_revert_if_not_owner_is_calling() {
    let mut test_data = setup(odra_test::env());

    test_data.env.set_caller(test_data.env.get_account(1));

    assert_eq!(
        test_data
            .nft
            .try_add_burner(&test_data.env.get_account(1))
            .unwrap_err(),
        Error::NotAuthorized.into(),
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
        .emitted_event(&test_data.nft, BurnerAdded { burner }));
    assert!(
        test_data.nft.is_burner(&burner),
        "Should have been set as burner"
    )
}

// =============================================================================
// remove_burner()
// =============================================================================

#[test]
fn test_remove_burner_should_revert_if_not_owner_is_calling() {
    let mut test_data = setup(odra_test::env());

    test_data.env.set_caller(test_data.env.get_account(1));

    assert_eq!(
        test_data
            .nft
            .try_remove_burner(&test_data.env.get_account(1))
            .unwrap_err(),
        Error::NotAuthorized.into(),
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
        .emitted_event(&test_data.nft, BurnerRemoved { burner }));
    assert!(
        !test_data.nft.is_burner(&burner),
        "Should have been unset as burner"
    )
}

// =============================================================================
// mint()
// =============================================================================

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

// =============================================================================
// burn()
// =============================================================================

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

// =============================================================================
// set_metadata()
// =============================================================================

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

// =============================================================================
// update_metadata()
// =============================================================================

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
    let mut metadata_update = vec![(String::from("website"), String::from("https://website.com"))];
    let token_id = mint(&mut test_data, recipient, metadata.clone());

    test_data.env.set_caller(test_data.minters[0]);
    test_data
        .nft
        .update_metadata(token_id, metadata_update.clone());

    metadata.append(&mut metadata_update);

    assert!(test_data
        .env
        .emitted_event(&test_data.nft, MetadataUpdate { token_id }));
    assert_eq!(
        test_data.nft.token_metadata(token_id),
        metadata,
        "Invalid token metadata"
    );
}

// =============================================================================
// add_to_whitelist()
// =============================================================================

#[test]
fn test_add_to_whitelist_should_revert_if_not_whitelist_manager() {
    let mut ctx = setup(odra_test::env());

    ctx.env.set_caller(ctx.env.get_account(1));

    assert_eq!(
        ctx.nft
            .try_add_to_whitelist(&ctx.env.get_account(5))
            .unwrap_err(),
        Error::NotAuthorized.into(),
        "Should revert when caller lacks WHITE_MANAGER role"
    );
}

#[test]
fn test_whitelist_managment_should_work_properly() {
    let mut ctx = setup(odra_test::env());
    let account = ctx.env.get_account(5);

    // Not whitelisted by default
    assert!(!ctx.nft.can_transact(&account));

    // Add to whitelist
    ctx.nft.add_to_whitelist(&account);

    assert!(ctx.nft.can_transact(&account));
    assert!(ctx.env.emitted_event(
        &ctx.nft,
        Whitelisted {
            account,
            status: true,
        }
    ));

    // Remove from whitelist
    ctx.nft.remove_from_whitelist(&account);

    assert!(!ctx.nft.can_transact(&account));
    assert!(ctx.env.emitted_event(
        &ctx.nft,
        Whitelisted {
            account,
            status: false,
        }
    ));
}

// =============================================================================
// transfer()
// =============================================================================

#[test]
fn test_transfer_should_revert_if_not_whitelisted() {
    let mut ctx = setup(odra_test::env());
    let sender = ctx.env.get_account(5);
    let receiver = ctx.env.get_account(6);

    // Mint token to sender (mint helper already whitelists sender)
    let token_id = mint(
        &mut ctx,
        sender,
        vec![(String::from("key"), String::from("value"))],
    );

    // Receiver is NOT whitelisted, transfer should fail
    ctx.env.set_caller(sender);
    assert_eq!(
        ctx.nft
            .try_transfer_from(sender, receiver, token_id)
            .unwrap_err(),
        Error::CannotTransfer.into(),
        "Should revert when receiver is not whitelisted"
    );

    // Whitelist receiver, remove sender, transfer should still fail
    ctx.env.set_caller(ctx.env.get_account(0));
    ctx.nft.add_to_whitelist(&receiver);
    ctx.nft.remove_from_whitelist(&sender);

    ctx.env.set_caller(sender);
    assert_eq!(
        ctx.nft
            .try_transfer_from(sender, receiver, token_id)
            .unwrap_err(),
        Error::CannotTransfer.into(),
        "Should revert when sender is not whitelisted"
    );
}

#[test]
fn test_transfer_should_revert_if_token_frozen() {
    let mut ctx = setup(odra_test::env());
    let sender = ctx.env.get_account(5);
    let receiver = ctx.env.get_account(6);

    // Mint token to sender (mint helper already whitelists sender)
    let token_id = mint(
        &mut ctx,
        sender,
        vec![(String::from("key"), String::from("value"))],
    );

    // Whitelist receiver and grant FREEZER role to admin
    let admin = ctx.env.get_account(0);
    ctx.env.set_caller(admin);
    ctx.nft.add_to_whitelist(&receiver);
    ctx.nft.grant_role(&NFT::hash_role(ROLE_FREEZER), &admin);

    // Freeze the token
    ctx.nft.set_frozen_tokens(&token_id, true);

    ctx.env.set_caller(sender);
    assert_eq!(
        ctx.nft
            .try_transfer_from(sender, receiver, token_id)
            .unwrap_err(),
        Error::CannotTransfer.into(),
        "Should revert when token is frozen"
    );
}

// =============================================================================
// Freeze
// =============================================================================

#[test]
fn test_set_frozen_tokens_should_revert_if_not_freezer() {
    let mut ctx = setup(odra_test::env());
    let sender = ctx.env.get_account(5);
    let token_id = mint(
        &mut ctx,
        sender,
        vec![(String::from("key"), String::from("value"))],
    );

    // Account 1 has no FREEZER role
    ctx.env.set_caller(ctx.env.get_account(1));
    assert_eq!(
        ctx.nft.try_set_frozen_tokens(&token_id, true).unwrap_err(),
        Error::NotAuthorized.into(),
        "Should revert when caller lacks FREEZER role"
    );
}

#[test]
fn test_freeze_and_unfreeze_should_work_properly() {
    let mut ctx = setup(odra_test::env());
    let owner = ctx.env.get_account(5);
    let token_id = mint(
        &mut ctx,
        owner,
        vec![(String::from("key"), String::from("value"))],
    );

    // Grant FREEZER role to admin
    let admin = ctx.env.get_account(0);
    ctx.env.set_caller(admin);
    let freezer_role = NFT::hash_role(ROLE_FREEZER);
    ctx.nft.grant_role(&freezer_role, &admin);

    // Not frozen by default
    assert!(!ctx.nft.get_frozen_tokens(&token_id));

    // Freeze
    ctx.nft.set_frozen_tokens(&token_id, true);

    assert!(ctx.nft.get_frozen_tokens(&token_id));
    assert!(ctx.env.emitted_event(
        &ctx.nft,
        Frozen {
            account: owner,
            token_id,
            frozen_status: true,
        }
    ));

    // Unfreeze
    ctx.nft.set_frozen_tokens(&token_id, false);

    assert!(!ctx.nft.get_frozen_tokens(&token_id));
    assert!(ctx.env.emitted_event(
        &ctx.nft,
        Frozen {
            account: owner,
            token_id,
            frozen_status: false,
        }
    ));
}

// =============================================================================
// forced_transfer()
// =============================================================================

#[test]
fn test_forced_transfer_should_revert_if_not_authorized() {
    let mut ctx = setup(odra_test::env());
    let sender = ctx.env.get_account(5);
    let receiver = ctx.env.get_account(6);
    let token_id = mint(
        &mut ctx,
        sender,
        vec![(String::from("key"), String::from("value"))],
    );

    // Account 1 has no FORCE_TRANSFERER role
    ctx.env.set_caller(ctx.env.get_account(1));
    assert_eq!(
        ctx.nft
            .try_forced_transfer(sender, receiver, token_id)
            .unwrap_err(),
        Error::NotAuthorized.into(),
        "Should revert when caller lacks FORCE_TRANSFERER role"
    );
}

#[test]
fn test_forced_transfer_should_work_properly() {
    let mut ctx = setup(odra_test::env());
    let sender = ctx.env.get_account(5);
    let receiver = ctx.env.get_account(6);
    let token_id = mint(
        &mut ctx,
        sender,
        vec![(String::from("key"), String::from("value"))],
    );

    // Setup: whitelist receiver, grant FREEZER + FORCE_TRANSFERER to admin
    let admin = ctx.env.get_account(0);
    ctx.env.set_caller(admin);
    ctx.nft.add_to_whitelist(&receiver);

    let freezer_role = NFT::hash_role(ROLE_FREEZER);
    let ft_role = NFT::hash_role(ROLE_FORCE_TRANSFERER);
    ctx.nft.grant_role(&freezer_role, &admin);
    ctx.nft.grant_role(&ft_role, &admin);

    // Freeze the token — forced transfer should still work
    ctx.nft.set_frozen_tokens(&token_id, true);
    assert!(ctx.nft.get_frozen_tokens(&token_id));

    // Forced transfer
    ctx.nft.forced_transfer(sender, receiver, token_id);

    assert_eq!(
        ctx.nft.owner_of(token_id),
        Some(receiver),
        "Token should belong to receiver"
    );

    // Token should be unfrozen after forced transfer
    assert!(!ctx.nft.get_frozen_tokens(&token_id));
    assert!(ctx.env.emitted_event(
        &ctx.nft,
        ForcedTransfer {
            from: sender,
            to: receiver,
            token_id,
        }
    ));
}
