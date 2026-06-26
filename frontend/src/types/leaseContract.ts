/**
 * Lease wire contract for the `feat/lease-agreement` backend.
 * See `docs/api/agreements_api.md` and `docs/LEASE_AGREEMENT_IMPLEMENTATION_TASKS.md`.
 *
 * The wire format is camelCase on every model, so these types double as both the
 * DTO and the domain shape — no snake_case translation layer is needed.
 *
 * Two facts that differ from the analytics/payments surface:
 *  - Money (`monthlyRent` / `securityDeposit`) is a JSON `number` (f64), NOT a
 *    Decimal-as-string. On-chain ids (`onchainLeaseId` / `nftTokenId`) ARE strings.
 *  - Status enums are kebab-case on the wire.
 *
 * Supersedes the legacy flat `LeaseAgreement` in `src/types/lease.ts`, which is
 * Supabase-era and removed in the cleanup step (LA-20). Do not build new code on it.
 */

// ---------------------------------------------------------------------------
// Enums (kebab-case on the wire)
// ---------------------------------------------------------------------------

/** Lease category — matches the backend `LeaseType` enum. */
export type LeaseType =
  | 'fixed-term'
  | 'month-to-month'
  | 'sublease'
  | 'commercial';

/**
 * Lease lifecycle status (9 variants).
 *
 * Only `draft` is editable/deletable. `under-review`, `pending-approval`,
 * `expired` and `renewed` have NO backend transition on this branch — render
 * them if received, but build no flow that transitions *into* them.
 */
export type LeaseStatus =
  | 'draft'
  | 'pending-signatures'
  | 'under-review'
  | 'pending-approval'
  | 'active'
  | 'expiring-soon'
  | 'expired'
  | 'terminated'
  | 'renewed';

/** Which party is signing — lowercase on the wire. */
export type SignerRole = 'landlord' | 'tenant';

// ---------------------------------------------------------------------------
// Nested shapes
// ---------------------------------------------------------------------------

/** A single lease clause. `category` is free-form (e.g. `rent-payment`). */
export interface Clause {
  title: string;
  content: string;
  category: string;
}

/** Per-party signing progress (off-chain consent recorded by the backend). */
export interface SignatureProgressEntry {
  signed: boolean;
  timestamp: string | null;
}

/**
 * Per-party signing state. The backend only seeds the `landlord`/`tenant`
 * entries on `submit` — a `draft` lease carries an empty `{}`, so both entries
 * are optional.
 */
export interface SignatureProgress {
  landlord?: SignatureProgressEntry;
  tenant?: SignatureProgressEntry;
}

/** The raw Casper-message signature captured per party. */
export interface ConsentSignatureEntry {
  signature: string | null;
  signedAt: string | null;
  /** Public key/address the party signed with (stored by the backend at /sign). */
  signerWallet?: string | null;
}

export interface ConsentSignatures {
  landlord?: ConsentSignatureEntry;
  tenant?: ConsentSignatureEntry;
}

/** Links to the generated and signed lease documents (note the PDF casing). */
export interface DocumentLinks {
  generatedPDF: string | null;
  /** Never written yet (always null on this branch). */
  signedPDF: string | null;
}

// ---------------------------------------------------------------------------
// Lease — the off-chain agreement record
// ---------------------------------------------------------------------------

export interface Lease {
  id: string;
  propertyId: string;
  landlordId: string;
  tenantIds: string[];
  type: LeaseType;
  status: LeaseStatus;
  /** ISO-8601 date (`YYYY-MM-DD`). */
  startDate: string;
  endDate: string;
  /** JSON number (f64) — format for display, do not coerce to string. */
  monthlyRent: number;
  securityDeposit: number;
  currency: string | null;
  propertyManagerId: string | null;
  /** bps; 10000 = 100%; 0 if no manager. */
  propertyManagerBps: number;
  equityPropertyId: string | null;
  clauses: Clause[];
  signatureProgress: SignatureProgress;
  consentSignatures: ConsentSignatures;
  documentLinks: DocumentLinks;
  /** SHA-256 of the PDF; null until on-chain binding lands. */
  documentHash: string | null;
  ipfsCid: string | null;
  /** On-chain bindings — U256 decimal strings, filled after /commit. */
  onchainLeaseId: string | null;
  nftTokenId: string | null;
  commitTxHash: string | null;
  /**
   * Primary tenant's contract-assigned on-chain user id (U256 as string);
   * `null` until the indexer records their on-chain registration. Used to
   * prefill the `create_lease_agreement` tenant id.
   */
  tenantOnchainUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export interface CreateLeaseBody {
  propertyId: string;
  /** Tenant's user_id in the system. */
  tenantId: string;
  type: LeaseType;
  startDate: string;
  /** Duration must be a whole number of 30-day months (`(end - start) % 30d == 0`). */
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  /** e.g. `cUSD` or `CSPR`. */
  currency: string;
  propertyManagerId?: string | null;
  /** 10000 = 100%; 0 if no manager. */
  propertyManagerBps?: number;
  /** lease-to-own; null if none. */
  equityPropertyId?: string | null;
  clauses?: Clause[];
}

/** Draft-only edit (PATCH). All fields optional. */
export type UpdateLeaseBody = Partial<Omit<CreateLeaseBody, 'tenantId'>>;

export interface SignLeaseBody {
  role: SignerRole;
  /** Casper-message signature (hex, algorithm-byte prefixed) of the consent string. */
  signature: string;
  /** Public key/address of the signer; must equal the caller's active wallet. */
  signerWallet: string;
}

export interface CommitLeaseBody {
  /**
   * On-chain ids the frontend reads from the deploy's CES events and reports
   * with the hash. Both are U256 decimal strings and both are required: the
   * backend validates `onchainLeaseId` and reconciles it against the chain
   * (`get_lease_agreement_by_id`) before persisting, so the commit can't be
   * sent until they're read from the confirmed deploy.
   */
  onchainLeaseId: string;
  nftTokenId: string;
  /** Deploy/tx hash of the `create_lease_agreement` call. */
  commitTxHash: string;
  /**
   * `invoice_validity_duration` — seconds the landlord passed into
   * `create_lease_agreement`, used to compute off-chain invoice deadlines. The
   * backend deserializes it as a `u64`, so it must be a JSON number (NOT a
   * decimal string like the U256 ids above).
   */
  invoiceValidityDuration: number;
}

/** Query filters for `GET /api/v1/leases`. */
export interface ListLeasesQuery {
  tenantId?: 'me' | string;
  landlordId?: 'me' | string;
  status?: LeaseStatus;
  page?: number;
  pageSize?: number;
}
