import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ViewingStatusBadge } from '@/components/viewing/ViewingStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { getListing } from '@/services/listingService';
import {
  getListingViewings,
  updateViewingStatus,
  type ViewingStatus,
} from '@/services/viewingService';
import { ApiClient } from '@/lib/api-client';

/**
 * Per-listing viewings for the landlord: list + confirm/cancel. The shape only
 * carries the requester id, date/time, status and notes (no denormalised tenant
 * contact) — see docs/api/properties_api.md §7. An all-listings calendar/inbox
 * is a post-hackathon extension.
 */
export default function ListingViewings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: listing } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id as string),
    enabled: !!id,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['listing-viewings', id],
    queryFn: () => getListingViewings(id as string, { pageSize: 100 }),
    enabled: !!id,
  });
  const viewings = data?.data ?? [];

  const update = async (viewingId: string, status: ViewingStatus) => {
    setUpdatingId(viewingId);
    try {
      await updateViewingStatus(id as string, viewingId, status);
      await queryClient.invalidateQueries({
        queryKey: ['listing-viewings', id],
      });
      toast({
        title:
          status === 'confirmed' ? 'Viewing confirmed' : 'Viewing cancelled',
      });
    } catch (error) {
      toast({
        title: 'Could not update the viewing',
        description: ApiClient.handleError(error),
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/landlord/properties/${id}`)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Property
      </Button>
      <h1 className="text-3xl font-bold mb-1">Viewings</h1>
      <p className="text-muted-foreground mb-6">
        {listing?.title ?? 'Listing'}
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Couldn't load viewings. Please try again.
          </p>
        </Card>
      ) : viewings.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No viewings booked</h3>
          <p className="text-muted-foreground">
            Viewing requests from tenants will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {viewings.map((viewing) => {
            // Compare date-only strings in local time; `new Date('YYYY-MM-DD')`
            // parses as midnight UTC, which flags a same-day viewing as past.
            const isPast =
              viewing.viewingDate < format(new Date(), 'yyyy-MM-dd');
            const isUpdating = updatingId === viewing.id;
            return (
              <Card key={viewing.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(
                          new Date(viewing.viewingDate),
                          'EEEE, MMMM d, yyyy'
                        )}
                      </CardTitle>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Clock className="h-3.5 w-3.5" />
                        {viewing.viewingTime}
                        {isPast && viewing.status !== 'cancelled' && ' · Past'}
                      </p>
                    </div>
                    <ViewingStatusBadge status={viewing.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {viewing.notes && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Notes from tenant</p>
                      <p>{viewing.notes}</p>
                    </div>
                  )}

                  {viewing.status !== 'cancelled' && (
                    <div className="flex gap-2 pt-2 border-t">
                      {viewing.status === 'pending' && (
                        <Button
                          onClick={() => update(viewing.id, 'confirmed')}
                          disabled={isUpdating}
                        >
                          {isUpdating ? 'Saving…' : 'Confirm'}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        onClick={() => update(viewing.id, 'cancelled')}
                        disabled={isUpdating}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
