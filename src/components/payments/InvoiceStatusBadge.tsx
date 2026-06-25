/** Status pill for an invoice, shared by the payments list and detail (§3.5b). */

import { Badge } from '@/components/ui/badge';
import type { InvoiceStatus } from '@/types/invoiceContract';

const STATUS: Record<InvoiceStatus, { label: string; className: string }> = {
  scheduled: {
    label: 'Preparing',
    className: 'bg-secondary text-secondary-foreground',
  },
  pending: { label: 'Due', className: 'bg-amber-100 text-amber-800' },
  partial: { label: 'Partially paid', className: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-800' },
  released: { label: 'Released', className: 'bg-green-100 text-green-800' },
  refunded: { label: 'Refunded', className: 'bg-green-100 text-green-800' },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-secondary text-secondary-foreground',
  },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = STATUS[status];
  return <Badge className={className}>{label}</Badge>;
}
