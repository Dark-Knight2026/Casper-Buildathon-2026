pub const ONE_HUNDRED_PERCENT_BPS: u16 = 10_000; // 100.00%

pub const ONE_MONTH_IN_SECONDS: u64 = 30 * 24 * 60 * 60;

pub const ONE_MONTH_IN_MILLISECONDS: u64 = ONE_MONTH_IN_SECONDS * 1_000;

/// Default minimum invoice deadline delay used in Escrow deploy helpers.
pub const MIN_DEADLINE_IN_MS: u64 = 5 * 60 * 1_000;

/// 2% LeaseFi transaction fee
// TODO: Decide whether to make this configurable or not
pub const LEASEFI_TRANSACTION_FEE_BPS: u32 = 200;