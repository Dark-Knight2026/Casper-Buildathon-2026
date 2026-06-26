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
    case 'conditional':
      return <Badge className="bg-emerald-500">Conditional</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    case 'under_review':
      return <Badge className="bg-blue-600">Under review</Badge>;
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>;
    case 'pending':
    default:
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Pending
        </Badge>
      );
  }
}
