import { backendClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/queryString';
import type { PaginatedResponse } from '@/types/listingContract';
import type {
  Invoice,
  InvoiceListParams,
  SettlementRequest,
  ReceiptResponse,
  LandlordSummary,
  TenantSummary,
} from '@/types/invoiceContract';

// ───────────────────────────────────────────────────────────────────────────
// LeaseFi backend invoices API (`feat/payment`) — read + settle only.
//
// Invoices are seeded at lease `/commit` and reconciled on-chain by the
// indexer; the FE lists/reads them and records the tenant's `pay_invoice`
// settlement. Wire types live in `invoiceContract.ts`. See FRONTEND_MVP_TASKS
// §3.5b for the full flow (approve → pay_invoice → POST /settlement).
// ───────────────────────────────────────────────────────────────────────────

const INVOICES = '/api/v1/invoices';

// Re-exported so importers source the wire types from this service.
export type {
  Invoice,
  InvoiceKind,
  InvoiceStatus,
  InvoiceSortBy,
  InvoiceListParams,
  SettlementRequest,
  ReceiptResponse,
  LandlordSummary,
  TenantSummary,
} from '@/types/invoiceContract';

/** `GET /invoices`. The caller's invoices (party-scoped), paginated + filtered. */
export async function listInvoices(
  params: InvoiceListParams = {}
): Promise<PaginatedResponse<Invoice>> {
  return backendClient.get<PaginatedResponse<Invoice>>(
    `${INVOICES}${toQueryString({ ...params })}`
  );
}

/** `GET /invoices/{id}`. Detail; readable by the invoice's tenant or landlord. */
export async function getInvoice(id: string): Promise<Invoice> {
  return backendClient.get<Invoice>(`${INVOICES}/${id}`);
}

/**
 * `POST /invoices/{id}/settlement` (tenant). Records the on-chain `pay_invoice`
 * result after the tenant signs + submits it; returns the updated invoice. The
 * indexer reconciles the authoritative on-chain state afterwards.
 */
export async function settleInvoice(
  id: string,
  body: SettlementRequest
): Promise<Invoice> {
  return backendClient.post<Invoice>(`${INVOICES}/${id}/settlement`, body);
}

/** `GET /invoices/{id}/receipt`. Stored receipt URL (null until issued). */
export async function getReceipt(id: string): Promise<ReceiptResponse> {
  return backendClient.get<ReceiptResponse>(`${INVOICES}/${id}/receipt`);
}

/** `GET /invoices/summary?tenantId=me`. Tenant dashboard KPI aggregates. */
export async function getTenantSummary(): Promise<TenantSummary> {
  return backendClient.get<TenantSummary>(
    `${INVOICES}/summary${toQueryString({ tenantId: 'me' })}`
  );
}

/** `GET /invoices/summary?landlordId=me`. Landlord dashboard KPI aggregates. */
export async function getLandlordSummary(): Promise<LandlordSummary> {
  return backendClient.get<LandlordSummary>(
    `${INVOICES}/summary${toQueryString({ landlordId: 'me' })}`
  );
}
