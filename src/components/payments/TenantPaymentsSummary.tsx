/**
 * Tenant dashboard payments summary (§3.5b, P-3.2) — KPI cards from
 * `GET /invoices/summary?tenantId=me` with a Pay CTA on the next-due invoice.
 * Replaces the legacy `MOCK_PAYMENTS` block on the tenant dashboard.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTenantInvoiceSummary } from '@/hooks/useInvoices';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InvoiceStatusBadge } from '@/components/payments/InvoiceStatusBadge';
import { PayInvoiceDialog } from '@/components/payments/PayInvoiceDialog';
import { LEASE_CURRENCY } from '@/lib/leaseCurrency';
import { formatLeaseDate } from '@/lib/leaseDisplay';
import type { Invoice, InvoiceStatus } from '@/types/invoiceContract';

const fmt = (amount: string) =>
  `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${LEASE_CURRENCY.symbol}`;

// Already settled/closed — no payment possible; everything else is offered
// (the dialog resolves the on-chain id, deriving it if the indexer is behind).
const SETTLED: InvoiceStatus[] = ['paid', 'released', 'refunded', 'cancelled'];

export function TenantPaymentsSummary() {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useTenantInvoiceSummary();
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);

  const nextDue = summary?.nextDue ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payments</CardTitle>
            <CardDescription>
              Deposit &amp; rent, paid in {LEASE_CURRENCY.symbol}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/tenant/payments')}
          >
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : !summary ? (
          <p className="text-sm text-muted-foreground">
            Couldn’t load your payment summary.
          </p>
        ) : (
          <>
            {nextDue ? (
              <NextDueRow
                invoice={nextDue}
                onPay={() => setPayInvoice(nextDue)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                You’re all caught up — nothing due right now.
              </p>
            )}
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Balance due" value={fmt(summary.balanceDue)} />
              <Stat label="Paid this year" value={fmt(summary.paidYtd)} />
              <Stat label="Deposit held" value={fmt(summary.depositHeld)} />
            </div>
          </>
        )}
      </CardContent>

      {payInvoice && (
        <PayInvoiceDialog
          invoice={payInvoice}
          open
          onOpenChange={(open) => {
            if (!open) setPayInvoice(null);
          }}
        />
      )}
    </Card>
  );
}

function NextDueRow({
  invoice,
  onPay,
}: {
  invoice: Invoice;
  onPay: () => void;
}) {
  const canPay = !SETTLED.includes(invoice.status);
  const kind =
    invoice.kind === 'security-deposit' ? 'Security deposit' : 'Rent';

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Next due — {kind}</span>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {fmt(invoice.amountDue)} · due {formatLeaseDate(invoice.deadline)}
        </p>
      </div>
      {canPay ? (
        <Button size="sm" onClick={onPay}>
          Pay now
        </Button>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">
          Preparing…
        </span>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-base font-semibold">{value}</p>
    </div>
  );
}
