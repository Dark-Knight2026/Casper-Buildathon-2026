/**
 * Recent Payments Widget
 * Displays recent payment transactions
 */

import { useQuery } from '@tanstack/react-query';
import { paymentService } from '@/services/paymentService';
import { format } from 'date-fns';
import { DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function RecentPaymentsWidget() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', 'recent'],
    queryFn: () => paymentService.getAll({ limit: 5 }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <DollarSign className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No recent payments</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{payment.property_name}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(payment.payment_date), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">${payment.amount.toLocaleString()}</span>
            <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
              {payment.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}