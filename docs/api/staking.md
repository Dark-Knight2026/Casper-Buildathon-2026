# Staking API

## GET `/api/v1/staking/{accountHash}`

- **Path:** `accountHash` - 64 hex chars, no prefix
- **Response:** `StakingInfoResponse`
- **Auth:** Public
- **Rate limit:** 5 req/s, burst 30
- **Business rules:** APY = `(rewards_deposited_last_30_days * 365 / 30) / total_staked * 100`. Returns 0 if `total_staked` is zero. `pendingRewards` is computed off-chain: `pending_rewards + (staked * (global_rpt - user_rpt)) / 1e18`. `stakedTokens` is the actual staking position balance - it is `0` when the user has no active stake. `vestingLockedTokens` is reported as a separate field (sum of `total_amount - claimed_amount` across all vesting schedules for the account) so clients can display vesting and staking balances independently.

```json
{
  "stakedTokens": 100000.0,
  "vestingLockedTokens": 25000.0,
  "currentApy": 12.5,
  "totalRewardsEarned": 5000.0,
  "pendingRewards": 1200.0
}
```

## GET `/api/v1/staking/{accountHash}/portfolio`

- **Path:** `accountHash` - 64 hex chars, no prefix
- **Response:** `PortfolioResponse`
- **Auth:** Public
- **Rate limit:** 5 req/s, burst 30
- **Business rules:** `totalBig = bigInWallet + bigStaked + rewardsEarned`. USD value estimated from latest ICO schedule price (6 decimals). `bigStaked` is the actual staking position balance (`0` when no active stake). `vestingLockedTokens` is reported separately and is NOT included in `totalBig` - it represents tokens that are not yet released by vesting.

```json
{
  "bigInWallet": 50000.0,
  "bigStaked": 100000.0,
  "vestingLockedTokens": 25000.0,
  "rewardsEarned": 5000.0,
  "totalBig": 155000.0,
  "estimatedUsdValue": 77500.0,
  "change24hPercent": 0.0
}
```

## GET `/api/v1/staking/{accountHash}/earnings?period={period}`

- **Path:** `accountHash` - 64 hex chars, no prefix
- **Query:** `period` - one of `1m`, `3m`, `6m` (default), `1y`, `all`. Invalid values return 400.
- **Response:** `EarningsResponse`
- **Auth:** Public
- **Rate limit:** 5 req/s, burst 30
- **Business rules:** Groups `reward_claim` events by month within the period window.

```json
{
  "data": [
    { "month": "2026-01", "earnings": 1200.0 },
    { "month": "2026-02", "earnings": 800.0 }
  ]
}
```

## GET `/api/v1/staking/{accountHash}/rewards-history?period={days}`

- **Path:** `accountHash` - 64 hex chars, no prefix
- **Query:** `period` - number of days to look back (default 90, clamped 1-365)
- **Response:** `RewardsHistoryResponse`
- **Auth:** Public
- **Rate limit:** 5 req/s, burst 30
- **Business rules:** Daily cumulative `reward_claim` events. `txFees` is always 0 (contract does not distinguish fee component).

```json
{
  "data": [
    { "day": 1, "stakingPool": 500.0, "txFees": 0.0 },
    { "day": 2, "stakingPool": 750.0, "txFees": 0.0 }
  ]
}
```

## GET `/api/v1/staking/{accountHash}/unbonding`

- **Path:** `accountHash` - 64 hex chars, no prefix
- **Response:** `UnbondingResponse`
- **Auth:** Public
- **Rate limit:** 5 req/s, burst 30
- **Business rules:** Returns the current unbonding state and a chronological history of unstake/withdraw events. `isWithdrawable` is `true` when `unbondingEndsAt > 0 && unbondingEndsAt <= now`. `timeRemainingMs` is the milliseconds until withdraw is possible (0 if already withdrawable or no active unbonding).

```json
{
  "unbondingAmount": 5000.0,
  "unbondingEndsAt": 1719849600000,
  "isWithdrawable": false,
  "timeRemainingMs": 604800000,
  "history": [
    {
      "eventType": "unstake",
      "amount": 5000.0,
      "timestamp": "2026-03-20T12:00:00Z",
      "transactionHash": "abc123..."
    }
  ]
}
```
