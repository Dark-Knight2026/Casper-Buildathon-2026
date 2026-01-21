/**
 * Buyer Tours Page
 * Tour scheduling and tracking with backend integration
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Eye,
  Edit,
  X,
  Clock,
  MapPin,
  Video,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { buyerService, BuyerTour } from '@/services/buyerService';

export default function BuyerTours() {
  const [tours, setTours] = useState<BuyerTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadTours = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await buyerService.getTours(userId);
      setTours(data);
    } catch (err) {
      console.error('Error loading tours:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tours';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    const initializeUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/auth/login');
        return;
      }

      setUserId(user.id);
    };

    initializeUser();
  }, [navigate]);

  useEffect(() => {
    if (userId) {
      loadTours();
    }
  }, [userId, loadTours]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = buyerService.subscribeToTours(userId, () => {
      loadTours();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadTours]);

  const handleCancelTour = async (tourId: string) => {
    try {
      await buyerService.cancelTour(tourId);
      setTours((prev) => prev.map((t) => (t.id === tourId ? { ...t, status: 'cancelled' } : t)));
      toast({
        title: 'Success',
        description: 'Tour cancelled successfully'
      });
    } catch (err) {
      console.error('Error cancelling tour:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel tour'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <X className="h-5 w-5 text-red-600" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'rescheduled':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const calculateStats = () => {
    const now = new Date();
    return {
      total: tours.length,
      upcoming: tours.filter((t) => new Date(t.scheduledDate) > now && t.status === 'scheduled')
        .length,
      completed: tours.filter((t) => t.status === 'completed').length,
      cancelled: tours.filter((t) => t.status === 'cancelled').length
    };
  };

  const stats = calculateStats();

  const filteredTours = tours.filter((tour) => {
    if (statusFilter === 'all') return true;
    return tour.status === statusFilter;
  });

  const sortedTours = [...filteredTours].sort(
    (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );

  if (loading && tours.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error && tours.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Property Tours</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadTours}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Property Tours</h1>
            <p className="text-gray-500 mt-1">Schedule and manage property viewings</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadTours} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Tour
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tours</CardTitle>
              <Calendar className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.upcoming}</div>
              <p className="text-xs text-gray-500 mt-1">Scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-xs text-gray-500 mt-1">Finished tours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <X className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
              <p className="text-xs text-gray-500 mt-1">Not completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'scheduled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('scheduled')}
              >
                Scheduled
              </Button>
              <Button
                variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('confirmed')}
              >
                Confirmed
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('completed')}
              >
                Completed
              </Button>
              <Button
                variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('cancelled')}
              >
                Cancelled
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tours List */}
        <Card>
          <CardHeader>
            <CardTitle>Tours</CardTitle>
            <CardDescription>Your scheduled property tours</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedTours.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tours found</h3>
                <p className="text-gray-500 mb-4">
                  {statusFilter !== 'all'
                    ? 'No tours with this status'
                    : 'Schedule your first property tour'}
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Tour
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedTours.map((tour) => (
                  <div
                    key={tour.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="mt-1">{getStatusIcon(tour.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-semibold text-lg">Property #{tour.propertyId}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(tour.scheduledDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {new Date(tour.scheduledDate).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="flex items-center">
                              {tour.tourType === 'virtual' ? (
                                <Video className="h-4 w-4 mr-1" />
                              ) : (
                                <MapPin className="h-4 w-4 mr-1" />
                              )}
                              {tour.tourType === 'virtual' ? 'Virtual' : 'In-Person'}
                            </div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(tour.status)}>
                          {tour.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      {tour.notes && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{tour.notes}</p>
                      )}

                      {tour.feedback && tour.rating && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{tour.rating}/5</span>
                          </div>
                          <p className="text-sm text-gray-700">{tour.feedback}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-3 w-3" />
                          View Property
                        </Button>
                        {tour.status === 'scheduled' && (
                          <>
                            <Button variant="outline" size="sm">
                              <Edit className="mr-1 h-3 w-3" />
                              Reschedule
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelTour(tour.id)}
                            >
                              <X className="mr-1 h-3 w-3 text-red-600" />
                              Cancel
                            </Button>
                          </>
                        )}
                        {tour.status === 'completed' && !tour.feedback && (
                          <Button variant="outline" size="sm">
                            <Star className="mr-1 h-3 w-3" />
                            Add Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}