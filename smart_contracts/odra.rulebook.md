---
lifecycle: active
version: "1.0"
priority: 1
---

# odra

## Rationale

This document provides a comprehensive set of standards and conventions for developing smart contracts using the Odra framework on the Casper Network. Given the critical nature of smart contracts—handling financial assets, token transfers, and on-chain state—a strict and detailed rulebook is essential for ensuring correctness, security, long-term maintainability, and consistency across the development team.

## Scope

This rulebook governs all Odra 2.5.0 smart contract code within the `src/` directory of this crate. It applies to:

- All `.rs` files that use Odra macros (`#[odra::module]`, `#[odra::event]`, `#[odra::odra_error]`, `#[odra::odra_type]`, `#[odra::external_contract]`).
- All Rust code snippets within Markdown documentation files that demonstrate Odra patterns.
- All test files that interact with Odra contracts via `odra_test::env()`.
- All deployment and CLI binary scripts in the `bin/` directory.

### Governing Principles

This project uses Odra 2.5.0 as the smart contract framework targeting the Casper Network. Odra abstracts blockchain-specific details, letting developers focus on contract logic using familiar Rust patterns. All rules in this document are mandatory.

### Structure

Most rules in this document follow a consistent structure for clarity:

- **Description:** A detailed explanation of the rule's requirements.
- **Rationale:** An explanation of why the rule exists and the benefits of following it.
- **Examples:** `✅ Good` and `❌ Bad` examples illustrating correct and incorrect application of the rule.

### Vocabulary

- **Module:** An Odra smart contract unit, annotated with `#[odra::module]`. A module defines storage layout and entry points.
- **Entry Point:** A `pub` function inside an `#[odra::module] impl` block. Entry points are callable from outside the contract.
- **SubModule:** A child module embedded within a parent module via `SubModule<T>`, providing composition over inheritance.
- **HostRef:** A generated test handle (`{ModuleName}HostRef`) used to interact with a deployed contract in tests.
- **ContractRef:** A generated reference (`{ModuleName}ContractRef`) used for cross-contract calls.
- **OdraVM:** The fast, in-memory mock VM used for rapid testing and debugging.
- **CasperVM:** The full Casper virtual machine backend, compiling contracts to WASM for realistic testing.

### Quick Reference Summary

| Group                     | Rule                                                                                                    | Description                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Project Structure**     | [Odra.toml Contract Registration](#project-structure--odratoml-contract-registration)                   | Every deployable contract must be registered in `Odra.toml` with its fully qualified name.                             |
|                           | [Cargo.toml Dependency Setup](#project-structure--cargotoml-dependency-setup)                           | Odra dependencies must use matching versions with `default-features = false`.                                          |
|                           | [Binary Entry Points](#project-structure--binary-entry-points)                                          | Projects must include `build_contract`, `build_schema`, and `cli` binary targets.                                      |
|                           | [Crate Entry Point Configuration](#project-structure--crate-entry-point-configuration)                  | `lib.rs` must declare `no_std` and `no_main` for non-test builds and import the global allocator.                      |
| **Module Definition**     | [Module Struct Annotation](#module-definition--module-struct-annotation)                                | All contract structs must use `#[odra::module]` with explicit `events` and `errors` registration.                      |
|                           | [Module Impl Annotation](#module-definition--module-impl-annotation)                                    | All contract implementation blocks exposing entry points must use `#[odra::module]`.                                   |
|                           | [Constructor Pattern](#module-definition--constructor-pattern)                                          | Use `init` as the constructor function name. It is called once on deployment.                                          |
|                           | [Entry Point Visibility](#module-definition--entry-point-visibility)                                    | Only `pub` functions in `#[odra::module] impl` blocks become external entry points.                                    |
|                           | [Mutability Convention](#module-definition--mutability-convention)                                      | Use `&self` for read-only entry points and `&mut self` for state-modifying entry points.                               |
| **Storage**               | [Use Appropriate Storage Types](#storage--use-appropriate-storage-types)                                | Choose the correct storage primitive (`Var`, `Mapping`, `List`, `Sequence`) for each use case.                         |
|                           | [Avoid Complex Types in Var](#storage--avoid-complex-types-in-var)                                      | Do not store `Vec`, `HashMap`, or other collection types inside `Var<T>`. Use `Mapping` or `List` instead.             |
|                           | [Mapping Compound Keys](#storage--mapping-compound-keys)                                                | Use tuples for compound keys in `Mapping` (e.g., `Mapping<(Address, Address), U256>`).                                 |
|                           | [Mapping with Module Values](#storage--mapping-with-module-values)                                      | Use `.module()` instead of `.get()` when the value type of a `Mapping` is an Odra module.                              |
|                           | [Custom Storage Types](#storage--custom-storage-types)                                                  | All custom types stored on-chain must be annotated with `#[odra::odra_type]`.                                          |
|                           | [Default Value Access](#storage--default-value-access)                                                  | Prefer `get_or_default()` or `get_or_revert_with(error)` over raw `get()` to avoid `Option` handling at call sites.    |
| **Events**                | [Event Definition](#events--event-definition)                                                           | All events must use the `#[odra::event]` attribute and have `pub` fields.                                              |
|                           | [Event Registration](#events--event-registration)                                                       | All events emitted by a module must be registered in the `#[odra::module(events = [...])]` attribute.                  |
|                           | [Event Emission](#events--event-emission)                                                               | Emit events via `self.env().emit_event()` for every state-changing operation that external observers need to track.    |
| **Error Handling**        | [Error Definition](#error-handling--error-definition)                                                   | All errors must use `#[odra::odra_error]` with explicit, unique numeric discriminants.                                 |
|                           | [Error Registration](#error-handling--error-registration)                                               | All errors must be registered in the `#[odra::module(errors = ErrorEnum)]` attribute.                                  |
|                           | [Revert Pattern](#error-handling--revert-pattern)                                                       | Use `self.env().revert(Error::Variant)` or `.get_or_revert_with()` for error handling. Never use `panic!` or `unwrap`. |
|                           | [Unique Error Discriminants](#error-handling--unique-error-discriminants)                               | Error discriminants must be unique across the entire project, not just within a single enum.                           |
| **Module Composition**    | [SubModule for Composition](#module-composition--submodule-for-composition)                             | Use `SubModule<T>` to compose modules. Never attempt inheritance patterns.                                             |
|                           | [Delegate Macro for Forwarding](#module-composition--delegate-macro-for-forwarding)                     | Use the `delegate!` macro to forward entry points to child submodules and reduce boilerplate.                          |
|                           | [External for Cross-Contract Calls](#module-composition--external-for-cross-contract-calls)             | Use `External<ContractRef>` for cross-contract calls to known Odra contracts.                                          |
|                           | [External Contract Trait for Third-Party](#module-composition--external-contract-trait-for-third-party) | Use `#[odra::external_contract]` trait definitions for interacting with non-Odra or third-party contracts.             |
| **Security**              | [Payable Annotation](#security--payable-annotation)                                                     | Only functions annotated with `#[odra(payable)]` may receive native tokens. Never use on constructors.                 |
|                           | [Reentrancy Guard](#security--reentrancy-guard)                                                         | Use `#[odra(non_reentrant)]` on all functions that perform external calls or token transfers.                          |
|                           | [Checks-Effects-Interactions](#security--checks-effects-interactions)                                   | Validate inputs first, update internal state second, make external calls last.                                         |
|                           | [Arithmetic Safety](#security--arithmetic-safety)                                                       | Use checked or saturating arithmetic for all financial calculations involving token amounts.                           |
|                           | [Timestamp Handling](#security--timestamp-handling)                                                     | `get_block_time()` returns milliseconds. Account for validator manipulation tolerance in deadline windows.             |
|                           | [Access Control](#security--access-control)                                                             | Guard privileged operations with ownership or role checks at the start of the function body.                           |
|                           | [Address Handling](#security--address-handling)                                                         | Use `Option<Address>` instead of a zero/default address. Odra `Address` has no default value.                          |
| **Testing**               | [Test Environment Setup](#testing--test-environment-setup)                                              | Use `odra_test::env()` to create the test environment and `Module::deploy()` for contract instantiation.               |
|                           | [Test Both Backends](#testing--test-both-backends)                                                      | Run tests against both OdraVM and CasperVM before considering a feature complete.                                      |
|                           | [Error Assertions](#testing--error-assertions)                                                          | Use auto-generated `try_` method variants to assert expected reverts.                                                  |
|                           | [Event Assertions](#testing--event-assertions)                                                          | Always assert that expected events were emitted after state-changing operations.                                       |
|                           | [Token Transfer Testing](#testing--token-transfer-testing)                                              | Use `.with_tokens()` to attach native tokens in tests and `balance_of()` to verify balances.                           |
| **Deployment & Upgrades** | [Gas Configuration](#deployment--upgrades--gas-configuration)                                           | Always set explicit gas values before deployments and contract calls on livenet.                                       |
|                           | [Upgradable Contracts](#deployment--upgrades--upgradable-contracts)                                     | Use `InstallConfig::upgradable()` for contracts that need future upgrades and provide `upgrade` migration functions.   |

### Project Structure : Odra.toml Contract Registration

**Description:** Every deployable contract must be registered in the `Odra.toml` file at the project root. Each entry must specify the fully qualified name (`fqn`) of the module using Rust's module path syntax. The last segment of `fqn` determines the WASM filename.

**Rationale:**

- **Build System Integration:** `cargo odra build` and `cargo odra schema` rely on `Odra.toml` to discover which modules to compile into WASM binaries and generate schemas for.
- **Explicit Declaration:** Prevents accidental omission of contracts from the build output.
- **Naming Convention:** Ensures predictable WASM filenames that map directly to module names.

> ❌ **Bad** (Contract module exists in source but is not registered)

```toml
# Odra.toml — missing the Staking contract
[[contracts]]
fqn = "big_coin::BigCoin"

[[contracts]]
fqn = "escrow::Escrow"

# Staking module exists in src/staking.rs but is not listed here
```

> ✅ **Good** (All deployable contracts are registered)

```toml
[[contracts]]
fqn = "big_coin::BigCoin"

[[contracts]]
fqn = "escrow::Escrow"

[[contracts]]
fqn = "staking::Staking"
```

### Project Structure : Cargo.toml Dependency Setup

**Description:** The `Cargo.toml` must include `odra`, `odra-modules` (if using reusable modules), `odra-test` (dev-dependency), `odra-build` (build-dependency), and `odra-cli` (non-WASM dependency). All Odra crates **must** use the same version. All Odra dependencies **must** specify `default-features = false`.

**Rationale:**

- **Version Consistency:** Mismatched Odra crate versions cause compilation errors and subtle runtime bugs.
- **Minimal Footprint:** `default-features = false` ensures only required features are compiled, reducing WASM binary size.

> ❌ **Bad** (Mismatched versions and missing `default-features = false`)

```toml
[dependencies]
odra = { version = "2.5.0" }
odra-modules = { version = "2.4.0" }  # Version mismatch!

[dev-dependencies]
odra-test = { version = "2.5.0" }     # Missing default-features = false
```

> ✅ **Good** (Consistent versions and explicit default-features)

```toml
[dependencies]
odra = { version = "2.5.0", features = [], default-features = false }
odra-modules = { version = "2.5.0", features = [], default-features = false }

[dev-dependencies]
odra-test = { version = "2.5.0", features = [], default-features = false }

[build-dependencies]
odra-build = { version = "2.5.0", features = [], default-features = false }

[target.'cfg(not(target_arch = "wasm32"))'.dependencies]
odra-build = { version = "2.5.0", features = [], default-features = false }
odra-cli = { version = "2.5.0", features = [], default-features = false }
```

### Project Structure : Binary Entry Points

**Description:** Every Odra project must include three binary targets: `build_contract` (compiles WASM), `build_schema` (generates JSON schemas), and `cli` (livenet interaction). These must be located in the `bin/` directory and excluded from test compilation with `test = false`.

**Rationale:**

- **Build Pipeline:** The Odra toolchain requires these binaries to function correctly.
- **Test Isolation:** Setting `test = false` prevents binary entry points from interfering with `cargo test`.

> ❌ **Bad** (Missing binary targets or missing `test = false`)

```toml
[[bin]]
name = "leasefi_contracts_build_contract"
path = "bin/build_contract.rs"
# Missing test = false — binary will be compiled during cargo test
```

> ✅ **Good** (All three binary targets defined)

```toml
[[bin]]
name = "leasefi_contracts_build_contract"
path = "bin/build_contract.rs"
test = false

[[bin]]
name = "leasefi_contracts_build_schema"
path = "bin/build_schema.rs"
test = false

[[bin]]
name = "leasefi_contracts_cli"
path = "bin/cli.rs"
test = false
```

### Project Structure : Crate Entry Point Configuration

**Description:** The crate's `lib.rs` must declare `#![cfg_attr(not(test), no_std)]` and `#![cfg_attr(not(test), no_main)]` to ensure the contract compiles to a freestanding WASM binary. It must also import the global allocator via `extern crate alloc;`.

**Rationale:**

- **WASM Compatibility:** Smart contracts run in a `no_std` environment without a standard library runtime. The `no_main` attribute prevents the compiler from expecting a `main` function.
- **Test Usability:** The `cfg_attr(not(test), ...)` guard allows the standard library during testing, enabling `println!`, `assert!`, and other test utilities.
- **Memory Allocation:** `extern crate alloc` provides heap allocation (`Vec`, `String`, `Box`) in `no_std` contexts via Odra's custom allocator.

> ❌ **Bad** (Missing no_std/no_main or unconditional no_std)

```rust
// Missing no_std — will fail to compile to WASM
pub mod my_contract;
```

```rust
// Unconditional no_std — tests will not work
#![no_std]
#![no_main]
extern crate alloc;

pub mod my_contract;
```

> ✅ **Good** (Correct conditional configuration)

```rust
#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]
extern crate alloc;

pub mod my_contract;
```

### Module Definition : Module Struct Annotation

**Description:** All contract structs must be annotated with `#[odra::module]`. When the module emits events or defines errors, these must be explicitly registered using the `events` and `errors` parameters of the attribute. The struct's fields define the on-chain storage layout.

**Rationale:**

- **Code Generation:** The `#[odra::module]` macro generates the `Deployer` trait implementation, storage key allocation, and host/contract reference types.
- **Event Schema:** Registering events in the attribute ensures they appear in the generated contract schema, which is critical for off-chain tools and indexers.
- **Error Schema:** Registering errors ensures they are included in the schema and can be decoded by external tooling.

> ❌ **Bad** (Events and errors not registered)

```rust
#[odra::module]
pub struct MyToken {
  total_supply: Var<U256>,
  balances: Mapping<Address, U256>,
}
```

> ✅ **Good** (Events and errors explicitly registered)

```rust
#[odra::module(events = [Transfer, Approval], errors = Error)]
pub struct MyToken {
  total_supply: Var<U256>,
  balances: Mapping<Address, U256>,
  allowances: Mapping<(Address, Address), U256>,
}
```

### Module Definition : Module Impl Annotation

**Description:** The implementation block that exposes external entry points must be annotated with `#[odra::module]`. Internal helper methods should be placed in a separate, unannotated `impl` block to avoid accidental exposure as entry points.

**Rationale:**

- **Explicit API Surface:** Only `pub` functions in `#[odra::module] impl` blocks become callable entry points. Placing helpers in a separate `impl` block prevents them from being exposed.
- **Security:** Accidentally exposing internal logic as an entry point can create security vulnerabilities.

> ❌ **Bad** (Helpers mixed with entry points in the same annotated block)

```rust
#[odra::module]
impl MyToken {
  pub fn transfer(&mut self, to: Address, amount: U256) {
    self.internal_transfer(self.env().caller(), to, amount);
  }

  // This becomes an external entry point — unintended!
  pub fn internal_transfer(
    &mut self,
    from: Address,
    to: Address,
    amount: U256,
  ) {
    // ...
  }
}
```

> ✅ **Good** (Entry points and helpers in separate blocks)

```rust
#[odra::module]
impl MyToken {
  pub fn transfer(&mut self, to: Address, amount: U256) {
    self.internal_transfer(self.env().caller(), to, amount);
  }
}

impl MyToken {
  fn internal_transfer(
    &mut self,
    from: Address,
    to: Address,
    amount: U256,
  ) {
    // ...
  }
}
```

### Module Definition : Constructor Pattern

**Description:** The constructor function must be named `init`. It takes `&mut self` as its receiver and any initialization parameters. The `init` function is called exactly once during deployment; subsequent calls automatically revert. Constructors **must not** be annotated with `#[odra(payable)]`.

**Rationale:**

- **Odra Convention:** The framework recognizes `init` as the constructor by name. Using a different name means the function will be treated as a regular entry point.
- **Single Initialization:** Odra enforces that `init` can only be called once, preventing re-initialization attacks.

> ❌ **Bad** (Non-standard constructor name)

```rust
#[odra::module]
impl MyToken {
  pub fn constructor(&mut self, name: String, symbol: String) {
    // This is NOT treated as a constructor by Odra
    self.name.set(name);
    self.symbol.set(symbol);
  }
}
```

> ❌ **Bad** (Payable constructor)

```rust
#[odra::module]
impl MyToken {
  #[odra(payable)] // FORBIDDEN on constructors
  pub fn init(&mut self, name: String) {
    self.name.set(name);
  }
}
```

> ✅ **Good** (Standard init constructor)

```rust
#[odra::module]
impl MyToken {
  pub fn init(&mut self, name: String, symbol: String, decimals: u8) {
    self.name.set(name);
    self.symbol.set(symbol);
    self.decimals.set(decimals);
  }
}
```

### Module Definition : Entry Point Visibility

**Description:** Only `pub` functions inside an `#[odra::module] impl` block are exposed as external entry points. Functions that should only be callable internally (by submodules or within the same contract) must either omit `pub` or be placed in a separate, unannotated `impl` block.

**Rationale:**

- **Minimal Attack Surface:** Every external entry point is a potential attack vector. Exposing only what is necessary reduces the contract's attack surface.
- **Clear API:** The set of `pub` functions in the `#[odra::module] impl` block constitutes the contract's public API. This boundary must be intentional.

> ❌ **Bad** (Internal helper exposed as entry point)

```rust
#[odra::module]
impl Escrow {
  pub fn release(&mut self, id: u32) {
    self.validate_release(id);
    self.do_release(id);
  }

  // Exposed as entry point — anyone can call this directly!
  pub fn do_release(&mut self, id: u32) {
    self.env().transfer_tokens(
      &self.recipient(id),
      &self.amount(id),
    );
  }
}
```

> ✅ **Good** (Helper is private)

```rust
#[odra::module]
impl Escrow {
  pub fn release(&mut self, id: u32) {
    self.validate_release(id);
    self.do_release(id);
  }
}

impl Escrow {
  fn do_release(&mut self, id: u32) {
    self.env().transfer_tokens(
      &self.recipient(id),
      &self.amount(id),
    );
  }
}
```

### Module Definition : Mutability Convention

**Description:** Entry points that only read state must take `&self`. Entry points that modify state must take `&mut self`. This distinction replaces Solidity's `view`/`pure` modifiers.

**Rationale:**

- **Semantic Clarity:** The Rust borrow checker enforces at compile time that `&self` methods cannot modify storage, providing a static guarantee.
- **Caller Expectations:** External callers can identify read-only operations by their signature.

> ❌ **Bad** (Mutable receiver for a read-only function)

```rust
#[odra::module]
impl MyToken {
  pub fn balance_of(&mut self, owner: Address) -> U256 {
    self.balances.get_or_default(&owner)
  }
}
```

> ✅ **Good** (Immutable receiver for read-only, mutable for writes)

```rust
#[odra::module]
impl MyToken {
  pub fn balance_of(&self, owner: Address) -> U256 {
    self.balances.get_or_default(&owner)
  }

  pub fn transfer(&mut self, to: Address, amount: U256) {
    // modifies state
  }
}
```

### Storage : Use Appropriate Storage Types

**Description:** Odra provides four primary storage primitives. Each has specific characteristics and trade-offs. Choosing the correct type is critical for gas efficiency and correctness.

| Type            | Use Case                                 | Iteration | Key-Value |
| --------------- | ---------------------------------------- | --------- | --------- |
| `Var<T>`        | Single values (counters, names, flags)   | N/A       | No        |
| `Mapping<K, V>` | Key-value lookups (balances, allowances) | **No**    | Yes       |
| `List<T>`       | Ordered, iterable collections            | **Yes**   | No        |
| `Sequence<T>`   | Auto-incrementing counters (IDs)         | N/A       | No        |

**Rationale:**

- **Gas Efficiency:** `Mapping` stores each entry independently, so reading one entry does not load all entries. `Var<Vec<T>>` would load the entire vector on every access.
- **Correctness:** `Mapping` does not support iteration. If you need to iterate over entries, use `List<T>`.
- **Simplicity:** `Sequence<T>` provides a purpose-built auto-increment pattern without manual counter management.

> ❌ **Bad** (Using Var for a collection)

```rust
#[odra::module]
pub struct Registry {
  // Loads the entire Vec on every read/write — gas explosion
  users: Var<Vec<Address>>,
}
```

> ✅ **Good** (Using List for iterable collection)

```rust
#[odra::module]
pub struct Registry {
  users: List<Address>,
}
```

> ✅ **Good** (Using Sequence for auto-increment IDs)

```rust
#[odra::module]
pub struct Ledger {
  next_id: Sequence<u32>,
  entries: Mapping<u32, LedgerEntry>,
}
```

### Storage : Avoid Complex Types in Var

**Description:** Do not store collection types (`Vec`, `HashMap`, `BTreeMap`) inside `Var<T>`. Every call to `get()` deserializes the entire collection, and every call to `set()` serializes and writes it back. Use `Mapping<K, V>` for key-value data and `List<T>` for ordered collections.

**Rationale:**

- **Gas Cost:** Serializing and deserializing a growing collection on every operation leads to unbounded gas costs.
- **State Bloat:** A single storage slot holding a large collection will eventually hit serialization limits.

> ❌ **Bad** (HashMap in Var)

```rust
#[odra::module]
pub struct Allowances {
  // Every read/write serializes the ENTIRE map
  data: Var<HashMap<Address, U256>>,
}
```

> ✅ **Good** (Mapping for key-value data)

```rust
#[odra::module]
pub struct Allowances {
  data: Mapping<Address, U256>,
}
```

### Storage : Mapping Compound Keys

**Description:** When a `Mapping` requires a multi-part key, use a tuple type for the key parameter. Tuples of up to reasonable arity are supported (e.g., `(Address, Address)`, `(Address, u32)`).

**Rationale:**

- **Built-in Support:** Odra natively supports tuple keys in `Mapping` without any additional serialization logic.
- **Readability:** Tuple keys clearly express the multi-dimensional nature of the lookup.

> ❌ **Bad** (Encoding compound key manually)

```rust
#[odra::module]
pub struct Allowances {
  // Manual key encoding — error-prone and unreadable
  data: Mapping<String, U256>,
}

impl Allowances {
  fn allowance_key(
    owner: &Address,
    spender: &Address,
  ) -> String {
    format!("{}-{}", owner, spender)
  }
}
```

> ✅ **Good** (Tuple compound key)

```rust
#[odra::module]
pub struct Allowances {
  data: Mapping<(Address, Address), U256>,
}

impl Allowances {
  fn get_allowance(
    &self,
    owner: &Address,
    spender: &Address,
  ) -> U256 {
    self.data.get_or_default(&(*owner, *spender))
  }
}
```

### Storage : Mapping with Module Values

**Description:** When a `Mapping`'s value type is an Odra module (annotated with `#[odra::module]`), you **must** use `.module(&key)` to access the value, not `.get(&key)`. The `.module()` method returns the SubModule instance with its storage properly scoped to the key.

**Rationale:**

- **Storage Isolation:** `.module()` ensures the child module's storage keys are properly namespaced under the mapping key, preventing storage collisions.
- **Correctness:** `.get()` would attempt to deserialize the module as a plain value, which is incorrect for module types.

> ❌ **Bad** (Using `.get()` for a module-valued Mapping)

```rust
// WRONG — modules are not plain values
let token = self.tokens.get(&token_name);
```

> ✅ **Good** (Using `.module()` for a module-valued Mapping)

```rust
let token = self.tokens.module(&token_name);
let supply = token.total_supply();
```

### Storage : Custom Storage Types

**Description:** All custom structs and enums that are stored on-chain (as values in `Var`, `Mapping`, or `List`) must be annotated with `#[odra::odra_type]`. This derives the necessary serialization and deserialization traits for Casper's CLType system.

**Rationale:**

- **Serialization:** The Casper Network uses CLType-based serialization. `#[odra::odra_type]` generates the required `CLTyped` and `FromBytes`/`ToBytes` implementations.
- **Compile-Time Safety:** Without the annotation, the compiler will reject attempts to store the type, catching errors early.

> ❌ **Bad** (Missing annotation)

```rust
// This will not compile when used in Var<Dog> or Mapping<_, Dog>
#[derive(Debug, Clone)]
pub struct Dog {
  pub name: String,
  pub age: u8,
}
```

> ✅ **Good** (Correct annotation)

```rust
#[odra::odra_type]
pub struct Dog {
  pub name: String,
  pub age: u8,
  pub owner: Option<Address>,
}
```

### Storage : Default Value Access

**Description:** When reading from storage, prefer `get_or_default()` or `get_or_revert_with(error)` over raw `get()`. Raw `get()` returns `Option<T>`, which pushes error handling to every call site. Use `get_or_default()` when a sensible default exists (e.g., zero for balances) and `get_or_revert_with()` when the value must exist.

**Rationale:**

- **Consistency:** Eliminates scattered `unwrap()` calls and `.unwrap_or(default)` patterns.
- **Safety:** `get_or_revert_with()` provides a clear error when a required value is missing, rather than silently returning a default.

> ❌ **Bad** (Raw get with unwrap)

```rust
// panics if missing
let balance = self.balances.get(&owner).unwrap();
```

> ❌ **Bad** (Raw get with manual default)

```rust
let balance = self.balances.get(&owner).unwrap_or(U256::zero());
```

> ✅ **Good** (Using Odra's built-in accessors)

```rust
// When a default is acceptable
let balance = self.balances.get_or_default(&owner);

// When the value must exist
let owner = self.owner.get_or_revert_with(Error::OwnerNotSet);
```

### Events : Event Definition

**Description:** All events must be defined as structs annotated with `#[odra::event]`. Event fields must be `pub` so they can be constructed and inspected in tests. Events are emitted as native Casper events via `emit_event()`.

**Rationale:**

- **Schema Generation:** `#[odra::event]` generates the necessary serialization code and includes the event in the contract schema.
- **Testability:** Public fields allow test code to construct expected events for assertion.

> ❌ **Bad** (Missing annotation or private fields)

```rust
#[derive(Debug)]
pub struct Transfer {
  from: Option<Address>,   // private — cannot assert in tests
  to: Option<Address>,
  amount: U256,
}
```

> ✅ **Good** (Correct event definition)

```rust
#[odra::event]
pub struct Transfer {
  pub from: Option<Address>,
  pub to: Option<Address>,
  pub amount: U256,
}
```

### Events : Event Registration

**Description:** Every event emitted by a module must be listed in the `events` parameter of `#[odra::module(...)]`. Events registered on child submodules are automatically inherited by the parent, but explicitly listing them is preferred for clarity.

**Rationale:**

- **Schema Completeness:** Unregistered events will not appear in the generated contract schema, making them invisible to off-chain tooling, block explorers, and indexers.
- **Documentation:** The `events` list serves as inline documentation of what the contract emits.

> ❌ **Bad** (Event emitted but not registered)

```rust
#[odra::module]  // Transfer event is not registered!
pub struct MyToken {
  balances: Mapping<Address, U256>,
}

#[odra::module]
impl MyToken {
  pub fn transfer(&mut self, to: Address, amount: U256) {
    // ... logic ...
    self.env().emit_event(Transfer {
      from: Some(self.env().caller()),
      to: Some(to),
      amount,
    });
  }
}
```

> ✅ **Good** (Event is registered)

```rust
#[odra::module(events = [Transfer, Approval], errors = Error)]
pub struct MyToken {
  balances: Mapping<Address, U256>,
  allowances: Mapping<(Address, Address), U256>,
}
```

### Events : Event Emission

**Description:** Emit events via `self.env().emit_event()` for every state-changing operation that external observers (dApps, indexers, block explorers) need to track. This includes token transfers, approvals, ownership changes, role grants, and any business-critical state transitions.

`emit_event()` produces CES-compliant events indexed by the Casper Event Standard. `emit_native_event()` is a distinct API and **must not** be used for standard event emission — events emitted via `emit_native_event()` are not CES-compliant and will not be indexed by block explorers or dApps on Casper mainnet.

**Rationale:**

- **Observability:** Events are the primary mechanism for off-chain systems to track on-chain activity. Missing events create blind spots.
- **Auditability:** A complete event trail is essential for financial contracts, enabling reconciliation and dispute resolution.
- **CES Compliance:** Only `emit_event()` produces events compatible with the Casper Event Standard, ensuring visibility across the ecosystem.

> ❌ **Bad** (State change without event emission)

```rust
pub fn transfer(&mut self, to: Address, amount: U256) {
  let caller = self.env().caller();
  let from_balance = self.balances.get_or_default(&caller);
  self.balances.set(&caller, from_balance - amount);
  self.balances.set(
    &to,
    self.balances.get_or_default(&to) + amount,
  );
  // No event emitted — transfers are invisible to off-chain systems
}
```

> ❌ **Bad** (Using `emit_native_event()` instead of `emit_event()`)

```rust
pub fn transfer(&mut self, to: Address, amount: U256) {
  // ... state changes ...
  // WRONG: emit_native_event() is NOT CES-compliant
  self.env().emit_native_event(Transfer {
    from: Some(self.env().caller()),
    to: Some(to),
    amount,
  });
}
```

> ✅ **Good** (Using `emit_event()` after state change)

```rust
pub fn transfer(&mut self, to: Address, amount: U256) {
  let caller = self.env().caller();
  let from_balance = self.balances.get_or_default(&caller);
  self.balances.set(&caller, from_balance - amount);
  self.balances.set(
    &to,
    self.balances.get_or_default(&to) + amount,
  );
  self.env().emit_event(Transfer {
    from: Some(caller),
    to: Some(to),
    amount,
  });
}
```

### Error Handling : Error Definition

**Description:** All errors must be defined as field-less enums annotated with `#[odra::odra_error]`. Each variant **must** have an explicit numeric discriminant. Discriminants must be unique across the entire project.

**Rationale:**

- **Casper Requirement:** The Casper VM represents errors as numeric codes. The `#[odra::odra_error]` macro generates the necessary conversion.
- **Deterministic Decoding:** Explicit discriminants prevent the compiler from auto-assigning values, which could change if variants are reordered.
- **Project-Wide Uniqueness:** Since multiple contracts in a project may interact, unique discriminants prevent ambiguous error codes.

> ❌ **Bad** (Implicit discriminants)

```rust
#[odra::odra_error]
pub enum Error {
  InsufficientBalance,    // Implicit 0 — fragile
  InsufficientAllowance,  // Implicit 1
  NotOwner,               // Implicit 2
}
```

> ❌ **Bad** (Discriminants with data fields)

```rust
#[odra::odra_error]
pub enum Error {
  // Data fields are NOT supported
  InsufficientBalance(U256) = 1,
}
```

> ✅ **Good** (Explicit, unique discriminants)

```rust
#[odra::odra_error]
pub enum Error {
  InsufficientBalance = 1,
  InsufficientAllowance = 2,
  NotOwner = 3,
  ZeroAddress = 4,
}
```

### Error Handling : Error Registration

**Description:** All error enums must be registered in the `errors` parameter of `#[odra::module(...)]`. This ensures errors appear in the generated contract schema.

**Rationale:**

- **Schema Completeness:** Unregistered errors will not appear in the JSON schema, making it impossible for off-chain tooling to decode revert reasons.

> ❌ **Bad** (Errors not registered)

```rust
#[odra::module]  // Missing errors = Error
pub struct MyContract {
  owner: Var<Address>,
}
```

> ✅ **Good** (Errors registered)

```rust
#[odra::module(errors = Error)]
pub struct MyContract {
  owner: Var<Address>,
}
```

### Error Handling : Revert Pattern

**Description:** Use `self.env().revert(Error::Variant)` to halt execution with a typed error. For storage reads that must succeed, use `.get_or_revert_with(Error::Variant)`. For `Option` and `Result` values, use the `.unwrap_or_revert_with(&self.env(), Error::Variant)` extension. **Never** use `panic!`, `unwrap()`, or `expect()` in contract code.

**Rationale:**

- **Typed Errors:** `revert` produces a decodable error code. `panic!` produces an opaque, non-decodable failure message.
- **Gas Safety:** `panic!` may not be handled gracefully by the VM, leading to wasted gas without useful error information.
- **Testability:** Typed errors can be asserted in tests using `try_` variants.

> ❌ **Bad** (Using panic/unwrap)

```rust
pub fn withdraw(&mut self, amount: U256) {
  // PANIC if None
  let balance = self.balances.get(&self.env().caller()).unwrap();
  if balance < amount {
    panic!("Insufficient balance"); // Opaque error
  }
}
```

> ✅ **Good** (Using Odra's revert pattern)

```rust
pub fn withdraw(&mut self, amount: U256) {
  let caller = self.env().caller();
  let balance = self.balances
    .get(&caller)
    .unwrap_or_revert_with(&self.env(), Error::AccountNotFound);
  if balance < amount {
    self.env().revert(Error::InsufficientBalance);
  }
}
```

### Error Handling : Unique Error Discriminants

**Description:** Error discriminants must be unique across the **entire project**, not just within a single enum. When a project has multiple error enums (e.g., per contract module), they must use non-overlapping numeric ranges.

**Rationale:**

- **Cross-Contract Clarity:** When contracts interact via cross-contract calls, error codes propagate. Overlapping discriminants make it impossible to determine which contract produced the error.

> ❌ **Bad** (Overlapping discriminants across modules)

```rust
// escrow.rs
#[odra::odra_error]
pub enum EscrowError {
  // Conflicts with TokenError::InsufficientBalance!
  NotAuthorized = 1,
}

// token.rs
#[odra::odra_error]
pub enum TokenError {
  InsufficientBalance = 1,  // Same discriminant!
}
```

> ✅ **Good** (Non-overlapping ranges)

```rust
// escrow.rs — uses 100-199
#[odra::odra_error]
pub enum EscrowError {
  NotAuthorized = 100,
  EscrowNotFound = 101,
}

// token.rs — uses 200-299
#[odra::odra_error]
pub enum TokenError {
  InsufficientBalance = 200,
  InsufficientAllowance = 201,
}
```

> Ranges above are illustrative — use your contract's assigned range from the Discriminant Registry.

### Discriminant Registry

The following table lists all current error discriminant range assignments across the project. When adding new errors to an existing contract, use the next available value within that contract's range. When adding a new contract, choose a non-overlapping 100-value range outside the ranges listed below.

| Contract / Module | Range     | Base | Error Count | First Discriminant              | Last Discriminant                              |
| ----------------- | --------- | ---- | ----------- | ------------------------------- | ---------------------------------------------- |
| **NFT**           | `100–199` | 100  | 7           | `CallerNotMinter = 100`         | `NotAuthorized = 106`                          |
| **Treasury**      | `200–299` | 200  | 6           | `BigCoinContractIsNotSet = 200` | `InsufficientWithdrawalTokenAmount = 205`      |
| **Escrow**        | `300–399` | 300  | 11          | `CallerNotLeaseContract = 300`  | `EqualBuyerAndSeller = 310`                    |
| **Lease**         | `400–499` | 400  | 8           | `CallerNotLandlord = 400`       | `SecurityDepositChargeIsTooHigh = 408`         |
| **ICO**           | `500–599` | 500  | 15          | `InvalidICOScheduleId = 500`    | `ICOScheduleCliffExceedsVestingDuration = 514` |
| **Staking**       | `600–699` | 600  | 14          | `BigCoinContractIsNotSet = 601` | `CallerNotAuthorizedToManageLocks = 614`       |
| **Vesting**       | `700–799` | 700  | 8           | `CallerNotWhitelisted = 701`    | `ClaimBlockedByActiveUnbonding = 708`          |

#### Available Ranges (unassigned)

| Range     | Status                                                            |
| --------- | ----------------------------------------------------------------- |
| `0–99`    | ⚠️ Reserved (do not use — conflicts with Odra framework defaults) |
| `800–899` | ✅ Available                                                      |
| `900–999` | ✅ Available                                                      |
| `1_000+`  | ✅ Available (use sparingly; prefer contiguous ranges)            |

#### Rules for Adding New Discriminants

1. **Existing contracts:** Append to the next unused value in the contract's assigned range (see table above).
2. **New contracts:** Claim a fresh 100-value block from the "Available Ranges" table and update this registry.
3. **Never reuse** a discriminant value, even if a contract is deprecated or removed.
4. **Never overlap** ranges — each contract must occupy a distinct numeric block.

### Module Composition : SubModule for Composition

**Description:** Use `SubModule<T>` to embed child modules within a parent module. Each `SubModule` gets its own isolated storage keyspace. Call methods directly on the submodule field. **Never** attempt to simulate inheritance; Odra uses composition exclusively.

**Rationale:**

- **Storage Isolation:** Each `SubModule` has its own storage namespace, preventing key collisions between parent and child modules.
- **Reusability:** Standard modules (`Ownable`, `Pausable`, `AccessControl`, `Erc20`) from `odra-modules` can be composed into custom contracts.
- **Encapsulation:** Child modules manage their own state independently, reducing coupling.

> ❌ **Bad** (Reimplementing ownership logic instead of composing)

```rust
#[odra::module]
pub struct MyToken {
  owner: Var<Address>,
  balances: Mapping<Address, U256>,
}

#[odra::module]
impl MyToken {
  pub fn change_owner(&mut self, new_owner: Address) {
    // Reimplemented ownership logic — duplicated, error-prone
    let caller = self.env().caller();
    if caller != self.owner.get_or_revert_with(Error::NotOwner) {
      self.env().revert(Error::NotOwner);
    }
    self.owner.set(new_owner);
  }
}
```

> ✅ **Good** (Composing with SubModule)

```rust
use odra_modules::access::Ownable;

#[odra::module(events = [Transfer], errors = Error)]
pub struct MyToken {
  ownable: SubModule<Ownable>,
  balances: Mapping<Address, U256>,
}

#[odra::module]
impl MyToken {
  pub fn init(&mut self, owner: Address) {
    self.ownable.init(owner);
  }

  pub fn mint(&mut self, to: Address, amount: U256) {
    self.ownable.ensure_ownership(&self.env().caller());
    // ... mint logic ...
  }
}
```

### Module Composition : Delegate Macro for Forwarding

**Description:** Use the `delegate!` macro to forward entry points from a parent module to its submodules. This eliminates boilerplate wrapper functions. Each delegated function must include its full signature.

**Rationale:**

- **Boilerplate Reduction:** Without `delegate!`, every submodule method that should be publicly accessible requires a one-line wrapper function.
- **Consistency:** The delegated signatures serve as documentation of the submodule's public API within the parent contract.

> ❌ **Bad** (Manual wrapper functions)

```rust
#[odra::module]
impl OwnedToken {
  pub fn name(&self) -> String {
    self.erc20.name()
  }

  pub fn symbol(&self) -> String {
    self.erc20.symbol()
  }

  pub fn balance_of(&self, owner: Address) -> U256 {
    self.erc20.balance_of(owner)
  }

  pub fn get_owner(&self) -> Address {
    self.ownable.get_owner()
  }
  // ... many more wrappers ...
}
```

> ✅ **Good** (Using delegate! macro)

```rust
#[odra::module]
impl OwnedToken {
  pub fn init(
    &mut self,
    name: String,
    symbol: String,
    decimals: u8,
    initial_supply: U256,
  ) {
    let deployer = self.env().caller();
    self.ownable.init(deployer);
    self.erc20.init(name, symbol, decimals, initial_supply);
  }

  delegate! {
    to self.erc20 {
      fn name(&self) -> String;
      fn symbol(&self) -> String;
      fn decimals(&self) -> u8;
      fn total_supply(&self) -> U256;
      fn balance_of(&self, owner: Address) -> U256;
      fn transfer(&mut self, recipient: Address, amount: U256);
    }
    to self.ownable {
      fn get_owner(&self) -> Address;
      fn change_ownership(&mut self, new_owner: Address);
    }
  }
}
```

### Module Composition : External for Cross-Contract Calls

**Description:** Use `External<ContractRef>` to reference another deployed Odra contract. The address must be set in the constructor via `.set(address)`. Methods are then called directly on the `External` field.

**Rationale:**

- **Type Safety:** `External<T>` provides compile-time type checking for cross-contract calls, ensuring the correct function signatures are used.
- **Storage Persistence:** The referenced contract's address is stored on-chain, so it persists across calls.

> ❌ **Bad** (Hardcoding addresses or using raw calls)

```rust
#[odra::module]
impl CrossContract {
  pub fn do_something(&self) {
    // Raw address — no type safety, no compile-time checks
    let addr = Address::from_str("hash-abc...").unwrap();
    // ... raw call ...
  }
}
```

> ✅ **Good** (Using External with typed reference)

```rust
#[odra::module]
pub struct CrossContract {
  pub math_engine: External<MathEngineContractRef>,
}

#[odra::module]
impl CrossContract {
  pub fn init(&mut self, math_engine_address: Address) {
    self.math_engine.set(math_engine_address);
  }

  pub fn add(&self, a: u32, b: u32) -> u32 {
    self.math_engine.add(a, b)
  }
}
```

### Module Composition : External Contract Trait for Third-Party

**Description:** When interacting with a third-party contract that was not built with Odra (or whose source is not available), define its interface using `#[odra::external_contract]` on a trait. This generates a `{TraitName}ContractRef` type that can be instantiated with an address.

**Rationale:**

- **Interoperability:** Allows Odra contracts to call any Casper contract, not just other Odra contracts.
- **Type Safety:** The trait definition provides compile-time guarantees on the function signatures.

> ❌ **Bad** (Calling a third-party contract without a typed interface)

```rust
// No type safety — call could have wrong args, wrong return type
// No compile-time checks at all
```

> ✅ **Good** (External contract trait definition and usage)

```rust
#[odra::external_contract]
pub trait PriceFeed {
  fn get_price(&self, asset: String) -> U256;
  fn last_update(&self) -> u64;
}

// Usage in a contract:
impl MyContract {
  fn fetch_price(
    &self,
    feed_address: Address,
    asset: String,
  ) -> U256 {
    PriceFeedContractRef::new(self.env(), feed_address)
      .get_price(asset)
  }
}
```

### Security : Payable Annotation

**Description:** Only functions annotated with `#[odra(payable)]` can receive native CSPR tokens. Functions without this annotation automatically reject any calls that include a token transfer. The `#[odra(payable)]` annotation **must not** be used on constructors (`init`).

**Rationale:**

- **Explicit Intent:** The annotation makes it clear which functions are designed to receive funds, preventing accidental acceptance of tokens.
- **Safety by Default:** Non-payable functions reject token transfers, protecting against user errors where tokens would be locked in a contract with no withdrawal mechanism.

> ❌ **Bad** (Accepting tokens without payable annotation)

```rust
#[odra::module]
impl PublicWallet {
  // This will REVERT if called with tokens attached!
  pub fn deposit(&mut self) {
    let amount = self.env().attached_value();
    // ...
  }
}
```

> ✅ **Good** (Explicit payable annotation)

```rust
#[odra::module]
impl PublicWallet {
  #[odra(payable)]
  pub fn deposit(&mut self) {
    let amount = self.env().attached_value();
    // ... handle deposit ...
  }

  pub fn withdraw(&mut self, amount: U512) {
    // ... verify caller ...
    self.env().transfer_tokens(
      &self.env().caller(),
      &amount,
    );
  }
}
```

### Security : Reentrancy Guard

**Description:** Use `#[odra(non_reentrant)]` on all functions that perform external calls (cross-contract calls, token transfers) or handle funds. This prevents reentrancy attacks by blocking recursive calls into the guarded function. The `#[odra(non_reentrant)]` attribute is a defence-in-depth measure and is **not** a substitute for proper Checks-Effects-Interactions ordering (see [Checks-Effects-Interactions](#security--checks-effects-interactions)).

**Rationale:**

- **Attack Prevention:** Reentrancy is one of the most common smart contract vulnerabilities. The guard prevents an external contract from calling back into the guarded function before the original invocation completes.
- **Zero Boilerplate:** The attribute handles lock acquisition and release automatically, including on revert.

> ❌ **Bad** (External call without reentrancy guard)

```rust
#[odra::module]
impl Vault {
  pub fn withdraw(&mut self) {
    let caller = self.env().caller();
    let balance = self.balances.get_or_default(&caller);
    self.env().transfer_tokens(&caller, &balance);
    self.balances.set(&caller, U512::zero());
  }
}
```

> ✅ **Good** (Reentrancy guard applied with CEI ordering)

```rust
#[odra::module]
impl Vault {
  #[odra(non_reentrant)]
  pub fn withdraw(&mut self) {
    let caller = self.env().caller();
    let balance = self.balances.get_or_default(&caller);
    // Effects: update state BEFORE external call
    self.balances.set(&caller, U512::zero());
    // Interactions: external call LAST
    self.env().transfer_tokens(&caller, &balance);
  }
}
```

### Security : Checks-Effects-Interactions

**Description:** All functions that perform external calls (cross-contract calls, token transfers) **must** follow the Checks-Effects-Interactions (CEI) pattern:

1. **Checks:** Validate all inputs, permissions, and preconditions.
2. **Effects:** Update all internal state (storage writes, counter increments, balance changes).
3. **Interactions:** Make external calls (token transfers, cross-contract calls) only after all state updates are complete.

This ordering ensures that if an external call triggers a reentrant callback, the contract's state is already consistent. `#[odra(non_reentrant)]` is defence-in-depth and does not replace CEI ordering — if the guard is removed during refactoring, CEI-compliant code remains safe.

**Rationale:**

- **Reentrancy Prevention:** The primary defence against reentrancy attacks. Even without a reentrancy guard, CEI ordering prevents state inconsistency.
- **Correctness:** External calls can fail or behave unexpectedly. Updating state first ensures the contract's invariants hold regardless of the external call's outcome.
- **Defence in Depth:** Combined with `#[odra(non_reentrant)]`, CEI ordering provides two independent layers of protection.

> ❌ **Bad** (External call before state update — Interactions before Effects)

```rust
pub fn purchase(&mut self, schedule_id: u32) {
  let caller = self.env().caller();
  let amount = self.env().attached_value();

  // 1. Checks — OK
  let mut schedule = self.schedules
    .get(&schedule_id)
    .unwrap_or_revert_with(&self.env(), Error::ScheduleNotFound);

  let purchase_amount = self.calculate_purchase(amount);

  // 2. Interactions BEFORE Effects — WRONG
  self.treasury.with_tokens(amount).receive();

  // 3. Effects AFTER Interactions — state update is too late
  schedule.sold_amount += purchase_amount;
  self.schedules.set(&schedule_id, schedule);
}
```

> ✅ **Good** (CEI ordering: Checks, then Effects, then Interactions)

```rust
pub fn purchase(&mut self, schedule_id: u32) {
  let caller = self.env().caller();
  let amount = self.env().attached_value();

  // 1. Checks
  let mut schedule = self.schedules
    .get(&schedule_id)
    .unwrap_or_revert_with(&self.env(), Error::ScheduleNotFound);

  let purchase_amount = self.calculate_purchase(amount);

  // 2. Effects — update state FIRST
  schedule.sold_amount += purchase_amount;
  self.schedules.set(&schedule_id, schedule);
  self.env().emit_event(TokensPurchased {
    buyer: caller,
    amount: purchase_amount,
  });

  // 3. Interactions — external call LAST
  self.treasury.with_tokens(amount).receive();
}
```

### Security : Arithmetic Safety

**Description:** All financial calculations involving token amounts, prices, or any user-controlled numeric values **must** use checked or saturating arithmetic. Unchecked arithmetic on `U256` silently wraps on overflow, producing incorrect results. Always multiply before dividing (to preserve precision), but bounds-check the multiplication operands first.

Key rules:

- Use `checked_mul()`, `checked_add()`, `checked_sub()` for all operations that could overflow or underflow.
- Revert with a typed error if a checked operation returns `None`.
- When computing `(a * b) / c`, verify that `a * b` does not overflow before performing the division.
- `U256` division truncates toward zero — this matters for price calculations where rounding affects token amounts.

**Rationale:**

- **Silent Overflow:** `U256` arithmetic wraps silently on overflow. A multiplication like `amount * 10^18` will produce an incorrect result if `amount` is large enough, potentially allowing an attacker to purchase tokens at near-zero cost.
- **Precision Loss:** Dividing before multiplying loses precision. Always multiply first, but guard the multiplication with checked arithmetic.
- **Financial Correctness:** In a financial contract suite handling token purchases, escrow payments, and vesting schedules, arithmetic errors directly translate to lost or stolen funds.

> ❌ **Bad** (Unchecked multiplication — silent overflow)

```rust
pub fn calculate_purchase(
  &self,
  amount_to_spend: U256,
  token_price: U256,
) -> U256 {
  // If amount_to_spend is large, this multiplication wraps silently
  amount_to_spend * U256::from(10).pow(U256::from(18)) / token_price
}
```

> ❌ **Bad** (Dividing before multiplying — precision loss)

```rust
pub fn calculate_purchase(
  &self,
  amount_to_spend: U256,
  token_price: U256,
) -> U256 {
  // Division first truncates toward zero, losing precision
  (amount_to_spend / token_price) * U256::from(10).pow(U256::from(18))
}
```

> ✅ **Good** (Checked arithmetic with proper error handling)

```rust
pub fn calculate_purchase(
  &self,
  amount_to_spend: U256,
  token_price: U256,
) -> U256 {
  let scale = U256::from(10).pow(U256::from(18));
  // Multiply first for precision, but check for overflow
  let scaled = amount_to_spend
    .checked_mul(scale)
    .unwrap_or_revert_with(&self.env(), Error::ArithmeticOverflow);
  // Division truncates toward zero — acceptable for purchase amounts
  scaled / token_price
}
```

### Security : Timestamp Handling

**Description:** `self.env().get_block_time()` returns the block timestamp in **milliseconds** (not seconds, not UNIX epoch seconds). All deadline and time-based comparisons must use consistent units. When setting deadlines for financial operations, enforce a minimum deadline window to account for block time manipulation tolerance.

Key rules:

- All time constants and deadline parameters must be expressed in milliseconds.
- Enforce a configurable minimum deadline window (e.g., `min_deadline`) for time-sensitive operations like escrow deadlines or vesting cliffs.
- Never compare `get_block_time()` against values in seconds without explicit unit conversion.
- Document the unit of every time-related storage field and function parameter.

**Rationale:**

- **Unit Mismatch:** A common bug is treating `get_block_time()` as seconds. On Casper, block time is in milliseconds. A deadline set to `1_000` intending "1000 seconds" would actually be "1 second" if `get_block_time()` returns milliseconds.
- **Validator Manipulation:** Block proposers have limited control over the timestamp. While the tolerance is small, time-critical financial operations should use deadline windows large enough that minor timestamp manipulation cannot change the outcome.
- **Consistency:** Mixing units across different modules leads to subtle bugs that are difficult to catch in testing.

> ❌ **Bad** (Ambiguous time units, no minimum window)

```rust
pub fn create_invoice(
  &mut self,
  amount: U256,
  deadline: u64, // Seconds? Milliseconds? Unclear!
) {
  // Is this comparing milliseconds to seconds?
  if deadline < self.env().get_block_time() {
    self.env().revert(Error::DeadlineInPast);
  }
  self.deadline.set(deadline);
}
```

> ✅ **Good** (Explicit millisecond units, minimum deadline enforcement)

```rust
/// `deadline` is an absolute timestamp in **milliseconds** since epoch.
pub fn create_invoice(
  &mut self,
  amount: U256,
  deadline: u64,
) {
  let now = self.env().get_block_time();
  if deadline < now {
    self.env().revert(Error::DeadlineInPast);
  }
  // Enforce minimum deadline window (stored in milliseconds)
  let min_window = self.min_deadline.get_or_default();
  if deadline < now + min_window {
    self.env().revert(Error::DeadlineTooSoon);
  }
  self.deadline.set(deadline);
}
```

### Security : Access Control

**Description:** Guard all privileged operations with ownership or role checks at the **start** of the function body. Use `SubModule<Ownable>` for single-owner patterns or `SubModule<AccessControl>` for role-based access. Checks must execute before any state modifications.

**Rationale:**

- **Fail Fast:** Checking permissions first prevents wasted gas on operations that will ultimately fail.
- **Defence in Depth:** Even if a function is only called internally today, adding explicit access control protects against future refactoring that may expose it.

> ❌ **Bad** (Access check after state modification)

```rust
pub fn set_fee(&mut self, new_fee: U256) {
  // State modified BEFORE checking permissions!
  self.fee.set(new_fee);
  self.ownable.ensure_ownership(&self.env().caller());
}
```

> ✅ **Good** (Access check first)

```rust
pub fn set_fee(&mut self, new_fee: U256) {
  self.ownable.ensure_ownership(&self.env().caller());
  self.fee.set(new_fee);
  self.env().emit_event(FeeChanged { new_fee });
}
```

### Security : Address Handling

**Description:** Odra's `Address` type has no default or zero value (unlike Solidity's `address(0)`). Use `Option<Address>` when a field may be unset, and `get_or_revert_with()` when the address must exist. Never use sentinel values or attempt to construct a "zero address."

**Rationale:**

- **Type Safety:** `Option<Address>` makes the absence of an address explicit and compiler-enforced. There is no risk of accidentally using a zero address as a valid recipient.
- **Casper Compatibility:** Casper addresses are either account hashes or contract package hashes — there is no universally agreed-upon "zero" address.

> ❌ **Bad** (Attempting to use a zero address sentinel)

```rust
#[odra::module]
pub struct MyContract {
  // No way to represent "unset" — Address has no Default
  pending_owner: Var<Address>,
}
```

> ✅ **Good** (Using Option<Address>)

```rust
#[odra::module]
pub struct MyContract {
  pending_owner: Var<Option<Address>>,
}

impl MyContract {
  fn accept_ownership(&mut self) {
    let pending = self.pending_owner
      .get_or_revert_with(Error::NoPendingOwner);
    // pending is Option<Address>, check if Some
    match pending {
      Some(addr) if addr == self.env().caller() => {
        self.owner.set(addr);
        self.pending_owner.set(None);
      }
      _ => self.env().revert(Error::NotPendingOwner),
    }
  }
}
```

### Testing : Test Environment Setup

**Description:** Use `odra_test::env()` to create the test environment. Deploy contracts using `Module::deploy(&env, init_args)` or `Module::deploy(&env, NoArgs)` for contracts without constructors. Use `env.get_account(n)` to obtain test accounts (indices 0–19).

**Rationale:**

- **Consistency:** A standardized test setup pattern makes tests readable and maintainable.
- **Isolation:** Each `odra_test::env()` call creates a fresh environment with clean state.

> ❌ **Bad** (Manual environment construction)

```rust
#[test]
fn test_transfer() {
  // Don't construct environments manually
  let contract = MyToken::new();
  contract.init("Test", "TST", 18);
}
```

> ✅ **Good** (Standard test setup)

```rust
use odra::host::{Deployer, NoArgs};

#[test]
fn test_transfer() {
  let test_env = odra_test::env();
  let init_args = MyTokenInitArgs {
    name: "Test".to_string(),
    symbol: "TST".to_string(),
    decimals: 18,
    initial_supply: U256::from(1_000_000),
  };
  let mut contract = MyToken::deploy(&test_env, init_args);

  let alice = test_env.get_account(0);
  let bob = test_env.get_account(1);
  test_env.set_caller(alice);
  contract.transfer(bob, U256::from(100));
}
```

### Testing : Test Both Backends

**Description:** All tests must pass against both the OdraVM (fast, mock) and CasperVM (full WASM compilation) backends before a feature is considered complete. Use `cargo odra test` for OdraVM and `cargo odra test -b casper` for CasperVM.

**Rationale:**

- **OdraVM Limitations:** OdraVM is a mock that may not perfectly replicate Casper's behavior, especially around gas costs, serialization edge cases, and WASM-specific constraints.
- **CasperVM Accuracy:** CasperVM compiles contracts to actual WASM and runs them in the real VM, catching issues that OdraVM misses.
- **Development Speed:** OdraVM is significantly faster and supports IDE debuggers, making it ideal for rapid iteration. CasperVM should be used as a final verification step.

> ❌ **Bad** (Testing only with OdraVM)

```bash
# Only running OdraVM tests — CasperVM issues will be missed
cargo odra test
```

> ✅ **Good** (Testing against both backends)

```bash
# Fast iteration during development
cargo odra test

# Final verification before merge
cargo odra test -b casper
```

### Testing : Error Assertions

**Description:** Use the auto-generated `try_` method variants to assert that a function call reverts with the expected error. Every `pub` function `foo()` in an `#[odra::module] impl` block automatically gets a `try_foo()` variant that returns `OdraResult<T>` instead of reverting.

**Rationale:**

- **Precise Assertions:** `try_` variants allow asserting the exact error variant, not just that a revert occurred.
- **No Panics in Tests:** Using `try_` variants prevents test panics, making test output cleaner and more informative.

> ❌ **Bad** (Using should_panic)

```rust
#[test]
#[should_panic]
fn test_unauthorized_transfer() {
  // This only asserts that SOME panic occurred — not WHICH error
  contract.transfer(bob, U256::from(100));
}
```

> ✅ **Good** (Using try\_ variant with error assertion)

```rust
#[test]
fn test_unauthorized_transfer() {
  let result = contract.try_transfer(bob, U256::from(100));
  assert_eq!(
    result.unwrap_err(),
    Error::InsufficientBalance.into(),
  );
}
```

### Testing : Event Assertions

**Description:** After every state-changing operation in tests, assert that the expected events were emitted using `test_env.emitted_event(&contract, expected_event)`. Also verify event counts when multiple events are expected.

**Rationale:**

- **Behavioral Verification:** Events are part of the contract's public API. Verifying them ensures that off-chain systems will receive the expected notifications.
- **Regression Detection:** If a refactoring accidentally removes an event emission, the test will catch it.

> ❌ **Bad** (No event assertions)

```rust
#[test]
fn test_transfer() {
  contract.transfer(bob, U256::from(100));
  assert_eq!(contract.balance_of(bob), U256::from(100));
  // Missing event assertion — transfer event could be silently dropped
}
```

> ✅ **Good** (Asserting events after state change)

```rust
#[test]
fn test_transfer() {
  let test_env = odra_test::env();
  // ... setup ...
  contract.transfer(bob, U256::from(100));
  assert_eq!(contract.balance_of(bob), U256::from(100));
  assert!(test_env.emitted_event(
    &contract,
    Transfer {
      from: Some(alice),
      to: Some(bob),
      amount: U256::from(100),
    },
  ));
}
```

### Testing : Token Transfer Testing

**Description:** Use `.with_tokens(amount)` to attach native CSPR tokens to a contract call in tests. Use `test_env.balance_of(&contract)` to verify the contract's balance after the operation. Always verify both the contract's balance and the caller's balance change to ensure tokens were correctly transferred.

**Rationale:**

- **Realistic Simulation:** Token-related functions require attached value to work correctly. `.with_tokens()` simulates this in the test environment.
- **Balance Verification:** Always verify both the contract's balance and the caller's balance change to ensure tokens were correctly transferred.

> ❌ **Bad** (Calling a payable function without `.with_tokens()`)

```rust
#[test]
fn test_deposit() {
  let test_env = odra_test::env();
  let mut wallet = PublicWallet::deploy(&test_env, NoArgs);

  // WRONG: no tokens attached — this call will have zero value
  wallet.deposit();
  // Balance is zero, test passes vacuously
  assert_eq!(test_env.balance_of(&wallet), U512::zero());
}
```

> ❌ **Bad** (Verifying only one side of the balance change)

```rust
#[test]
fn test_deposit() {
  let test_env = odra_test::env();
  let mut wallet = PublicWallet::deploy(&test_env, NoArgs);

  wallet.with_tokens(U512::from(1_000)).deposit();
  // Only checking contract balance — caller's balance is not verified
  assert_eq!(test_env.balance_of(&wallet), U512::from(1_000));
}
```

> ✅ **Good** (Testing token deposit and withdrawal with full balance verification)

```rust
#[test]
fn test_deposit_and_withdraw() {
  let test_env = odra_test::env();
  let mut wallet = PublicWallet::deploy(&test_env, NoArgs);
  let depositor = test_env.get_account(0);

  test_env.set_caller(depositor);
  let balance_before = test_env.balance_of(&depositor);
  wallet.with_tokens(U512::from(1_000)).deposit();
  assert_eq!(
    test_env.balance_of(&depositor),
    balance_before - U512::from(1_000)
  );
  assert_eq!(
    test_env.balance_of(&wallet),
    U512::from(1_000),
  );

  wallet.withdraw(U512::from(500));
  assert_eq!(
    test_env.balance_of(&wallet),
    U512::from(500),
  );
}
```

### Deployment & Upgrades : Gas Configuration

**Description:** When deploying or interacting with contracts on livenet, always set explicit gas values using `env.set_gas(amount)`. Deployment typically requires significantly more gas than function calls. Recommended starting values: `400_000_000_000` for deployment, `2_500_000_000` for function calls.

**Rationale:**

- **Transaction Success:** Insufficient gas causes transaction failure. Explicit gas values prevent silent failures.
- **Cost Management:** Overly generous gas values waste CSPR. Tuning gas values to the minimum required optimizes deployment costs.

> ❌ **Bad** (No gas configuration — relies on unknown defaults)

```rust
// No gas set — deployment may fail with "out of gas" or use
// an unpredictable default value
let contract = MyContract::deploy(&env, init_args);
contract.transfer(recipient, amount);
```

> ✅ **Good** (Explicit gas configuration)

```rust
// In a deployment script
let env = /* livenet env */;
env.set_gas(400_000_000_000u64); // Deployment gas
let contract = MyContract::deploy(&env, init_args);

env.set_gas(2_500_000_000u64); // Function call gas
contract.transfer(recipient, amount);
```

### Deployment & Upgrades : Upgradable Contracts

**Description:** Contracts that may need future upgrades must be deployed with `InstallConfig::upgradable()`. Upgraded contract versions must implement an `upgrade` function that handles state migration from the previous version.

**Rationale:**

- **Immutability by Default:** Casper contracts are immutable by default. Upgradability must be explicitly opted into at deployment time — it cannot be added later.
- **State Migration:** The `upgrade` function runs once during the upgrade process and is the only opportunity to migrate state from the old storage layout to the new one.

> ❌ **Bad** (Deploying an upgradable contract without InstallConfig)

```rust
// This contract will be permanently immutable — no upgrades possible
let contract = MyContract::deploy(&env, init_args);
```

> ✅ **Good** (Deploying with upgradability and providing migration)

```rust
// Initial deployment — upgradable
let contract = MyContractV1::deploy_with_cfg(
  &env,
  init_args,
  InstallConfig::upgradable::<MyContractV1>(),
);

// Later upgrade — V2 with state migration
#[odra::module]
impl MyContractV2 {
  pub fn upgrade(&mut self, new_param: Option<U256>) {
    // Migrate state from V1 layout to V2 layout
    if let Some(value) = new_param {
      self.new_field.set(value);
    } else {
      let old_value = self.old_field.get_or_default();
      self.new_field.set(old_value.into());
    }
  }
}
```
