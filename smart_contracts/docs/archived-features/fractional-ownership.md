# Archived Feature: Fractional Ownership & Equity Eligibility (ERC-3643 Stack)

**Archived:** 2026-06-26  
**Removed from:** branch `remove-fract-ownership-and-equity-eligibility`  
**Reason:** Client reversed the decision to ship lease-option equity eligibility and the
tokenized-property compliance stack in the current release cycle. The code is preserved for
possible revival later.

---

## What This Feature Was

The "Lease Option Equity Eligibility" feature let tenants with a lease-to-own option become
eligible for future property-token (fractional ownership) distributions. It was implemented as
a single inseparable ERC-3643-style stack:

```
PropertyFractionToken  ->  CompliancePolicy  ->  InvestorRegistry
                                  |
                                  +-> Lease.is_equity_eligible()  (equity coupling)
                                  +-> PropertyRegistry  (property lifecycle; kept after removal)
```

### Removed contracts (3)

| Contract | Role |
|----------|------|
| `InvestorRegistry` | On-chain investor verification state (KYC eligibility, freeze, jurisdiction) |
| `CompliancePolicy` | Transfer gate for property ownership tokens; calls `Lease.is_equity_eligible()` for equity distributions |
| `PropertyFractionToken` | Permissioned fractional property token; calls `CompliancePolicy.assert_can_transfer()` before transfers |

### Lease equity layer (removed from `Lease`)

- `LeaseEquityOption` type and optional `equity_option` field on lease agreements
- `equity_eligible` storage mapping and `is_equity_eligible()` getter
- `EquityEligibilityGranted` / `EquityEligibilityRevoked` events
- `TenantAlreadyEquityEligible` error (414)

### What stayed

- **`PropertyRegistry`** — ground-truth for registered properties; lease agreements now require a
  `property_id` and always validate `status == Active` (issuer must match landlord).

---

## Recovery Pointers

| Pointer | Value |
|---------|-------|
| **Annotated tag** | `archive/fractional-ownership-equity-v1` at commit `4c5c45f` (pre-removal HEAD) |
| **Feature branch** | `lease-option-equity-eligibility` (on `origin` and `client` remotes — do not delete) |

Verify the tag is available:

```bash
git tag -l 'archive/*'
git ls-remote --tags origin archive/fractional-ownership-equity-v1
```

---

## Restore Recipe

To restore the full feature from the archive tag into a working tree:

```bash
# 1. Restore contract sources and tests
git checkout archive/fractional-ownership-equity-v1 -- \
  src/investor_registry.rs \
  src/compliance_policy.rs \
  src/property_fraction_token.rs \
  tests/investor_registry.rs \
  tests/compliance_policy.rs \
  tests/property_fraction_token.rs

# 2. Restore registration / wiring (or cherry-pick the removal commit's inverse)
git checkout archive/fractional-ownership-equity-v1 -- \
  src/lib.rs \
  Odra.toml \
  src/tests.rs \
  bin/cli.rs \
  src/lease.rs \
  tests/lease.rs \
  src/escrow.rs \
  README.md \
  resources/casper_contract_schemas/investor_registry_schema.json \
  resources/casper_contract_schemas/compliance_policy_schema.json \
  resources/casper_contract_schemas/property_fraction_token_schema.json \
  resources/casper_contract_schemas/lease_schema.json

# 3. Rebuild and verify
cargo odra build    # expect 14 contracts (11 base + 3 restored)
cargo odra test
cargo odra schema
```

Alternatively, inspect the full tree at the tag without checking out:

```bash
git show archive/fractional-ownership-equity-v1:src/lease.rs
git diff archive/fractional-ownership-equity-v1 HEAD -- src/lease.rs
```

Or branch from the archive point:

```bash
git checkout -b restore/fractional-ownership archive/fractional-ownership-equity-v1
```

---

## Integration Points (pre-removal)

These files referenced the removed stack and were edited during removal:

| File | Integration |
|------|-------------|
| `src/lib.rs` | `pub mod` for all three contracts |
| `Odra.toml` | `[[contracts]]` entries for all three |
| `src/tests.rs` | `#[path = ...]` test module includes |
| `bin/cli.rs` | Deploy `InvestorRegistry`, `CompliancePolicy`; role grants; CLI `.contract::<...>()` registrations |
| `src/lease.rs` | Equity option on create/finalize; `is_equity_eligible()` consumed by `CompliancePolicy` |
| `tests/lease.rs` | Equity-specific test cases and helpers |
| `src/escrow.rs` | Comment referencing optional equity |
| `README.md` | Tokenized property compliance flow documentation |
| `resources/casper_contract_schemas/` | ABI schemas for removed contracts + equity fields in `lease_schema.json` |

`PropertyFractionToken` was **not** wired into `bin/cli.rs` deploy script at archive time; it was
deployed separately per property. `CompliancePolicy` was deployed with references to
`InvestorRegistry`, `PropertyRegistry`, `Lease`, and `UserRegistry`.

### Error code blocks (pre-removal)

| Range | Contract |
|-------|----------|
| 800–899 | `InvestorRegistry` |
| 1000–1099 | `CompliancePolicy` |
| 414 | `Lease` — `TenantAlreadyEquityEligible` |

---

## Coordination Notes

- Branch `erc-3643-token-and-revenue-flow` (48 commits ahead, unmerged) extends the same
  fractional-ownership / RWA work. After this removal lands on `master`, that branch will conflict
  on `compliance_policy.rs`, `property_fraction_token.rs`, and `lease.rs` and likely needs rebase or
  abandonment if the client is not pursuing the feature.
- `PropertyRegistry` and `UserRegistry` are unaffected by this archive and remain in active use.