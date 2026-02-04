# LEASEFI

## Description

This repository contains a suite of smart contracts built with the `Odra` framework and designed for deployment on the
`Casper Network`. Together, these contracts implement a complete on-chain ecosystem for property leasing, invoice
management and payments, staking with rewards, and treasury management.

Each contract is modular, upgradeable, and interacts with others through well-defined interfaces.

### Core contracts

1. `TailorCoin (BIG)` — `CEP-18` token. A fungible token compliant with the `CEP-18` standard. Used as the primary
   currency within the system for staking, rewards distribution and different treasury operations for incentives.

2. `NFT` — `CEP-95` token. A non-fungible token compliant with the `CEP-95` standard. Represents unique on-chain assets
   such as property ownership certificates, lease-related NFTs, system-specific identity or asset representations.

3. `Roles` - manages role-based access control across the protocol, defines and enforces permissions for actors such as
   landlords, agents, managers, etc. Used by other contracts to restrict sensitive operations.

4. `Treasury` - handles protocol-level funds in `TailorCoin (BIG)` token. Responsibilities include collecting fees,
   distributing them between the `Staking` contract as rewards and the `Treasury` contract itself as reserves for future
   incentives, managing authorized withdrawals of reserves.

5. `Escrow` - manages secure, conditional fund locking. Used primarily for managing rent and invoice payments, releasing
   or refunding funds based on lease conditions, ensures trustless settlement between landlords and tenants.

6. `Lease` - implements the property leasing logic. Key features include creation and lifecycle management of lease
   agreements, validation of lease periods and payment schedules, integration with the `Escrow` contract for invoice
   generation and payments, emission of lease-related events. Acts as the core contract coordinating leasing mechanics.

7. `Staking` - allows users to stake the `TailorCoin (BIG)` token to earn rewards in the `TailorCoin (BIG)` token. This
   contract provides: stake/unstake functionality, rewards calculation and distribution, integration with the `Treasury`
   contract for rewards funding. Designed to incentivize long-term participation in the ecosystem.

8. `ICO` - allows the owner to manage the `TailorCoin (BIG)` token sales in multiple currencies, including CSPR, USDC,
    and USDT. It supports creating multiple ICO schedules with configurable start/end times, sale amounts, and token
    prices. Users can purchase `TailorCoin (BIG)` tokens during active ICO schedules, with payments automatically
    handled. The contract integrates with the Styks Price Feed Oracle to determine token prices in CSPR dynamically.
    Owners can also withdraw unsold tokens from finished ICO schedules and manage supported currencies.

## Build

```bash
cargo odra build
```

## Test

```bash
cargo odra test
```

## Generate schema (ABI)

```bash
cargo odra schema
```

## Deploy

Specify a file with environmental variables to use during deploy via `ODRA_CASPER_LIVENET_ENV` variable.

```bash
ODRA_CASPER_LIVENET_ENV=env/casper-testnet cargo run --bin leasefi_contracts_cli deploy
```

## Use CLI

Specify a file with environmental variables to use during deploy via `ODRA_CASPER_LIVENET_ENV` variable.

```bash
ODRA_CASPER_LIVENET_ENV=env/casper-testnet cargo run --bin leasefi_contracts_cli
```
