import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MockMaintenanceRequest } from '@/data/tenantLeases';
import {
  formatDateLong,
  MAINTENANCE_PRIORITY_BADGE,
  MAINTENANCE_STATUS_BADGE,
} from './shared';

export function MaintenanceCard({ request }: { request: MockMaintenanceRequest }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-medium">{request.title}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={MAINTENANCE_PRIORITY_BADGE[request.priority]}>
              {request.priority.toUpperCase()}
            </Badge>
            <Badge className={MAINTENANCE_STATUS_BADGE[request.status]}>
              {request.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Submitted {formatDateLong(request.createdAt)} • Updated {formatDateLong(request.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}
