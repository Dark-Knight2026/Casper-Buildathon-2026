/**
 * Renewal wire contract for the `feat/lease-agreement` backend.
 * See `docs/api/agreements_api.md` §4 and `docs/LEASE_AGREEMENT_IMPLEMENTATION_TASKS.md`.
 *
 * camelCase on the wire; money (`proposedRent`) is a JSON `number` (f64).
 * Status enums are kebab-case. The renewal carries a single `tenantId` (unlike
 * the lease's `tenantIds[]`).
 *
 * Supersedes the legacy Supabase-era shapes in `src/services/renewalService.ts`
 * and `src/types/renewal.ts`, removed in the cleanup step (LA-20).
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * Renewal lifecycle status (7 variants).
 *
 * `draft`, `under-review` and `expired` have no setter on this branch —
 * display-only.
 */
export type RenewalStatus =
  | 'draft'
  | 'sent'
  | 'under-review'
  | 'accepted'
  | 'rejected'
  | 'countered'
  | 'expired';

/** Tenant's response to an offer — lowercase on the wire. */
export type RenewalDecision = 'accept' | 'reject' | 'counter';

/** Negotiation entry kind — kebab-case on the wire. */
export type NegotiationKind = 'message' | 'counter-offer';

// ---------------------------------------------------------------------------
// Nested shapes
// ---------------------------------------------------------------------------

/** Terms proposed in a counter — `proposedRent` is a JSON number. */
export interface CounterOffer {
  proposedRent: number;
  proposedTermMonths: number;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Renewal — the off-chain offer record
// ---------------------------------------------------------------------------

export interface Renewal {
  id: string;
  leaseId: string;
  landlordId: string;
  tenantId: string;
  proposedRent: number;
  proposedTermMonths: number;
  /** ISO-8601 date (`YYYY-MM-DD`). */
  proposedStartDate: string;
  rentIncreaseReason: string | null;
  responseDeadline: string | null;
  status: RenewalStatus;
  /** Present once the tenant counters; separate from the negotiation thread. */
  counterOffer: CounterOffer | null;
  createdAt: string;
  updatedAt: string;
}

/** One append-only entry in the negotiation thread. */
export interface Negotiation {
  id: string;
  renewalId: string;
  authorId: string;
  kind: NegotiationKind;
  /** Present for `kind: 'message'`. */
  body: string | null;
  /** Present for `kind: 'counter-offer'`. */
  proposedTerms: CounterOffer | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export interface CreateRenewalBody {
  leaseId: string;
  proposedRent: number;
  proposedTermMonths: number;
  proposedStartDate: string;
  rentIncreaseReason?: string | null;
  responseDeadline?: string | null;
}

export interface RespondRenewalBody {
  decision: RenewalDecision;
  /** Required when `decision === 'counter'`. */
  counterOffer?: CounterOffer;
}

export interface PostNegotiationBody {
  kind: NegotiationKind;
  /** For `kind: 'message'`. */
  body?: string;
  /** For `kind: 'counter-offer'`. */
  proposedTerms?: CounterOffer;
}

/** Query filters for `GET /api/v1/renewals`. */
export interface ListRenewalsQuery {
  tenantId?: 'me' | string;
  landlordId?: 'me' | string;
  status?: RenewalStatus;
}
