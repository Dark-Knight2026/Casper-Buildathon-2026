# Archived Feature: ICO, Staking, and Vesting (Token Economics Stack)

**Archived:** 2026-06-26  
**Removed from:** branch `dev` (lease-only downstream repo)  
**Reason:** The downstream deployment target only needs the property-leasing stack. ICO token
sales, staking rewards, and vesting schedules are out of scope for that repo. The full
token-economics suite remains on `master`.

---

## What This Feature Was

Three contracts implementing LeaseFi's BIG token distribution and incentive layer:

```
ICO  -->  Vesting  -->  Staking
 |            |            ^
 |            +------------+
 +--> Treasury --(deposit_rewards 60%)--> Staking
```

### Removed contracts (3)

| Contract | Role |
|----------|------|
| `ICO` | Multi-currency BIG token sales (CSPR, USDC, USDT); Styks price feed for CSPR pricing |
| `Vesting` | Time-based BIG vesting schedules; whitelisted creators (typically ICO); auto-stake on claim |
| `Staking` | BIG stake/unstake, reward accrual, unbonding; receives rewards from Treasury |

### Supporting code (removed with ICO)

| Path | Role |
|------|------|
| `src/interfaces/styks_price_feed.rs` | Styks oracle trait used by ICO |
| `src/mocks/styks_price_feed.rs` | Test mock for ICO price feed |

### Treasury coupling (refactored, not removed)

`Treasury::deposit_rewards` originally split deposits 60% to Staking / 40% reserves
(`STAKING_REWARDS_BPS` / `INCENTIVES_REWARDS_BPS`). After removal on `dev`, it keeps
100% as Treasury reserves. `Treasury` itself stays — Escrow still routes protocol fees to it.

### What stayed on `dev`

- `BigCoin`, `Treasury`, `Escrow`, `Lease`, `NFT`, `PropertyRegistry`, `UserRegistry`, `Roles`
- 8 deployable contracts after removal (down from 11)

---

## Recovery Pointers

| Pointer | Value |
|---------|-------|
| **Annotated tag** | `archive/ico-staking-vesting-v1` at commit `1e8edd3` (pre-removal `dev` HEAD) |
| **Full stack branch** | `master` retains ICO, Staking, and Vesting |

Verify the tag is available:

```bash
git tag -l 'archive/*'
git ls-remote --tags origin archive/ico-staking-vesting-v1
```

---

## Restore Recipe

To restore the full token-economics stack from the archive tag:

```bash
# 1. Restore contract sources and tests
git checkout archive/ico-staking-vesting-v1 -- \
  src/ico.rs \
  src/staking.rs \
  src/vesting.rs \
  tests/ico.rs \
  tests/staking.rs \
  tests/vesting.rs \
  src/interfaces/styks_price_feed.rs \
  src/interfaces/mod.rs \
  src/mocks/styks_price_feed.rs \
  src/mocks/mod.rs

# 2. Restore registration, wiring, and Treasury staking coupling
git checkout archive/ico-staking-vesting-v1 -- \
  src/lib.rs \
  Odra.toml \
  src/tests.rs \
  src/treasury.rs \
  src/constants.rs \
  src/escrow.rs \
  src/big_coin.rs \
  bin/cli.rs \
  bin/manual_setter.rs \
  tests/treasury.rs \
  tests/contract_metadata.rs \
  README.md \
  resources/casper_contract_schemas/ico_schema.json \
  resources/casper_contract_schemas/staking_schema.json \
  resources/casper_contract_schemas/vesting_schema.json \
  resources/casper_contract_schemas/treasury_schema.json

# 3. Rebuild and verify
cargo odra build    # expect 11 contracts
cargo odra test
cargo odra schema
cargo check
```

Alternatively, branch from the archive point:

```bash
git checkout -b restore/ico-staking-vesting archive/ico-staking-vesting-v1
```

Or inspect diffs without checking out:

```bash
git show archive/ico-staking-vesting-v1:src/treasury.rs
git diff archive/ico-staking-vesting-v1 HEAD -- src/treasury.rs bin/cli.rs
```

---

## Integration Points (pre-removal)

| File | Integration |
|------|-------------|
| `src/lib.rs` | `pub mod` for ICO, Staking, Vesting |
| `Odra.toml` | `[[contracts]]` entries for all three |
| `src/tests.rs` | Test module includes |
| `src/treasury.rs` | `set_staking`, `deposit_rewards` 60/40 split via `StakingContractRef` |
| `bin/cli.rs` | Deploy ICO/Staking/Vesting; cross-wiring; ICO schedule bootstrap |
| `bin/manual_setter.rs` | `treasury-set-staking`, `staking-*`, `vesting-*`, `ico-*` subcommands |
| `src/constants.rs` | `STAKING_REWARDS_BPS`, `STYKS_ORACLE_*`, `PRIVATE_SALE_*`, `UNBONDING_PERIOD` |
| `tests/treasury.rs` | Staking deploy helper; split deposit_rewards assertions |
| `tests/contract_metadata.rs` | CEP-96 metadata tests for all three |
| `README.md` | Contract docs and error-code blocks 500–799 |

### Error code blocks (pre-removal)

| Range | Contract |
|-------|----------|
| 500–599 | `ICO` |
| 600–699 | `Staking` |
| 700–799 | `Vesting` |
| 201 | `Treasury` — `StakingContractIsNotSet` |

---

## Coordination Notes

- **Scope:** Removal targets `dev` only (downstream lease repo). Do not apply to `master`
  unless deliberately merging the lease-only fork back.
- **Treasury ABI change:** Post-removal `dev` drops `set_staking` and `get_staking_contract_address`.
  Any deployed Treasury wired to Staking needs redeployment or stays on the archived stack.
- **Do not rebase** this removal onto branches that extend ICO/staking — same pitfall as the
  ERC-3643 fractional-ownership rebase (zombie files resurrected from the base branch).