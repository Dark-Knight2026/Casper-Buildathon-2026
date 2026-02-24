# Blockchain Utilities

Low-level Casper Network blockchain integration: wallet connection, on-chain data streaming, identity resolution, and transaction monitoring.

## Responsibility Table

| File | Responsibility |
|------|----------------|
| accountUtils.ts | Derive account hashes from public key hex strings using casper-js-sdk |
| csprClickService.ts | Wallet integration and transaction signing via CSPR.click SDK |
| csprCloudService.ts | WebSocket streaming and on-chain data queries via CSPR.cloud API |
| csprNameService.ts | Web3 identity resolution and .cspr name registration via CSPR.name contract |
| transactionMonitor.ts | Monitor blockchain transaction status and TTL expiration tracking |
