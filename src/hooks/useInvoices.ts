/**
 * React Query hooks for the invoices API (`feat/payment`).
 *
 * Read hooks (`useInvoices`, `useInvoice`, tenant/landlord summaries) feed the
 * payment list + dashboard cards; `useSettleInvoice` records the on-chain
 * `pay_invoice` result and invalidates the affected caches so the UI refreshes
 * while the indexer reconciles the final state. The on-chain signing itself
 * lives in `useInvoicePayment` (P-1.3) — these hooks are the off-chain layer.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  listInvoices,
  getInvoice,
  settleInvoice,
  getTenantSummary,
  getLandlordSummary,
  type Invoice,
  type InvoiceListParams,
  type SettlementRequest,
} from '@/services/invoiceService';

const INVOICES_KEY = 'invoices';

/** `GET /invoices` — the caller's invoices, filtered + paginated. */
export function useInvoices(params: InvoiceListParams = {}) {
  return useQuery({
    queryKey: [INVOICES_KEY, 'list', params],
    queryFn: () => listInvoices(params),
  });
}

/** `GET /invoices/{id}` — a single invoice (enabled only with an id). */
export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [INVOICES_KEY, 'detail', id],
    queryFn: () => getInvoice(id as string),
    enabled: Boolean(id),
  });
}

/** `GET /invoices/summary?tenantId=me` — tenant dashboard KPI aggregates. */
export function useTenantInvoiceSummary() {
  return useQuery({
    queryKey: [INVOICES_KEY, 'summary', 'tenant'],
    queryFn: getTenantSummary,
  });
}

/** `GET /invoices/summary?landlordId=me` — landlord dashboard KPI aggregates. */
export function useLandlordInvoiceSummary() {
  return useQuery({
    queryKey: [INVOICES_KEY, 'summary', 'landlord'],
    queryFn: getLandlordSummary,
  });
}

/**
 * `POST /invoices/{id}/settlement` — record the tenant's `pay_invoice` result.
 * Writes the authoritative updated invoice straight into the detail cache, and
 * invalidates only the lists + summaries (not detail — that would refetch and
 * discard the optimistic write) so the dashboard reflects the change while the
 * indexer confirms.
 */
export function useSettleInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SettlementRequest }) =>
      settleInvoice(id, body),
    onSuccess: (updated: Invoice) => {
      queryClient.setQueryData([INVOICES_KEY, 'detail', updated.id], updated);
      void queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, 'list'] });
      void queryClient.invalidateQueries({
        queryKey: [INVOICES_KEY, 'summary'],
      });
    },
  });
}
