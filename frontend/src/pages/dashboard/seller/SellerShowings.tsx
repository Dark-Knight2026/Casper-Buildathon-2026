/**
 * Seller Showings Page
 * Showing request management with calendar integration
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MapPin,
  Video,
  User,
  RefreshCw,
  AlertCircle,
  Star,
  Phone,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { sellerService, SellerShowing } from '@/services/sellerService';

export default function SellerShowings() {
  const [showings, setShowings] = useState<SellerShowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadShowings = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await sellerService.getShowings(userId);
      setShowings(data);
    } catch (err) {
      console.error('Error loading showings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load showings';
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
      loadShowings();
    }
  }, [userId, loadShowings]);

  const handleApprove = async (showingId: string) => {
    try {
      await sellerService.updateShowingStatus(showingId, 'approved');
      setShowings((prev) =>
        prev.map((s) => (s.id === showingId ? { ...s, status: 'approved' } : s))
      );
      toast({
        title: 'Success',
        description: 'Showing request approved'
      });
    } catch (err) {
      console.error('Error approving showing:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve showing'
      });
    }
  };

  const handleDecline = async (showingId: string) => {
    try {
      await sellerService.updateShowingStatus(showingId, 'declined');
      setShowings((prev) =>
        prev.map((s) => (s.id === showingId ? { ...s, status: 'declined' } : s))
      );
      toast({
        title: 'Success',
        description: 'Showing request declined'
      });
    } catch (err) {
      console.error('Error declining showing:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to decline showing'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'no_show':
        return <XCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
      case 'no_show':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const calculateStats = () => {
    const now = new Date();
    return {
      total: showings.length,
      pending: showings.filter((s) => s.status === 'requested').length,
      upcoming: showings.filter(
        (s) => new Date(s.requestedDate) > now && s.status === 'approved'
      ).length,
      completed: showings.filter((s) => s.status === 'completed').length,
      averageRating:
        showings.filter((s) => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) /
          showings.filter((s) => s.rating).length || 0
    };
  };

  const stats = calculateStats();

  const filteredShowings = showings.filter((showing) => {
    if (statusFilter === 'all') return true;
    return showing.status === statusFilter;
  });

  const sortedShowings = [...filteredShowings].sort(
    (a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime()
  );

  const upcomingShowings = sortedShowings.filter(
    (s) => new Date(s.requestedDate) > new Date() && s.status === 'approved'
  );

  const pastShowings = sortedShowings.filter(
    (s) => new Date(s.requestedDate) <= new Date() || s.status === 'completed'
  );

  if (loading && showings.length === 0) {
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

  if (error && showings.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Property Showings</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadShowings}>
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
            <h1 className="text-3xl font-bold tracking-tight">Property Showings</h1>
            <p className="text-gray-500 mt-1">Manage showing requests and schedule</p>
          </div>
          <Button variant="outline" onClick={loadShowings} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Showings</CardTitle>
              <Calendar className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.upcoming}</div>
              <p className="text-xs text-gray-500 mt-1">Scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <p className="text-xs text-gray-500 mt-1">Out of 5.0</p>
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
                variant={statusFilter === 'requested' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('requested')}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('approved')}
              >
                Approved
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('completed')}
              >
                Completed
              </Button>
              <Button
                variant={statusFilter === 'declined' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('declined')}
              >
                Declined
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Showings Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              <Calendar className="mr-2 h-4 w-4" />
              Upcoming ({upcomingShowings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              <Clock className="mr-2 h-4 w-4" />
              Past ({pastShowings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Showings</CardTitle>
                <CardDescription>Approved showings scheduled for the future</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingShowings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No upcoming showings
                    </h3>
                    <p className="text-gray-500">
                      Approved showing requests will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingShowings.map((showing) => (
                      <div
                        key={showing.id}
                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="mt-1">{getStatusIcon(showing.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-semibold text-lg">
                                Listing #{showing.listingId}
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {new Date(showing.requestedDate).toLocaleDateString()}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {new Date(showing.requestedDate).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                                <div className="flex items-center">
                                  {showing.showingType === 'virtual' ? (
                                    <Video className="h-4 w-4 mr-1" />
                                  ) : (
                                    <MapPin className="h-4 w-4 mr-1" />
                                  )}
                                  {showing.showingType === 'virtual' ? 'Virtual' : 'In-Person'}
                                </div>
                              </div>
                            </div>
                            <Badge className={getStatusColor(showing.status)}>
                              {showing.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                            <div>
                              <p className="text-gray-500">Buyer</p>
                              <p className="font-medium">{showing.buyerName}</p>
                              {showing.buyerEmail && (
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {showing.buyerEmail}
                                </div>
                              )}
                              {showing.buyerPhone && (
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {showing.buyerPhone}
                                </div>
                              )}
                            </div>
                            {showing.agentName && (
                              <div>
                                <p className="text-gray-500">Agent</p>
                                <p className="font-medium">{showing.agentName}</p>
                              </div>
                            )}
                          </div>

                          {showing.specialRequests && (
                            <p className="text-sm text-gray-600 mb-3">
                              <strong>Special Requests:</strong> {showing.specialRequests}
                            </p>
                          )}

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="mr-1 h-3 w-3" />
                              View Listing
                            </Button>
                            {showing.status === 'requested' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApprove(showing.id)}
                                >
                                  <CheckCircle className="mr-1 h-3 w-3 text-green-600" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDecline(showing.id)}
                                >
                                  <XCircle className="mr-1 h-3 w-3 text-red-600" />
                                  Decline
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="past">
            <Card>
              <CardHeader>
                <CardTitle>Past Showings</CardTitle>
                <CardDescription>Completed and historical showings</CardDescription>
              </CardHeader>
              <CardContent>
                {pastShowings.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No past showings</h3>
                    <p className="text-gray-500">Completed showings will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pastShowings.map((showing) => (
                      <div
                        key={showing.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        <div className="mt-1">{getStatusIcon(showing.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-semibold text-lg">
                                Listing #{showing.listingId}
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {new Date(showing.requestedDate).toLocaleDateString()}
                                </div>
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-1" />
                                  {showing.buyerName}
                                </div>
                              </div>
                            </div>
                            <Badge className={getStatusColor(showing.status)}>
                              {showing.status}
                            </Badge>
                          </div>

                          {showing.feedback && showing.rating && (
                            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-medium">{showing.rating}/5</span>
                              </div>
                              <p className="text-sm text-gray-700">{showing.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}