// Staking contract error codes (staking_schema.json discriminants 601-614).
// Single source of truth — imported by both vestingClaimService and withdrawUnbondedService.
// In vesting context these errors bubble up through claim(); in withdraw context they are direct.
export const STAKING_ERROR_MAP: Record<string, string> = {
  '601': 'BIG Token contract is not set',
  '602': 'Invalid amount — zero or exceeds staked balance',
  '603': 'Not authorized to unstake',
  '604': 'Nothing staked',
  '605': 'Insufficient staked amount',
  '606': 'Unbonding already in progress',
  '607': 'Vesting contract is not set',
  '608': 'No rewards to claim',
  '609': 'No unbonding in progress',
  '610': 'Unbonding period not finished yet — please wait',
  '611': 'No active stake',
  '612': 'Not authorized to stake',
  '613': 'Unstake blocked by active vesting lock',
  '614': 'Not authorized to manage locks',
};
