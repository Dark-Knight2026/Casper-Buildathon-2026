# ICO Services

This directory contains services for interacting with the ICO smart contract on the Casper blockchain.

## Responsibility Table

| File | Responsibility |
|------|----------------|
| casperClient.ts | Initialize and configure Casper RPC client |
| cep18Service.ts | Handle CEP-18 token operations (approve, balance) |
| contractTypes.ts | Define TypeScript types for contract interactions |
| icoContractService.ts | Interact with ICO smart contract (read schedules) |
| icoPurchaseService.ts | Execute ICO purchase transactions on blockchain |
| index.ts | Export all service modules |
| odraStorage.ts | Manage Odra contract storage schema parsing |
| userProfileService.ts | REST wrapper around `/api/v1/users/me` (GET, PATCH profile fields, email change request/confirm, role switch, avatar upload). Lives here for now to share types with `backendAuthService`; not Casper/ICO-specific. |
