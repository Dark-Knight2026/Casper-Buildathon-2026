# ICO API

## GET `/api/v1/ico/balance/{address}`

- **Path:** `address` - Casper account hash (64 hex chars, no prefix)
- **Response:** `IcoBalanceResponse`
- **Auth:** Public
- **Rate limit:** 5 req/s, burst 30

```json
{
  "tokensPurchased": "500000000000000000000",
  "totalSpentUsd": 250.0,
  "tokenPrice": 0.50,
  "tokenSymbol": "BIG",
  "currentValue": 250.0,
  "isActive": true
}
```

## GET `/api/v1/ico/progress`

- **Response:** `IcoProgressResponse`
- **Auth:** Public
- **Rate limit:** 5 req/s, burst 30

```json
{
  "tokensSold": "100000000000000000000000",
  "totalAllocation": "1000000000000000000000000",
  "tokensRemaining": "900000000000000000000000",
  "amountRaised": 50000.0,
  "hardCapUsd": 500000.0,
  "priceUsd": 0.50,
  "percentSold": 10.0,
  "isActive": true
}
```
