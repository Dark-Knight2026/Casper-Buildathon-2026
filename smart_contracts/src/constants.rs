pub const ONE_HUNDRED_PERCENT_BPS: u16 = 10_000; // 100.00%

pub const STAKING_REWARDS_BPS: u16 = 6_000; // 60.00%

pub const INCENTIVES_REWARDS_BPS: u16 = 4_000; // 40.00%

pub const ONE_MONTH_IN_SECONDS: u64 = 30 * 24 * 60 * 60;

pub const STYKS_ORACLE_CSPR_USDT_PRICE_FEED_ID: &str = "CSPRUSD";

pub const ONE_MONTH_IN_MILLISECONDS: u64 = ONE_MONTH_IN_SECONDS * 1_000;

pub const PRIVATE_SALE_CLIFF_DURATION: u64 = 6 * ONE_MONTH_IN_MILLISECONDS;

pub const PRIVATE_SALE_VESTING_DURATION: u64 = 12 * ONE_MONTH_IN_MILLISECONDS;

/// Required waiting period between unstaking and withdrawal
pub const UNBONDING_PERIOD: u64 = 48 * 60 * 60 * 1_000; // 48 hours

/// 2% LeaseFi transaction fee
// TODO: Decide whether to make this configurable or not
pub const LEASEFI_TRANSACTION_FEE_BPS: u32 = 200;

