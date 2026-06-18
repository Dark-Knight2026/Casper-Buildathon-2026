import { useQuery } from '@tanstack/react-query';
import { getListingViewings } from '@/services/viewingService';

/**
 * Whether a listing has any `pending` (un-actioned) viewing request — drives the
 * red dot on the property-detail "Viewings" button.
 *
 * The backend's per-listing viewings endpoint has no status filter, so we fetch
 * the listing's viewings (MVP-capped at 100, like the other landlord lists) and
 * check client-side. Per-listing only — there is no landlord-wide viewings
 * endpoint, so this is scoped to the property already on screen. Polls so the
 * dot appears/clears without a manual refresh.
 */
export function useHasPendingViewings(listingId: string | undefined): boolean {
  const { data } = useQuery({
    queryKey: ['listing-viewings-pending', listingId],
    queryFn: () => getListingViewings(listingId as string, { pageSize: 100 }),
    enabled: Boolean(listingId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  return (data?.data ?? []).some((viewing) => viewing.status === 'pending');
}
