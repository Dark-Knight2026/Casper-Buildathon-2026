import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { propertyActionsService, type ViewingSchedule } from '@/services/propertyActionsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface ViewingWithProperty extends ViewingSchedule {
  property?: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
  };
}

export default function MyViewings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewings, setViewings] = useState<ViewingWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [viewingToCancel, setViewingToCancel] = useState<string | null>(null);

  const fetchViewings = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await propertyActionsService.getUserViewings(user.id);
      setViewings(data as ViewingWithProperty[]);
    } catch (error) {
      console.error('Error loading viewings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load viewings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
    fetchViewings();
  }, [user, navigate, fetchViewings]);

  const handleCancelViewing = async (viewingId: string) => {
    if (!user) return;

    setCancellingId(viewingId);
    try {
      await propertyActionsService.cancelViewing(user.id, viewingId);
      setViewings(viewings.map(v => 
        v.id === viewingId ? { ...v, status: 'cancelled' as const } : v
      ));
      toast({
        title: 'Viewing cancelled',
        description: 'Your viewing appointment has been cancelled.',
      });
    } catch (error) {
      console.error('Error cancelling viewing:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel viewing. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
      setViewingToCancel(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-600">Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
    }
  };

  const handleViewProperty = (propertyId: string) => {
    navigate(`/properties/${propertyId}`);
  };

  if (loading) {
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Viewings</h1>
              <p className="text-gray-600">
                {viewings.length} {viewings.length === 1 ? 'viewing' : 'viewings'} scheduled
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
        {viewings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No viewings scheduled</h2>
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
              const property = viewing.property;
              const isPast = new Date(viewing.viewing_date) < new Date();
              const canCancel = viewing.status === 'pending' && !isPast;
              
              return (
                <Card key={viewing.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {property?.title || 'Property Viewing'}
                        </CardTitle>
                        {property && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{property.address}, {property.city}, {property.state}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {getStatusBadge(viewing.status)}
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
                          {format(new Date(viewing.viewing_date), 'EEEE, MMMM dd, yyyy')}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center text-gray-500 text-sm mb-1">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Time</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {viewing.viewing_time}
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
                        {viewing.status === 'pending' && 'Awaiting landlord confirmation'}
                        {viewing.status === 'confirmed' && 'Your viewing is confirmed'}
                        {viewing.status === 'cancelled' && 'This viewing was cancelled'}
                        {isPast && viewing.status !== 'cancelled' && ' (Past)'}
                      </div>
                      <div className="flex gap-2">
                        {property && (
                          <Button
                            variant="outline"
                            onClick={() => handleViewProperty(property.id)}
                          >
                            View Property
                          </Button>
                        )}
                        {canCancel && (
                          <Button
                            variant="destructive"
                            onClick={() => setViewingToCancel(viewing.id)}
                            disabled={cancellingId === viewing.id}
                          >
                            {cancellingId === viewing.id ? (
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
      <AlertDialog open={!!viewingToCancel} onOpenChange={() => setViewingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Viewing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this viewing appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Viewing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => viewingToCancel && handleCancelViewing(viewingToCancel)}
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