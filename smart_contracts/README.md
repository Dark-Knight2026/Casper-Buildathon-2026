# LEASEFI

## Description

This repository contains a suite of smart contracts built with the `Odra` framework and designed for deployment on the
`Casper Network`. Together, these contracts implement a complete on-chain ecosystem for property leasing, invoice
management and payments, staking with rewards, treasury management, and tokenized property compliance.

Each contract is modular, upgradeable, and interacts with others through well-defined interfaces.

### Core contracts

1. `BigCoin` — `CEP-18` token. A fungible token compliant with the `CEP-18` standard. Used as the primary
   currency within the system for staking, rewards distribution and different treasury operations for incentives.

2. `NFT` — `CEP-95` token. A non-fungible token compliant with the `CEP-95` standard. Represents unique on-chain assets
   such as property ownership certificates, lease-related NFTs, system-specific identity or asset representations.

3. `Roles` - manages role-based access control across the protocol, defines and enforces permissions for actors such as
   landlords, agents, managers, etc. Used by other contracts to restrict sensitive operations.

4. `Treasury` - handles protocol-level funds in `BigCoin` token. Responsibilities include collecting fees,
   distributing them between the `Staking` contract as rewards and the `Treasury` contract itself as reserves for future
   incentives, managing authorized withdrawals of reserves.

5. `Escrow` - manages secure, conditional fund locking. Used primarily for managing rent and invoice payments, releasing
   or refunding funds based on lease conditions, ensures trustless settlement between landlords and tenants.

6. `Lease` - implements the property leasing logic. Key features include creation and lifecycle management of lease
   agreements, validation of lease periods and payment schedules, integration with the `Escrow` contract for invoice
   generation and payments, emission of lease-related events. Supports optional equity options that grant tenants
   eligibility for property-token distributions, emitting `EquityEligibilityGranted` events. Acts as the core contract
   coordinating leasing mechanics.

7. `Staking` - allows users to stake the `BigCoin` token to earn rewards in the `BigCoin` token. This
   contract provides: stake/unstake functionality, rewards calculation and distribution, integration with the `Treasury`
   contract for rewards funding. Designed to incentivize long-term participation in the ecosystem.

8. `ICO` - allows the owner to manage the `BigCoin` token sales in multiple currencies, including CSPR, USDC,
   and USDT. It supports creating multiple ICO schedules with configurable start/end times, sale amounts, and token
   prices. Users can purchase `BigCoin` tokens during active ICO schedules, with payments automatically
   handled. The contract integrates with the Styks Price Feed Oracle to determine token prices in CSPR dynamically.
   Owners can also withdraw unsold tokens from finished ICO schedules and manage supported currencies.

9. `Vesting` - manages time-based token vesting schedules for `BigCoin` tokens. The features include
   creating vesting schedules with customizable cliff periods and vesting durations, linear vesting calculation,
   whitelisted creator system (typically the ICO contract), per-user schedule tracking, and token claiming by
   beneficiaries. The contract integrates with the Staking contract for auto-staking of vested tokens.

10. `InvestorRegistry` - stores the on-chain eligibility state used by tokenized real estate flows. It does not perform
    KYC and does not store personal data. Off-chain verification providers such as Sumsub are expected to produce a
    final approval result, and an authorized `VERIFICATION_MANAGER` writes only the wallet's verification status,
    expiry, jurisdiction code, and opaque identity hash. A separate `FREEZER` role can freeze or unfreeze investor
    wallets that have already been registered.

11. `PropertyRegistry` - stores tokenized property records. Each property starts in `Draft` status, then a property
    manager sets the property ownership token address and revenue distributor address before activating it. The registry
    is the source of truth for property lifecycle status used by compliance checks.

12. `CompliancePolicy` - provides the minimal on-chain transfer gate for property ownership tokens. It reads
    `InvestorRegistry` to verify sender and recipient wallets, reads `PropertyRegistry` to ensure the property is
    active, and checks whether transfers are enabled for that property. It does not move tokens or hold funds; property
    token contracts call it before executing transfers.

### Tokenized Property Compliance Flow

The tokenization contracts introduced in this PR are intentionally small and composable:

1. A `VERIFICATION_MANAGER` records an investor wallet in `InvestorRegistry` after off-chain KYC/compliance approval.
   The contract stores only eligibility status and an opaque identity hash, never personal documents or raw KYC data.
2. A `PROPERTY_MANAGER` creates a property in `PropertyRegistry`. The property remains in `Draft` status until both the
   property token address and revenue distributor address are set.
3. The `PROPERTY_MANAGER` activates the property. Activation fails unless the token and revenue distributor addresses
   are already configured.
4. A `COMPLIANCE_MANAGER` wires `CompliancePolicy` to the deployed `InvestorRegistry` and `PropertyRegistry` contracts.
5. The `COMPLIANCE_MANAGER` enables transfers for a property by setting its `ComplianceConfig`.
6. A future `PropertyFractionToken` contract calls `CompliancePolicy.assert_can_transfer(property_id, from, to, amount)`
   before moving ownership balances. The transfer is rejected if the property is inactive, transfers are disabled, the
   amount is zero, or either non-exempt party is not currently verified.

Example transfer pre-check:

```rust
compliance_policy.assert_can_transfer(
    property_id,
    sender,
    recipient,
    amount,
);
```

Issuer, escrow, or protocol-controlled addresses can be marked transfer-exempt by `COMPLIANCE_MANAGER` when they need
to distribute tokens but should not represent a verified human investor wallet. Investor recipient wallets should not be
exempt.

## Error Code Conventions

All contracts in this project use custom error codes to provide meaningful feedback when transactions revert. Due to a
limitation in the Odra framework, error codes **must be in the range 0-32767** (i.e., valid `u16` values). Error codes
outside this range will be rejected by the framework and replaced with error code `64536` (`UserErrorTooHigh`).

### Odra Framework Limitation

This constraint is defined in the `odra-core` crate in the `ExecutionError` enum:

```rust
// File: odra/core/src/error.rs (in the Odra framework source)

/// An error that can occur during smart contract execution
///
/// It is represented by an error code and a human-readable message.
///
/// Errors codes 0..32767 are available for the user to define custom error
/// in smart contracts.
/// 32768 code is a special code representing a violation of the custom error code space.
///
/// The rest of codes 32769..[u16::MAX](u16::MAX), are used internally by the framework.
#[repr(u16)]
#[derive(Clone, Debug, PartialEq)]
pub enum ExecutionError {
    // ... other error variants ...
    /// Maximum code for user errors
    MaxUserError = 64535,
    /// User error too high. The code should be in range 0..32767.
    UserErrorTooHigh = 64536,
    /// User error
    User(u16),
}
```

When a contract attempts to revert with an error code >= 32768, the Odra framework intercepts it and returns
`UserErrorTooHigh (64536)` instead. Always make sure your error codes are within the valid
range.

### Error Code Allocation Strategy

Error codes are allocated in blocks of 100 per contract:

| Range     | Contract         | Purpose                                   |
| --------- | ---------------- | ----------------------------------------- |
| 0-99      | Reserved         | Used for any Protocol-wide errors         |
| 100-199   | NFT              | CEP-95 token operations                   |
| 200-299   | Treasury         | Reserve management and token withdrawals  |
| 300-399   | Escrow           | Invoice creation and payment handling     |
| 400-499   | Lease            | Lease agreement lifecycle management      |
| 500-599   | ICO              | Token sale schedules and purchases        |
| 600-699   | Staking          | Staking, unstaking, and rewards           |
| 700-799   | Vesting          | Vesting schedule creation and claims      |
| 800-899   | InvestorRegistry | Investor verification and freeze state    |
| 900-999   | PropertyRegistry | Tokenized property records and lifecycle  |
| 1000-1099 | CompliancePolicy | Property token transfer compliance checks |

When adding new contracts or error codes, use the next available block of 100 codes and follow the existing naming
conventions.

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
