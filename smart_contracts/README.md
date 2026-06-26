# LEASEFI

## Description

This repository contains a suite of smart contracts built with the `Odra` framework and designed for deployment on the
`Casper Network`. Together, these contracts implement an on-chain property leasing stack: identity management, lease
lifecycle, invoice payments, and treasury operations.

Each contract is modular, upgradeable, and interacts with others through well-defined interfaces.

ICO, Staking, and Vesting were removed from this branch; see `docs/archived-features/ico-staking-vesting.md` for
restoration instructions. The `master` branch retains the full token-economics stack.

### Core contracts (8)

1. `BigCoin` — `CEP-18` token. A fungible token compliant with the `CEP-18` standard. Used as the primary
   currency for LeaseFi payments and treasury operations.

2. `NFT` — `CEP-95` token. A non-fungible token compliant with the `CEP-95` standard. Represents unique on-chain assets
   such as property ownership certificates, lease-related NFTs, system-specific identity or asset representations.

3. `Roles` - legacy wallet-level role management (landlord, agent, manager). Still deployed for backward compatibility,
   but leasing and property flows now use `UserRegistry` instead.

4. `UserRegistry` - canonical on-chain identity registry for protocol participants. Each user gets a stable `user_id`
   linked to an opaque backend `identity_hash` (no PII), an active wallet, additive capability flags (tenant, landlord,
   property manager), and a lifecycle status (`Active` or `Suspended`). An `IDENTITY_MANAGER` creates users, replaces
   active wallets after off-chain identity checks, and suspends or reactivates accounts. A `USER_ROLE_MANAGER` updates
   capability flags. `Lease`, `Escrow`, and `PropertyRegistry` read this registry to authorize actors and resolve
   user IDs to the current active wallet at execution time.

5. `Treasury` - handles protocol-level funds in `BigCoin` token. Responsibilities include holding protocol fee revenue
   as reserves, accepting BIG deposits via `deposit_rewards` (100% to reserves), and managing authorized withdrawals.

6. `Escrow` - manages secure, conditional fund locking. Used primarily for managing rent and invoice payments, releasing
   or refunding funds based on lease conditions, ensures trustless settlement between landlords and tenants. Invoice
   buyers and sellers are stored as `UserRegistry` user IDs; payments and releases resolve to each user's active wallet
   at call time so wallet rotation does not break in-flight leases.

7. `Lease` - implements the property leasing logic. Key features include creation and lifecycle management of lease
   agreements, validation of lease periods and payment schedules, integration with the `Escrow` contract for invoice
   generation and payments, emission of lease-related events. Lease parties are referenced by `UserRegistry` user IDs;
   landlords, tenants, and property managers must be active users with the matching capability flags and must call from
   their active wallet. Each lease is tied to a `PropertyRegistry` property and validates that the property is active
   and owned by the landlord. Acts as the core contract coordinating leasing mechanics.

8. `PropertyRegistry` - stores on-chain property records. Each property starts in `Draft` status, then a property
   manager sets the property ownership token address before activating it. Property managers are authorized through
   `UserRegistry` (active wallet with the property-manager capability flag). The registry is the source of truth for
   property lifecycle status used by `Lease` when validating new lease agreements.

### User Registration Flow

Leasing and property-management contracts identify participants by stable `UserRegistry` user IDs rather than raw wallet
addresses:

1. An `IDENTITY_MANAGER` creates a user with an opaque `identity_hash`, initial wallet, and starting capability flags
   after off-chain identity checks. The contract stores no personal documents or raw KYC data.
2. A `USER_ROLE_MANAGER` updates additive capability flags when a user should act as tenant, landlord, and/or property
   manager.
3. An `IDENTITY_MANAGER` can replace the active wallet or suspend a user without rewriting lease records — downstream
   contracts resolve the current wallet from `UserRegistry` at execution time.
4. `Lease` and `Escrow` reference user IDs in agreements and invoices; `PropertyRegistry` checks the caller's wallet
   against `UserRegistry` before allowing property-manager actions.

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
| 500-799   | Reserved         | Former ICO / Staking / Vesting blocks     |
| 900-999   | PropertyRegistry | Property records and lifecycle            |
| 1200-1299 | UserRegistry     | User identity, wallets, and role flags    |

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

## CEP-96 Contract Metadata

All 8 LeaseFi contracts expose [CEP-96](https://github.com/casper-network/ceps/blob/master/text/0096-contract-metadata.md) on-chain discoverability. Each contract stores a human-readable `contract_name` and `contract_description` (prefixed with `BIG LeaseFi`) as immutable named keys set during `init()`.

Explorers and indexers can read metadata via the `contract_name` and `contract_description` entry points, or by querying the `contract_name` and `contract_description` named keys on the contract root hash.

Smoke tests live in `tests/contract_metadata.rs`. See `odra.rulebook.md` for the wiring pattern when adding new contracts.

## Use CLI

Specify a file with environmental variables to use during deploy via `ODRA_CASPER_LIVENET_ENV` variable.

```bash
ODRA_CASPER_LIVENET_ENV=env/casper-testnet cargo run --bin leasefi_contracts_cli
```
