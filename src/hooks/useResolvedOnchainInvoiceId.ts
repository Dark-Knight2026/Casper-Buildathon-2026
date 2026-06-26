/**
 * Resolves an invoice's on-chain escrow id (§3.5b FE fallback).
 *
 * Normally the backend indexer binds `onchainInvoiceId` from the escrow
 * `InvoiceCreated` event. When that binding is missing (indexer not run, or its
 * backfill can't match the synthetic deploy hash), the id is read **directly
 * from the chain**: the lease's `create_lease_agreement` deploy carries one
 * `InvoiceCreated` per invoice, in the contract's creation order (deposit first,
 * then rent by month). Sorting the lease's invoices the same way and matching by
 * position recovers each invoice's id — letting the tenant pay before the
 * indexer catches up.
 *
 * Prefer the backend value when present; the derived path is the fallback.
 */

import { useQuery } from '@tanstack/react-query';

import { getLease } from '@/services/leaseService';
import { listInvoices } from '@/services/invoiceService';
import { extractLeaseCommitIds } from '@/lib/casper/leaseAgreementEvents';
import type { Invoice } from '@/types/invoiceContract';

/** Contract invoice-creation order: security deposit first, then rent by deadline. */
function orderForChain(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) => {
    const aDeposit = a.kind === 'security-deposit' ? 0 : 1;
    const bDeposit = b.kind === 'security-deposit' ? 0 : 1;
    if (aDeposit !== bDeposit) return aDeposit - bDeposit;
    return a.deadline.localeCompare(b.deadline);
  });
}

async function resolveOnchainInvoiceId(
  invoice: Invoice
): Promise<string | null> {
  if (invoice.onchainInvoiceId) return invoice.onchainInvoiceId;

  // Derive from the lease's commit deploy.
  const lease = await getLease(invoice.leaseId);
  if (!lease.commitTxHash) return null;

  const { invoiceIds } = await extractLeaseCommitIds(lease.commitTxHash);
  if (invoiceIds.length === 0) return null;

  // Position this invoice within its lease's invoices, ordered as the contract
  // created them, then read the id at that index.
  const { data: leaseInvoices } = await listInvoices({
    leaseId: invoice.leaseId,
    pageSize: 100,
  });
  const index = orderForChain(leaseInvoices).findIndex(
    (i) => i.id === invoice.id
  );
  if (index < 0 || index >= invoiceIds.length) return null;
  return invoiceIds[index];
}

/**
 * The invoice's on-chain id — the backend value if bound, otherwise derived from
 * the chain. `null` while loading or when it can't be determined yet.
 */
export function useResolvedOnchainInvoiceId(invoice: Invoice) {
  return useQuery({
    queryKey: [
      'resolved-onchain-invoice-id',
      invoice.id,
      invoice.onchainInvoiceId,
    ],
    queryFn: () => resolveOnchainInvoiceId(invoice),
    staleTime: 5 * 60_000,
  });
}
