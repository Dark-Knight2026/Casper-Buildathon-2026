/**
 * Tenant Payments (§3.5b, P-3.1) — the tenant's deposit + rent invoices from the
 * Rust backend (`GET /invoices?tenantId=me`), grouped **by lease**. Each lease
 * card shows its term + rent (from `GET /leases?tenantId=me`) and its invoices,
 * ordered overdue → due → paid. Payable invoices open `PayInvoiceDialog`
 * (approve → pay_invoice → settlement); paid ones link to their receipt.
 *
 * Replaces the legacy fiat/Stripe mock (`MOCK_PAYMENTS`) — the crypto invoice
 * model is the MVP payment flow.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Receipt, AlertTriangle } from 'lucide-react';

import { useInvoices } from '@/hooks/useInvoices';
import { listLeases } from '@/services/leaseService';
import { getProperty } from '@/services/propertyAssetService';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvoiceStatusBadge } from '@/components/payments/InvoiceStatusBadge';
import { PayInvoiceDialog } from '@/components/payments/PayInvoiceDialog';
import { LEASE_CURRENCY } from '@/lib/leaseCurrency';
import { formatLeaseDate, formatLeaseMoney } from '@/lib/leaseDisplay';
import type { Invoice, InvoiceStatus } from '@/types/invoiceContract';
import type { Lease } from '@/types/leaseContract';

const fmt = (amount: string) =>
  `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${LEASE_CURRENCY.symbol}`;

const PAID: InvoiceStatus[] = ['paid', 'released', 'refunded'];
// Already settled/closed — no payment possible. Everything else is offered for
// payment (the dialog resolves the on-chain id, deriving it when the indexer
// hasn't bound it yet).
const SETTLED: InvoiceStatus[] = [...PAID, 'cancelled'];

const kindLabel = (invoice: Invoice) =>
  invoice.kind === 'security-deposit' ? 'Security deposit' : 'Rent';

const propertyLabel = (propertyId: string) =>
  `Property ${propertyId.slice(0, 8)}…`;

/** Sort key within a lease (and to order leases): overdue first, paid last. */
function statusRank(status: InvoiceStatus): number {
  if (status === 'overdue') return 0;
  if (PAID.includes(status)) return 2;
  return 1; // scheduled | pending | partial
}

interface LeaseGroupData {
  leaseId: string;
  propertyId: string;
  invoices: Invoice[];
  /** Most-urgent invoice rank in this lease — orders actionable leases first. */
  rank: number;
}

function groupByLease(invoices: Invoice[]): LeaseGroupData[] {
  const byLease = new Map<string, Invoice[]>();
  for (const invoice of invoices) {
    if (invoice.status === 'cancelled') continue; // closed — hidden
    const list = byLease.get(invoice.leaseId) ?? [];
    list.push(invoice);
    byLease.set(invoice.leaseId, list);
  }

  const groups: LeaseGroupData[] = [];
  for (const [leaseId, list] of byLease) {
    list.sort(
      (a, b) =>
        statusRank(a.status) - statusRank(b.status) ||
        a.deadline.localeCompare(b.deadline)
    );
    groups.push({
      leaseId,
      propertyId: list[0].propertyId,
      invoices: list,
      rank: Math.min(...list.map((i) => statusRank(i.status))),
    });
  }

  groups.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.invoices[0].deadline.localeCompare(b.invoices[0].deadline)
  );
  return groups;
}

export function TenantPayments() {
  const { data, isLoading, isError } = useInvoices({
    tenantId: 'me',
    pageSize: 100,
    sortBy: 'deadline',
  });
  // Leases drive the per-lease headers (term + rent); non-blocking enrichment.
  const { data: leasesData } = useQuery({
    queryKey: ['leases', 'list', { tenantId: 'me' }],
    queryFn: () => listLeases({ tenantId: 'me', pageSize: 100 }),
  });

  const invoices = data?.data ?? [];
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);

  const groups = useMemo(() => groupByLease(invoices), [invoices]);
  const leasesById = useMemo(() => {
    const map = new Map<string, Lease>();
    for (const lease of leasesData?.data ?? []) map.set(lease.id, lease);
    return map;
  }, [leasesData]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
          Loading payments…
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Couldn’t load your payments. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Pay your deposit and rent in {LEASE_CURRENCY.symbol}, directly from
          your wallet.
        </p>
      </header>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No invoices yet. They appear here once your lease is active.
          </CardContent>
        </Card>
      ) : (
        groups.map((group) => (
          <LeaseGroup
            key={group.leaseId}
            group={group}
            lease={leasesById.get(group.leaseId)}
            onPay={setPayInvoice}
          />
        ))
      )}

      {payInvoice && (
        <PayInvoiceDialog
          invoice={payInvoice}
          open
          onOpenChange={(open) => {
            if (!open) setPayInvoice(null);
          }}
        />
      )}
    </div>
  );
}

function LeaseGroup({
  group,
  lease,
  onPay,
}: {
  group: LeaseGroupData;
  lease: Lease | undefined;
  onPay: (invoice: Invoice) => void;
}) {
  // Property name + address for a readable header; falls back to the id while
  // loading. Cached, so repeated leases on the same property fetch once.
  const { data: property } = useQuery({
    queryKey: ['property', group.propertyId],
    queryFn: () => getProperty(group.propertyId),
    staleTime: 5 * 60_000,
  });

  // PropertyAsset has no display name — use the street address as the heading.
  const title = property?.addressLine1 || propertyLabel(group.propertyId);
  const place = property
    ? [property.city, property.stateOrProvince].filter(Boolean).join(', ')
    : null;
  const term = lease
    ? `${formatLeaseDate(lease.startDate)} – ${formatLeaseDate(lease.endDate)} · ${formatLeaseMoney(lease.monthlyRent, lease.currency)}/mo`
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          <Link
            to={`/tenant/properties/${group.propertyId}`}
            className="hover:underline"
          >
            {title}
          </Link>
        </CardTitle>
        {(place || term) && (
          <CardDescription>
            {[place, term].filter(Boolean).join(' · ')}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="divide-y p-0">
        {group.invoices.map((invoice) => (
          <InvoiceRow key={invoice.id} invoice={invoice} onPay={onPay} />
        ))}
      </CardContent>
    </Card>
  );
}

function InvoiceRow({
  invoice,
  onPay,
}: {
  invoice: Invoice;
  onPay: (invoice: Invoice) => void;
}) {
  const payable = !SETTLED.includes(invoice.status);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{kindLabel(invoice)}</span>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          Due {formatLeaseDate(invoice.deadline)}
          {invoice.status === 'partial' &&
            ` · ${fmt(invoice.rentPaid)} of ${fmt(invoice.amountDue)} paid`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="font-semibold">{fmt(invoice.amountDue)}</span>
        {payable ? (
          <Button size="sm" onClick={() => onPay(invoice)}>
            Pay
          </Button>
        ) : invoice.receiptUrl ? (
          <a
            href={invoice.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary underline"
          >
            <Receipt className="h-4 w-4" />
            Receipt
          </a>
        ) : null}
      </div>
    </div>
  );
}
