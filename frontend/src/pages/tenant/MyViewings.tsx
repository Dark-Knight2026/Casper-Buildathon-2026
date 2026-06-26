import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  cancelViewing,
  getMyViewings,
  type Viewing,
} from '@/services/viewingService';
import { formatFullAddress } from '@/lib/listingDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ViewingStatusBadge } from '@/components/viewing/ViewingStatusBadge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Calendar, Clock, MapPin, X } from 'lucide-react';
import { format } from 'date-fns';

export default function MyViewings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewingToCancel, setViewingToCancel] = useState<Viewing | null>(null);

  useEffect(() => {
    if (!user) navigate('/auth/login');
  }, [user, navigate]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-viewings'],
    queryFn: () => getMyViewings({ pageSize: 100 }),
    enabled: !!user,
  });
  const viewings = data?.data ?? [];

  const cancelMutation = useMutation({
    mutationFn: (viewing: Viewing) =>
      cancelViewing(viewing.listingId, viewing.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-viewings'] });
      toast({
        title: 'Viewing cancelled',
        description: 'Your viewing appointment has been cancelled.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to cancel viewing. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => setViewingToCancel(null),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading viewings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Viewings
              </h1>
              <p className="text-gray-600">
                {viewings.length}{' '}
                {viewings.length === 1 ? 'viewing' : 'viewings'} scheduled
              </p>
            </div>
            <Button onClick={() => navigate('/tenant/property-search')}>
              Browse Properties
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isError ? (
          <p className="text-center text-muted-foreground py-12">
            Couldn't load your viewings. Please try again.
          </p>
        ) : viewings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No viewings scheduled
            </h2>
            <p className="text-gray-600 mb-6">
              Start browsing properties and schedule viewings to see them here.
            </p>
            <Button onClick={() => navigate('/tenant/property-search')}>
              Browse Properties
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {viewings.map((viewing) => {
              const listing = viewing.listing;
              const address = formatFullAddress(listing?.property);
              // Compare date-only strings in local time; `new Date('YYYY-MM-DD')`
              // parses as midnight UTC, which flags a same-day viewing as past.
              const isPast =
                viewing.viewingDate < format(new Date(), 'yyyy-MM-dd');
              const canCancel = viewing.status === 'pending' && !isPast;
              const isCancelling =
                cancelMutation.isPending &&
                cancelMutation.variables?.id === viewing.id;

              return (
                <Card key={viewing.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {listing?.title || 'Property Viewing'}
                        </CardTitle>
                        {address && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{address}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <ViewingStatusBadge status={viewing.status} />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <div className="flex items-center text-gray-500 text-sm mb-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Viewing Date</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {format(
                            new Date(viewing.viewingDate),
                            'EEEE, MMMM dd, yyyy'
                          )}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center text-gray-500 text-sm mb-1">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Time</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {viewing.viewingTime}
                        </p>
                      </div>
                    </div>

                    {viewing.notes && (
                      <div className="mb-6">
                        <p className="text-sm text-gray-500 mb-1">Notes</p>
                        <p className="text-gray-900">{viewing.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        {viewing.status === 'pending' &&
                          'Awaiting landlord confirmation'}
                        {viewing.status === 'confirmed' &&
                          'Your viewing is confirmed'}
                        {viewing.status === 'cancelled' &&
                          'This viewing was cancelled'}
                        {isPast && viewing.status !== 'cancelled' && ' (Past)'}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            navigate(`/properties/${viewing.listingId}`)
                          }
                        >
                          View Property
                        </Button>
                        {canCancel && (
                          <Button
                            variant="destructive"
                            onClick={() => setViewingToCancel(viewing)}
                            disabled={isCancelling}
                          >
                            {isCancelling ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Cancelling...
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-2" />
                                Cancel Viewing
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={!!viewingToCancel}
        onOpenChange={() => setViewingToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Viewing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this viewing appointment? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Viewing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                viewingToCancel && cancelMutation.mutate(viewingToCancel)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Viewing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
