import { Badge } from '@/components/ui/badge';
import type { ViewingStatus } from '@/services/viewingService';

/** Coloured badge for a viewing's status. */
export function ViewingStatusBadge({ status }: { status: ViewingStatus }) {
  switch (status) {
    case 'confirmed':
      return <Badge className="bg-green-600">Confirmed</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'pending':
    default:
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Pending
        </Badge>
      );
  }
}
