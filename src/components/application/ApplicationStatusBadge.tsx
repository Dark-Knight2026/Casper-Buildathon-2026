import { Badge } from '@/components/ui/badge';
import type { ApplicationStatus } from '@/services/applicationService';

/** Coloured badge for a rental application's review status. */
export function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationStatus;
}) {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-600">Approved</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    case 'pending':
    default:
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Pending
        </Badge>
      );
  }
}
