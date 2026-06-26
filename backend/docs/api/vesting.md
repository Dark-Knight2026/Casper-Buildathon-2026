# Vesting API

## GET `/api/v1/vesting/schedules?account={accountHash}`

- **Query:** `account` (64 hex chars, no prefix), `page` (default 1), `page_size` (default 25, max 100)
- **Response:** `PaginatedResponse<VestingScheduleItem>` (envelope shape: see [`transactions.md`](transactions.md))
- **Auth:** Public
- **Rate limit:** 5 req/s, burst 30
- **Business rules:** Vesting uses cliff + post-cliff linear formula. Before cliff end (`start + cliff_duration`), `unlockedAmount = 0`. After full vesting (`start + vesting_duration`), `unlockedAmount = total - claimed`. Between: post-cliff linear interpolation `unlockedAmount = total * ((now - cliff_end) / (vesting_duration - cliff_duration)) - claimed`, where `cliff_end = start + cliff_duration`. Linear growth begins at `cliff_end`, not at `start`.

```json
{
  "id": "0",
  "lockedAmount": 800.0,
  "purchaseTimestamp": 1700000000000,
  "unlockTimestamp": 1702592000000,
  "vestingEndTimestamp": 1793548800000,
  "unlockedAmount": 200.0
}
```

- `vestingEndTimestamp` (epoch ms): end of the full vesting period, computed as `start_timestamp + vesting_duration`.

## GET `/api/v1/vesting/token-supply`

- **Response:** `TokenSupplyResponse`
- **Auth:** Public
- **Rate limit:** 5 req/s, burst 30
- **Business rules:** `totalSupply` is fixed at 5,000,000,000 BIG. `circulatingSupply` is the sum of all BIG balances in `token_holdings` excluding addresses registered as contracts in `contract_registry`.

```json
{
  "totalSupply": 5000000000.0,
  "circulatingSupply": 1234567.89
}
```

## GET `/api/v1/vesting/release-schedule`

- **Response:** `ReleaseScheduleResponse`
- **Auth:** Public
- **Rate limit:** 5 req/s, burst 30
- **Business rules:** Aggregates all vesting schedules into a monthly timeline. Each point shows cumulative tokens released across all schedules at that month offset from the earliest schedule start.

```json
{
  "data": [
    { "month": "0", "released": 0.0 },
    { "month": "6", "released": 500.0 },
    { "month": "12", "released": 1000.0 }
  ]
}
```
