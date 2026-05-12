# tests/services

| File | Responsibility |
|------|----------------|
| casperClient.test.ts | Test Casper RPC helpers: hash conversions, hex/byte utils, and CLValue extractors |
| cep18Service.test.ts | Test CEP-18 token queries: balances, allowances, total supply, and metadata |
| contractTypes.test.ts | Test currency enum mapping and contract schema discriminant alignment |
| icoContractService.test.ts | Test ICO contract state readers: schedules, token price, and address lookups |
| icoPurchaseService.test.ts | Test purchase transaction creation and validation |
| odraStorage.test.ts | Test Odra contract storage key derivation |
| proxyCallerService.test.ts | Test proxy caller WASM loading and transaction construction |
| sellerService.test.ts | Test ICO contract seller account queries |
| backendAuthService.test.ts | Tests backend nonce/signature authentication flow |
| vestingClaimService.test.ts | Tests vesting claim transaction building and error parsing |
| userProfileService.test.ts | Tests `/api/v1/users/me` REST wrappers — URLs, snake_case bodies, FormData avatar upload, error propagation |
