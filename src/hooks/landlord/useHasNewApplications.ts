import { useQuery } from '@tanstack/react-query';
import { getLandlordApplications } from '@/services/applicationService';

/**
 * Whether the landlord has any `pending` (submitted, not-yet-reviewed)
 * application — drives the red "new" dot in the nav.
 *
 * `pageSize: 1` fetches a single row; we only read whether the total is > 0, so
 * nothing is counted client-side. Polls so the dot appears/clears without a
 * manual refresh, and refetches on window focus.
 */
export function useHasNewApplications(): boolean {
  const { data } = useQuery({
    queryKey: ['landlord-applications-count', 'pending'],
    queryFn: () => getLandlordApplications({ status: 'pending', pageSize: 1 }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  return (data?.itemCount ?? 0) > 0;
}
