pub const ONE_HUNDRED_PERCENT_BPS: u16 = 10_000; // 100.00%

pub const STAKING_REWARDS_BPS: u16 = 6_000; // 60.00%

pub const INCENTIVES_REWARDS_BPS: u16 = 4_000; // 40.00%

pub const ONE_MONTH_IN_SECONDS: u64 = 30 * 24 * 60 * 60;

pub const STYKS_ORACLE_CSPR_USDT_PRICE_FEED_ID: &str = "CSPRUSD";

/// Styks encodes USD prices with 5 fractional digits (amount × 100_000).
/// See `styks-make-parser` (`amount * 100_000` integer conversion).
pub const STYKS_ORACLE_PRICE_SCALE: u64 = 100_000;

/// Lower bound for a plausible CSPR/USD quote on the Styks scale (~$0.001).
pub const STYKS_ORACLE_MIN_CSPR_USD_PRICE: u64 = 100;

/// Upper bound for a plausible CSPR/USD quote on the Styks scale (~$0.50).
pub const STYKS_ORACLE_MAX_CSPR_USD_PRICE: u64 = 50_000;

pub const ONE_MONTH_IN_MILLISECONDS: u64 = ONE_MONTH_IN_SECONDS * 1_000;

/// Default minimum invoice deadline delay used in Escrow deploy helpers.
pub const MIN_DEADLINE_IN_MS: u64 = 5 * 60 * 1_000;

pub const PRIVATE_SALE_CLIFF_DURATION: u64 = 6 * ONE_MONTH_IN_MILLISECONDS;

pub const PRIVATE_SALE_VESTING_DURATION: u64 = 12 * ONE_MONTH_IN_MILLISECONDS;

/// Required waiting period between unstaking and withdrawal
pub const UNBONDING_PERIOD: u64 = 48 * 60 * 60 * 1_000; // 48 hours

/// Minimum time a staker must remain staked before claiming accrued rewards.
/// Matches [`UNBONDING_PERIOD`] to discourage just-in-time stake/claim/unstake sniping.
pub const REWARD_CLAIM_HOLD_PERIOD: u64 = UNBONDING_PERIOD;

/// 2% LeaseFi transaction fee
// TODO: Decide whether to make this configurable or not
pub const LEASEFI_TRANSACTION_FEE_BPS: u32 = 200;

