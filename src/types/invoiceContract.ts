// ───────────────────────────────────────────────────────────────────────────
// LeaseFi backend invoices API — wire types (`feat/payment`)
//
// An invoice is the unit of settlement: one rent charge or one security
// deposit. Rows are seeded off-chain at lease `/commit` (`scheduled`), upgraded
// to `pending` once the indexer binds the on-chain `InvoiceCreated` event, then
// reconciled to `partial`/`paid`/`released`/`refunded`. The FE is read + settle
// only. Mirrors the Rust `serde` shapes (camelCase fields; `kind`/`status`/
// `sortBy` are kebab/camel wire forms). Money fields are decimal strings — never
// floats — so USDC precision survives the round-trip.
// ───────────────────────────────────────────────────────────────────────────

/** Whether an invoice is a rent charge or a security deposit (wire: kebab). */
export type InvoiceKind = 'rent' | 'security-deposit';

/**
 * Invoice lifecycle status (wire: kebab).
 *
 * `overdue` is a read-time projection (a `pending`/`partial` invoice past its
 * deadline) — never stored. `pay_invoice` is only callable once the invoice is
 * bound on-chain, i.e. `status ∈ {pending, partial, overdue}` and
 * `onchainInvoiceId != null`.
 */
export type InvoiceStatus =
  | 'scheduled'
  | 'pending'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'released'
  | 'refunded'
  | 'cancelled';

/**
 * Terminal invoice statuses — settled/closed, so no further payment is possible.
 * Single source of truth shared by the payment views (was duplicated per file).
 */
export const SETTLED_STATUSES: readonly InvoiceStatus[] = [
  'paid',
  'released',
  'refunded',
  'cancelled',
];

/** Whether an invoice status is settled/closed (no payment possible). */
export function isSettled(status: InvoiceStatus): boolean {
  return SETTLED_STATUSES.includes(status);
}

/** Sort key for `GET /invoices` (default `deadline`, soonest first). */
export type InvoiceSortBy = 'deadline' | 'amountDue' | 'status';

/** An invoice (public wire shape). */
export interface Invoice {
  id: string;
  /** Escrow U256 invoice id (decimal string); null until bound on-chain. */
  onchainInvoiceId: string | null;
  leaseId: string;
  kind: InvoiceKind;
  tenantId: string;
  landlordId: string;
  propertyId: string;
  /** Total amount due (USDC decimal string). */
  amountDue: string;
  /** Partial-payment progress (rent only; `"0"` otherwise), USDC decimal string. */
  rentPaid: string;
  propertyManagerId: string | null;
  /** Manager rent share in basis points (10000 = 100%). */
  propertyManagerBps: number;
  /** Effective status (`overdue` derived on read). */
  status: InvoiceStatus;
  /** Payment deadline, `YYYY-MM-DD`. */
  deadline: string;
  /** Amount kept by the landlord on deposit release; null otherwise. */
  landlordCharge: string | null;
  /** Amount returned to the tenant on deposit release; null otherwise. */
  tenantRefund: string | null;
  /** Settlement deploy hash; null until paid. */
  txHash: string | null;
  /** Receipt URL; null until issued. */
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Query for `GET /invoices`: party scope (`'me'`) plus optional filters. */
export interface InvoiceListParams {
  /** `'me'` to include invoices where the caller is the tenant. */
  tenantId?: 'me';
  /** `'me'` to include invoices where the caller is the landlord. */
  landlordId?: 'me';
  leaseId?: string;
  kind?: InvoiceKind;
  status?: InvoiceStatus;
  propertyId?: string;
  /** Only invoices with `deadline >=` this date (`YYYY-MM-DD`). */
  dueFrom?: string;
  /** Only invoices with `deadline <=` this date (`YYYY-MM-DD`). */
  dueTo?: string;
  sortBy?: InvoiceSortBy;
  page?: number;
  pageSize?: number;
}

/**
 * Tenant settlement of an invoice (Option A): the tenant signed + submitted
 * `pay_invoice` via CSPR.click and reports the result here.
 */
export interface SettlementRequest {
  /**
   * Amount paid by this settlement (USDC decimal string). For rent this is a
   * partial or full instalment; for a deposit it must equal `amountDue`.
   */
  amount: string;
  /** Deploy/tx hash of the on-chain `pay_invoice` call. */
  txHash: string;
}

/** Receipt link for an invoice. */
export interface ReceiptResponse {
  receiptUrl: string | null;
}

/** Landlord dashboard aggregates. Money figures are USDC decimal strings. */
export interface LandlordSummary {
  rentReceivedMtd: string;
  monthlyRentDue: string;
  overdueCount: number;
  overdueAmount: string;
  depositsHeld: string;
}

/** Tenant dashboard aggregates. Money figures are USDC decimal strings. */
export interface TenantSummary {
  /** The next payable invoice (soonest unpaid by deadline), if any. */
  nextDue: Invoice | null;
  balanceDue: string;
  paidYtd: string;
  depositHeld: string;
}
