# Transaction History API

## GET `/api/v1/transactions/account/{address}`

- **Path:** `address` - Casper account hash (64 hex chars, no prefix)
- **Query:** `page` (default 1), `page_size` (default 25, max 100), `type` (optional filter: `token_purchase`, `token_transfer`, `token_mint`, `token_allowance`), `from_type` (optional filter: `0` = Account, `1` = Contract)
- **Response:** `PaginatedResponse<TransactionResponse>` `{ "itemCount": 42, "pageCount": 2, "data": [...] }`
- **Auth:** Public (no JWT required)
- **Rate limit:** 5 req/s, burst 30

## GET `/api/v1/transactions/token/big`

- **Query:** `page` (default 1), `page_size` (default 25, max 100)
- **Response:** `PaginatedResponse<TransactionResponse>`
- **Auth:** Public
- **Rate limit:** 5 req/s, burst 30

## TransactionResponse schema

```json
{
  "deploy_hash": "abc123...",
  "block_height": 12345,  // null if unconfirmed
  "timestamp": "2025-06-15T10:30:00Z",
  "amount": "1000000000000000000",
  "currency": "CSPR",
  "contract_package_hash": "def456...",
  "from_hash": "aaa...",
  "from_type": 0,
  "to_hash": "bbb...",
  "to_type": 0,
  "ft_action_type_id": 2,
  "transform_idx": 0
}
```

> **`amount` semantics for `token_purchase` rows:** `amount` contains the
> payment cost in the purchase currency (CSPR or USDC), not the quantity of
> BIG tokens received. The BIG token amount is stored in `ico_purchases.amount`
> and can be found in the transaction `metadata` JSON.

## PaginatedResponse schema

Shared envelope used by paginated list endpoints across `transactions`, `vesting`, and other resources.

```json
{
  "itemCount": 100,
  "pageCount": 4,
  "data": [ "...items..." ]
}
```
