/**
 * Buyer Offers Page
 * Complete offer management system with backend integration
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Eye,
  Edit,
  Trash2,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { buyerService, BuyerOffer } from '@/services/buyerService';

export default function BuyerOffers() {
  const [offers, setOffers] = useState<BuyerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadOffers = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await buyerService.getOffers(userId);
      setOffers(data);
    } catch (err) {
      console.error('Error loading offers:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load offers';
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
      loadOffers();
    }
  }, [userId, loadOffers]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = buyerService.subscribeToOffers(userId, () => {
      loadOffers();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadOffers]);

  const handleDeleteOffer = async (offerId: string) => {
    try {
      await buyerService.deleteOffer(offerId);
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      toast({
        title: 'Success',
        description: 'Offer deleted successfully'
      });
    } catch (err) {
      console.error('Error deleting offer:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete offer'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'countered':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'submitted':
      case 'under_review':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'withdrawn':
        return 'bg-red-100 text-red-800';
      case 'countered':
        return 'bg-blue-100 text-blue-800';
      case 'submitted':
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateStats = () => {
    return {
      total: offers.length,
      pending: offers.filter((o) => ['submitted', 'under_review'].includes(o.status)).length,
      accepted: offers.filter((o) => o.status === 'accepted').length,
      rejected: offers.filter((o) => o.status === 'rejected').length,
      totalValue: offers.reduce((sum, o) => sum + o.offerAmount, 0)
    };
  };

  const stats = calculateStats();

  const filteredOffers = offers.filter((offer) => {
    if (statusFilter === 'all') return true;
    return offer.status === statusFilter;
  });

  if (loading && offers.length === 0) {
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

  if (error && offers.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Offers</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadOffers}>
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
            <h1 className="text-3xl font-bold tracking-tight">My Offers</h1>
            <p className="text-gray-500 mt-1">Track and manage your property offers</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadOffers} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Offer
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
              <FileText className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
              <p className="text-xs text-gray-500 mt-1">Successful offers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-gray-500 mt-1">All offers combined</p>
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
                variant={statusFilter === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('draft')}
              >
                Draft
              </Button>
              <Button
                variant={statusFilter === 'submitted' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('submitted')}
              >
                Submitted
              </Button>
              <Button
                variant={statusFilter === 'under_review' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('under_review')}
              >
                Under Review
              </Button>
              <Button
                variant={statusFilter === 'accepted' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('accepted')}
              >
                Accepted
              </Button>
              <Button
                variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('rejected')}
              >
                Rejected
              </Button>
              <Button
                variant={statusFilter === 'countered' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('countered')}
              >
                Countered
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Offers List */}
        <Card>
          <CardHeader>
            <CardTitle>Offers</CardTitle>
            <CardDescription>Your submitted property offers</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOffers.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No offers found</h3>
                <p className="text-gray-500 mb-4">
                  {statusFilter !== 'all'
                    ? 'No offers with this status'
                    : 'Start making offers on properties'}
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Offer
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="mt-1">{getStatusIcon(offer.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-semibold text-lg">Property #{offer.propertyId}</h4>
                          <p className="text-sm text-gray-500">
                            Offer Amount: {formatCurrency(offer.offerAmount)}
                          </p>
                        </div>
                        <Badge className={getStatusColor(offer.status)}>
                          {offer.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-gray-500">Earnest Money</p>
                          <p className="font-medium">{formatCurrency(offer.earnestMoney)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Closing Date</p>
                          <p className="font-medium">
                            {new Date(offer.closingDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Contingencies</p>
                          <p className="font-medium">{offer.contingencies.length}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Submitted</p>
                          <p className="font-medium">
                            {offer.submittedAt
                              ? new Date(offer.submittedAt).toLocaleDateString()
                              : 'Not yet'}
                          </p>
                        </div>
                      </div>

                      {offer.counterOffer && (
                        <Alert className="mb-3">
                          <TrendingUp className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Counter Offer:</strong> {formatCurrency(offer.counterOffer.amount)}
                            {' - '}
                            {offer.counterOffer.terms}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                        {offer.status === 'draft' && (
                          <>
                            <Button variant="outline" size="sm">
                              <Edit className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              <Send className="mr-1 h-3 w-3" />
                              Submit
                            </Button>
                          </>
                        )}
                        {offer.status === 'countered' && (
                          <Button variant="outline" size="sm">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Accept Counter
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteOffer(offer.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
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