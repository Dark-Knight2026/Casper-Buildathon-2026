use leasefi_contracts::user_registry::{
    errors::Error,
    events::{ActiveWalletReplaced, UserCreated, UserRoleFlagsSet, UserStatusSet},
    types::{UserStatus, WalletStatus},
    UserRegistry, UserRegistryHostRef, UserRegistryInitArgs, ROLE_FLAG_LANDLORD,
    ROLE_FLAG_PROPERTY_MANAGER, ROLE_FLAG_TENANT,
};
use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv},
    prelude::*,
};

// =============================================================================
// Test Context
// =============================================================================

struct Context {
    env: HostEnv,
    registry: UserRegistryHostRef,
    identity_manager: Address,
    role_manager: Address,
    wallet_1: Address,
    wallet_2: Address,
    wallet_3: Address,
}
