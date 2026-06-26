/**
 * Lease Renewals Widget
 * Displays upcoming lease renewals
 */

import { useQuery } from '@tanstack/react-query';
import { leaseService } from '@/services/leaseService';
import { FileText, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';

export function LeaseRenewalsWidget() {
  const { data: leases, isLoading } = useQuery({
    queryKey: ['leases', 'expiring'],
    queryFn: async () => {
      const allLeases = await leaseService.getAll();
      // Filter leases expiring within 90 days
      const now = new Date();
      return allLeases.filter((lease) => {
        const endDate = new Date(lease.end_date);
        const daysUntilExpiry = differenceInDays(endDate, now);
        return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
      });
    },
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

  if (!leases || leases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <FileText className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No upcoming renewals</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leases.slice(0, 5).map((lease) => {
        const daysUntilExpiry = differenceInDays(new Date(lease.end_date), new Date());
        const urgency = daysUntilExpiry <= 30 ? 'destructive' : daysUntilExpiry <= 60 ? 'default' : 'secondary';

        return (
          <div
            key={lease.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{lease.property_address}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(lease.end_date), 'MMM d, yyyy')}
              </p>
            </div>
            <Badge variant={urgency}>
              {daysUntilExpiry} days
            </Badge>
          </div>
        );
      })}
    </div>
  );
}