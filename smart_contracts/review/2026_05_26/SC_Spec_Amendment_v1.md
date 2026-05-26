# SC Spec v1.4.4 — Amendment v1

**Status:** Draft for Engineering Lead / audit firm review
**Date:** 2026-05-25
**Author:** Founder (Tony) with input from architecture review
**Source ADRs:** ADR-004 (Phasing), ADR-005 (Minimal DisputeModule), ADR-006 (PaymentRouter), ADR-007 (Hybrid Singleton/Per-Lease)
**Purpose:** Amend SC Spec v1.4.4 to reflect the Phase 0 / Phase 1 phasing for contract topology and the minimal DisputeModule v1.0 specification.

This amendment introduces new sections rather than diff-style edits because the changes to §2.1 (Contract Topology) and §8 (DisputeModule) are substantial enough that standalone replacement reads better than line-by-line diffs.

---

## §1.5 MVP Concessions — Amended [DIFF]

### Current

> *(Current SC Spec v1.4.4 §1.5 describes three Phase 1 operational concessions matching PRD §4.4.4 and Whitepaper §8.6.)*

### Amended

> ## 1.5 Phase 0 / Phase 1 MVP Concessions
>
> Phase 0 (soft-launch pilot) and Phase 1 (broader rollout) operate with three documented operational concessions. The concessions are identical in scope across Phases 0 and 1 with one exception: Concession 1 (Centralized Arbitration) ships in two stages — minimal DisputeModule in Phase 0, full DisputeModule in Phase 1.
>
> **Concession 1: Centralized Arbitration**
>
> - Phase 0: Minimal DisputeModule per §8.0 (below). On-chain dispute filing, vault auto-release blocking, arbitrator-executed resolution. No dispute filing fee, no loser-pays reimbursement.
> - Phase 1: Full DisputeModule per §8.1-§8.4 (existing spec). Adds dispute filing fee via PaymentRouter, loser-pays reimbursement, governance-adjustable win threshold, arbitrator rotation, Phase 2 governance migration preparation.
> - Phase 2: DecentralizedDisputeModule with BIG-holder staked arbitration.
>
> **Concession 2: CO-Controlled PropertyManagerRegistry**
>
> - Phase 0 / Phase 1: Compliance Officer authorizes PM registrations after off-chain license verification. No change between Phase 0 and Phase 1.
> - Phase 2: Governor-controlled via governance proposal.
>
> **Concession 3: Simplified TreasuryRouter**
>
> - Phase 0 / Phase 1: TreasuryRouter burns BIG fees immediately; routes non-BIG to DAO Treasury 2-of-3 multisig (CO + GC + Founder). No change between Phase 0 and Phase 1.
> - Phase 2: FeeDistributor implementing Dynamic Fee Allocation Model.

---

## §2.1 Contract Topology — Amended [NEW SUBSECTIONS]

The current §2.1 enumerates seven canonical contracts. This amendment retains the seven-contract count but adds clarifying language describing the hybrid singleton/per-lease topology for the Lease contract and the Phase 0 / Phase 1 staging of DisputeModule.

### Insert as new subsections §2.1.1 and §2.1.2

> ### 2.1.1 Contract Topology Summary
>
> | Contract | Phase 0 | Phase 1 | Notes |
> |---|---|---|---|
> | LeaseFactory | Active (standard `create_lease` only) | Active (standard `create_lease` only) | LPT-eligible variants in Phase 4 per §2.1.2 |
> | Lease | Singleton, active | Singleton, active | Hybrid promotion to per-lease in Phase 4 per §2.1.2 |
> | DepositVault | Per-lease, active | Per-lease, active | Non-yield-bearing through Phase 1; v2.0 in Phase 2 |
> | DisputeModule | **Minimal** per §8.0 | **Full** per §8.1-§8.4 | See §8.0 for Phase 0 subset |
> | PMRegistry | Active (CO-gated per Concession 2) | Active (CO-gated per Concession 2) | Governor-gated in Phase 2 |
> | PaymentRouter | Active (six FeeSource dispatchers invoked; seventh exists but is not called) | Active (all seven FeeSource dispatchers invoked) | Required in Phase 0 per ADR-006 |
> | TreasuryRouter | Active (Concession 3 simplified) | Active (Concession 3 simplified) | FeeDistributor replacement in Phase 2 |
>
> ### 2.1.2 Lease Contract Hybrid Singleton / Per-Lease Topology
>
> Per ADR-007, the Lease contract follows a hybrid topology:
>
> **Standard leases (default, Phase 0 and Phase 1):** Deployed as `LeaseAgreement` records in a singleton Lease contract holding all standard lease state in a `Mapping<u64, LeaseAgreement>` keyed by `lease_id`. The singleton handles entry points (`pay_rent`, `pay_late_fee`, `terminate_lease`, `terminate_with_buyout`, `file_dispute`, `end_lease_at_term`) internally for standard leases.
>
> **LPT-eligible leases (Phase 4):** Deployed as dedicated per-lease Lease contracts with their own on-chain addresses. The singleton retains a `LeaseAgreement` record with `lease_contract_address: Some(per_lease_address)` and `lpt_eligible: true`. Singleton entry points delegate calls to the per-lease contract for LPT-eligible leases.
>
> The `LeaseAgreement` struct in the singleton includes two reserved fields ready for Phase 4 promotion:
>
> ```rust
> pub struct LeaseAgreement {
>     pub lease_id: u64,
>     pub tenant: Address,
>     pub landlord: Address,
>     pub property_manager: Option<Address>,
>     // ... standard lease fields per existing §6 spec ...
>
>     /// Reserved for Phase 4. None for all standard leases.
>     /// Some(addr) indicates the lease has been promoted to a
>     /// dedicated per-lease Lease contract at addr.
>     pub lease_contract_address: Option<Address>,
>
>     /// Reserved for Phase 4. False for all standard leases.
>     /// True indicates the lease is eligible for LPT issuance.
>     pub lpt_eligible: bool,
> }
> ```
>
> **Singleton entry point routing logic (Phase 0 implementation):**
>
> ```rust
> impl Lease {  // singleton
>     pub fn pay_rent(&mut self, lease_id: u64, amount: U256) {
>         let lease = self.leases.get(lease_id);
>
>         // Phase 4 routing — Phase 0 always takes the None branch
>         if let Some(per_lease_addr) = lease.lease_contract_address {
>             return runtime::call_contract(
>                 per_lease_addr, "pay_rent", args
>             );
>         }
>
>         // Standard lease — handle internally
>         self.handle_rent_payment_internally(lease_id, amount);
>     }
>     // Similar routing in pay_late_fee, terminate_lease, etc.
> }
> ```
>
> **Phase 4 additions to LeaseFactory:**
>
> - `create_lease_with_lpt_eligibility(...)` — deploys a dedicated per-lease Lease contract with both parties' EIP-712 consent signatures on `LptEligibleLeaseAgreement` schema.
> - `promote_lease(lease_id, tenant_sig, landlord_sig, pm_sig)` — mid-life promotion of an existing singleton-row lease to a dedicated per-lease contract. Requires lease state migratable (no active dispute, no in-flight payment).
>
> **Payment history during/after promotion:** Payment history accumulated before promotion remains in the singleton's `payment_history` mapping indexed by `lease_id`. The per-lease contract handles new payments after promotion. The singleton's historical mapping is retained as a permanent archive.

---

## §8.0 Phase 0 Minimal DisputeModule [NEW SECTION]

**Insert this new section §8.0 ahead of existing §8.1 (Overview), which becomes the Phase 1 reference.**

### 8.0.1 Overview

Phase 0 ships a minimal DisputeModule providing the core on-chain dispute lifecycle adequate for pilot operations. Centralized arbitration via a contracted arbitration service (AAA, JAMS, or specialized landlord-tenant arbitration provider) is conducted off-chain; on-chain DisputeModule handles dispute filing, vault auto-release blocking, and arbitrator-executed resolution.

The minimal DisputeModule is the subset of full DisputeModule v1.4.4 (§8.1-§8.4) sufficient to:

- Allow either party to file a dispute on-chain with a `disputed_amount` and `evidence_cid`
- Block DepositVault auto-release while the dispute is active
- Allow the registered arbitrator to submit a resolution executing the deposit split on-chain
- Validate `disputed_amount` against `DepositVault.available_funds` at filing time (preserves the v1.3.1 Critical #2 correctness invariant)

The minimal DisputeModule **does not** include:

- 2% dispute filing fee (the seventh FeeSource variant; activated in Phase 1)
- Loser-pays reimbursement logic
- `win_threshold_bps` governance parameter
- `set_win_threshold_bps`, `set_arbitrator`, `migrate_to_governor` entry points
- DisputeStatus `Expired` status (deferred — Phase 0 disputes do not time out)

Phase 1 → Full DisputeModule additions are described in §8.1-§8.4 (existing v1.4.4 spec, retained verbatim).

### 8.0.2 Phase 0 Storage

```rust
key: "arbitrator"            value: Address
key: "dispute_counter"       value: u64

dict: "disputes"             // dispute_id -> DisputeRecord
dict: "lease_to_dispute"     // lease_id -> Option<u64>
```

Phase 0 storage is a strict subset of the v1.4.4 §8.2 storage. Phase 1 deployment will add:

- `compliance_officer: Address` — added Phase 1 for `set_win_threshold_bps`
- `win_threshold_bps: u32` — added Phase 1
- `phase_lock: Phase`, `is_migrated: bool`, `governance_migrator: Address` — added Phase 1 in preparation for Phase 2

### 8.0.3 Phase 0 DisputeRecord Struct

```rust
pub struct DisputeRecord {
    pub dispute_id: u64,
    pub lease_id: u64,
    pub lease_contract: Address,
    pub deposit_vault: Address,
    pub tenant: Address,
    pub landlord: Address,
    pub plaintiff: Address,            // tenant OR landlord
    pub defendant: Address,            // the other party
    pub reason_hash: [u8; 32],
    pub evidence_cid: String,
    pub disputed_amount: U256,
    pub filed_time_ms: u64,
    pub resolution_deadline_ms: u64,   // set but not enforced in Phase 0
    pub status: DisputeStatus,         // Filed, UnderReview, Resolved only
    pub outcome: Option<DisputeOutcome>,
    pub resolution_time_ms: Option<u64>,
    pub resolution_evidence_cid: Option<String>,

    // Reserved field positions for Phase 1 — initialized to defaults in Phase 0
    pub filer_fee_paid: U256,          // = U256::zero() in Phase 0
    pub filer_fee_currency: Currency,  // = Currency::default() in Phase 0
    pub fee_reimbursed: bool,          // = false in Phase 0
}

pub enum DisputeStatus {
    Filed,
    UnderReview,
    Resolved,
    // Expired added in Phase 1
}

pub struct DisputeOutcome {
    pub release_to_tenant: U256,
    pub release_to_landlord: U256,
    pub rationale_hash: [u8; 32],
    pub rationale_cid: String,
}
```

**Reserved field rationale:** The reserved field positions (`filer_fee_paid`, `filer_fee_currency`, `fee_reimbursed`) ensure that Phase 1 deployment can extend existing DisputeRecord entries without a storage rewrite. The Phase 1 migration writes default values to these fields for existing Phase 0 records and begins populating them for new records filed under Phase 1 logic.

### 8.0.4 Phase 0 Entry Points

#### 8.0.4.1 file_dispute

```rust
ENTRY: file_dispute(
    lease_id: u64,
    disputed_amount: U256,
    evidence_cid: String,
    reason_hash: [u8; 32],
) -> Result<u64, DisputeError>

/// Either tenant or landlord may file. Reverts if:
///   - lease_id does not exist
///   - caller is not tenant or landlord of the lease
///   - dispute already active for lease_id
///   - disputed_amount == 0
///   - disputed_amount > DepositVault.available_funds (v1.3.1 Critical #2)
/// On success:
///   - Increment dispute_counter, assign dispute_id
///   - Construct DisputeRecord with caller as plaintiff, other party as defendant
///   - Set status = Filed
///   - Store DisputeRecord in disputes dict; map lease_id -> dispute_id
///   - Call DepositVault.on_dispute_filed(lease_id, dispute_id)
///   - Emit DisputeFiledEvent
///   - NO dispute filing fee in Phase 0 (deferred to Phase 1 via PaymentRouter
///     process_dispute_filing dispatcher)
fn file_dispute(...) -> Result<u64, DisputeError> {
    // 1. Validate caller is tenant or landlord of lease_id
    let lease = lease_contract.get_lease(lease_id)?;
    let caller = get_caller();
    require!(caller == lease.tenant || caller == lease.landlord);

    // 2. Validate no active dispute for this lease
    require!(lease_to_dispute.get(lease_id).is_none());

    // 3. Validate disputed_amount
    require!(disputed_amount > U256::zero());
    let available = deposit_vault.available_funds(lease_id)?;
    require!(disputed_amount <= available);

    // 4. Construct DisputeRecord
    let dispute_id = increment_counter();
    let (plaintiff, defendant) = if caller == lease.tenant {
        (lease.tenant, lease.landlord)
    } else {
        (lease.landlord, lease.tenant)
    };

    let record = DisputeRecord {
        dispute_id,
        lease_id,
        lease_contract: get_lease_contract_address(lease_id),  // singleton or per-lease
        deposit_vault: deposit_vault.address(),
        tenant: lease.tenant,
        landlord: lease.landlord,
        plaintiff,
        defendant,
        reason_hash,
        evidence_cid,
        disputed_amount,
        filed_time_ms: env::get_block_time(),
        resolution_deadline_ms: env::get_block_time() + RESOLUTION_WINDOW_MS,
        status: DisputeStatus::Filed,
        outcome: None,
        resolution_time_ms: None,
        resolution_evidence_cid: None,

        // Phase 1 reserved fields — defaults in Phase 0
        filer_fee_paid: U256::zero(),
        filer_fee_currency: Currency::default(),
        fee_reimbursed: false,
    };

    // 5. Store and notify
    disputes.insert(dispute_id, record);
    lease_to_dispute.insert(lease_id, Some(dispute_id));
    deposit_vault.on_dispute_filed(lease_id, dispute_id)?;

    emit DisputeFiledEvent { dispute_id, lease_id, plaintiff, defendant, disputed_amount };

    Ok(dispute_id)
}
```

#### 8.0.4.2 resolve_dispute

```rust
ENTRY: resolve_dispute(
    dispute_id: u64,
    outcome: DisputeOutcome,
) -> Result<(), DisputeError>

/// Arbitrator-only. Reverts if:
///   - caller is not the registered arbitrator
///   - dispute_id does not exist
///   - dispute status is not Filed or UnderReview
///   - outcome.release_to_tenant + outcome.release_to_landlord != disputed_amount
/// On success:
///   - Update DisputeRecord with outcome, resolution_time_ms, status = Resolved
///   - Call DepositVault.on_dispute_resolved(lease_id, dispute_id, outcome)
///   - Clear lease_to_dispute mapping for lease_id
///   - Emit DisputeResolvedEvent
fn resolve_dispute(dispute_id, outcome) -> Result<(), DisputeError> {
    require!(get_caller() == arbitrator);

    let mut record = disputes.get(dispute_id)?;
    require!(matches!(record.status, DisputeStatus::Filed | DisputeStatus::UnderReview));

    // Validate outcome sums to disputed_amount
    require!(
        outcome.release_to_tenant + outcome.release_to_landlord
            == record.disputed_amount
    );

    record.outcome = Some(outcome.clone());
    record.resolution_time_ms = Some(env::get_block_time());
    record.status = DisputeStatus::Resolved;
    record.resolution_evidence_cid = Some(outcome.rationale_cid.clone());

    disputes.insert(dispute_id, record.clone());
    deposit_vault.on_dispute_resolved(record.lease_id, dispute_id, outcome)?;
    lease_to_dispute.insert(record.lease_id, None);

    emit DisputeResolvedEvent {
        dispute_id,
        lease_id: record.lease_id,
        release_to_tenant: outcome.release_to_tenant,
        release_to_landlord: outcome.release_to_landlord,
    };

    Ok(())
}
```

### 8.0.5 Phase 0 Invariants and Test Requirements

**Invariants:**

- After `file_dispute` succeeds: `disputes[dispute_id]` exists with `status == Filed`; `lease_to_dispute[lease_id] == Some(dispute_id)`; `deposit_vault.active_dispute_id(lease_id) == Some(dispute_id)`; `deposit_vault.auto_release_blocked(lease_id) == true`.
- After `resolve_dispute` succeeds: `disputes[dispute_id].status == Resolved`; `disputes[dispute_id].outcome.is_some()`; `lease_to_dispute[lease_id] == None`; `deposit_vault.active_dispute_id(lease_id) == None`; DepositVault has released `outcome.release_to_tenant` to tenant address and `outcome.release_to_landlord` to landlord address.
- For any DisputeRecord in Phase 0: `filer_fee_paid == U256::zero()` AND `fee_reimbursed == false`.

**Test requirements (Phase 0 integration tests):**

- file_dispute happy path (tenant files): dispute recorded, vault blocked, no fee charged
- file_dispute happy path (landlord files): same, with landlord as plaintiff
- file_dispute reverts: nonexistent lease, non-party caller, double-filing, zero amount, disputed_amount > available_funds
- resolve_dispute happy path: arbitrator splits 60/40 — DepositVault releases correctly to both parties; lease_to_dispute cleared
- resolve_dispute reverts: non-arbitrator caller, nonexistent dispute, already-resolved dispute, outcome sums not equal to disputed_amount

### 8.0.6 Phase 0 → Phase 1 Migration

Phase 1 deployment will:

1. Deploy updated DisputeModule contract code adding the Phase 1 entry points (`set_win_threshold_bps`, `set_arbitrator`, `migrate_to_governor`) and storage keys (`compliance_officer`, `win_threshold_bps`, `phase_lock`, `is_migrated`, `governance_migrator`).
2. Add `Expired` variant to `DisputeStatus` enum (existing Phase 0 disputes retain Filed/UnderReview/Resolved as appropriate; Expired only set on disputes filed under Phase 1 that pass resolution deadline).
3. Activate DisputeFiling FeeSource: DisputeModule.file_dispute begins calling PaymentRouter.process_dispute_filing for new disputes. Existing Phase 0 DisputeRecords are not retroactively fee-charged.
4. Activate loser-pays reimbursement logic in resolve_dispute: when filer's payout (`release_to_plaintiff`) meets `win_threshold_bps` of `disputed_amount`, DepositVault reduces respondent payout by `filer_fee_paid` and increases plaintiff payout by the same. Phase 0 DisputeRecords have `filer_fee_paid == 0` so the reimbursement is a no-op for them.

---

## §11.6 Atomic Rollback Test Plan — Phase 0 / Phase 1 Applicability [DIFF]

### Current

> *(Current SC Spec v1.4.4 §11.6 enumerates eight atomic rollback tests. Existing text retained.)*

### Amended (insertion)

> **Phase 0 / Phase 1 applicability:**
>
> All eight atomic rollback tests in this section must pass as a Phase 0 mainnet acceptance criterion per PRD §4.7.0. Phase 1 deployment of the full DisputeModule introduces additional code paths for `process_dispute_filing` invocation and loser-pays reimbursement; Phase 1 acceptance criteria per PRD §4.7.1 require: (a) the eight Phase 0 tests still pass with Phase 1 changes applied, and (b) any new atomic rollback test cases introduced by full DisputeModule additions pass (specifically: dispute filing fee atomic with DisputeRecord creation; loser-pays reimbursement atomic with deposit release).

---

## Cross-references and follow-up

This amendment requires consistent changes in:

- **PRD v2.4.4** §4 (Phasing), §4.4.4 (Concessions), §4.7 (Acceptance Criteria), FR-1.4.3.5 (DisputeModule), FR-1.4.3.3 (Lease) — see PRD Amendment v1
- **Whitepaper v4.5.5** §4.3, §4.4, §7, §8.6, §5.2 — see Whitepaper Amendment v1
- **Preflight Checklist v1.1** §11 (engineering phases) — phase plan should be updated to reflect Phase 0 vs Phase 1 work split; specifically:
  - Phase A-D engineering work (existing §11.2-§11.5) targets Phase 0 mainnet
  - Phase E (Integrated Triplet, existing §11.6) targets Phase 0 mainnet with minimal DisputeModule
  - Phase F (Pre-Audit Hardening, existing §11.7) targets Phase 0 audit submission
  - New Phase G (post-pilot Phase 1 prep) added for full DisputeModule and any pilot-feedback-driven changes
- **Preflight Checklist v1.1** §12.1 — note that Phase 1.1 PaymentRouter deferral is **not selected**; PaymentRouter ships in Phase 0 per ADR-006

---

**Approval workflow:**

1. Founder (Tony) — draft owner, this document
2. Engineering Lead — review for implementation feasibility, field reservation soundness, migration correctness
3. Prospective audit firm contact — review for Phase 0 audit scope and minimal DisputeModule audit requirements
4. Founder — incorporate review feedback, prepare v1.5.0 of SC Spec for publication
