/**
 * Maintenance Widget
 * Displays maintenance requests summary
 */

import { useQuery } from '@tanstack/react-query';
import { maintenanceService } from '@/services/maintenanceService';
import { Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export function MaintenanceWidget() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ['maintenance', 'recent'],
    queryFn: () => maintenanceService.getAll({ limit: 5 }),
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

  if (!requests || requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Wrench className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No maintenance requests</p>
      </div>
    );
  }

  const statusColors: Record<string, BadgeVariant> = {
    pending: 'secondary',
    'in-progress': 'default',
    completed: 'outline',
  };

  return (
    <div className="space-y-2">
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{request.title}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(request.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <Badge variant={statusColors[request.status] || 'secondary'}>
            {request.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}