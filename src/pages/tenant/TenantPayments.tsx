/**
 * Tenant Payments (§3.5b, P-3.1) — the tenant's deposit + rent invoices from the
 * Rust backend (`GET /invoices?tenantId=me`), grouped Overdue / Due / Paid. Each
 * payable invoice opens `PayInvoiceDialog` (approve → pay_invoice → settlement);
 * paid ones link to their receipt.
 *
 * Replaces the legacy fiat/Stripe mock (`MOCK_PAYMENTS`) — the crypto invoice
 * model is the MVP payment flow.
 */

import { useMemo, useState } from 'react';
import { Loader2, Receipt, AlertTriangle } from 'lucide-react';

import { useInvoices } from '@/hooks/useInvoices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvoiceStatusBadge } from '@/components/payments/InvoiceStatusBadge';
import { PayInvoiceDialog } from '@/components/payments/PayInvoiceDialog';
import { LEASE_CURRENCY } from '@/lib/leaseCurrency';
import { formatLeaseDate } from '@/lib/leaseDisplay';
import type { Invoice, InvoiceStatus } from '@/types/invoiceContract';

const fmt = (amount: string) =>
  `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${LEASE_CURRENCY.symbol}`;

const PAYABLE: InvoiceStatus[] = ['pending', 'partial', 'overdue'];
const PAID: InvoiceStatus[] = ['paid', 'released', 'refunded'];

const kindLabel = (invoice: Invoice) =>
  invoice.kind === 'security-deposit' ? 'Security deposit' : 'Rent';

function bucket(invoices: Invoice[]) {
  const overdue: Invoice[] = [];
  const due: Invoice[] = [];
  const paid: Invoice[] = [];
  for (const invoice of invoices) {
    if (invoice.status === 'overdue') overdue.push(invoice);
    else if (invoice.status === 'cancelled')
      continue; // closed — hidden
    else if (PAID.includes(invoice.status)) paid.push(invoice);
    else due.push(invoice); // scheduled | pending | partial
  }
  return { overdue, due, paid };
}

export function TenantPayments() {
  const { data, isLoading, isError } = useInvoices({
    tenantId: 'me',
    pageSize: 100,
    sortBy: 'deadline',
  });
  const invoices = data?.data ?? [];
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);

  const groups = useMemo(() => bucket(invoices), [invoices]);

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

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No invoices yet. They appear here once your lease is active.
          </CardContent>
        </Card>
      ) : (
        <>
          <InvoiceGroup
            title="Overdue"
            invoices={groups.overdue}
            onPay={setPayInvoice}
          />
          <InvoiceGroup
            title="Due"
            invoices={groups.due}
            onPay={setPayInvoice}
          />
          <InvoiceGroup
            title="Paid"
            invoices={groups.paid}
            onPay={setPayInvoice}
          />
        </>
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

function InvoiceGroup({
  title,
  invoices,
  onPay,
}: {
  title: string;
  invoices: Invoice[];
  onPay: (invoice: Invoice) => void;
}) {
  if (invoices.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {title}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({invoices.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {invoices.map((invoice) => (
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
  const payable =
    Boolean(invoice.onchainInvoiceId) && PAYABLE.includes(invoice.status);
  const isScheduled =
    invoice.status === 'scheduled' || !invoice.onchainInvoiceId;

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
        ) : isScheduled ? (
          <span className="text-xs text-muted-foreground">Preparing…</span>
        ) : null}
      </div>
    </div>
  );
}
