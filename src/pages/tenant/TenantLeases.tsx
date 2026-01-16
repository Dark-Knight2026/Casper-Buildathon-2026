/**
 * Tenant Leases Page
 * Displays all leases for the tenant with filtering and document access
 * Enhanced with loading states, error handling, and empty states
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Home,
  AlertCircle,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { leaseManagementService } from '@/services/leaseManagementService';
import type { LeaseAgreement } from '@/types/lease';
import { ListSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export function TenantLeases() {
  const [leases, setLeases] = useState<LeaseAgreement[]>([]);
  const [filteredLeases, setFilteredLeases] = useState<LeaseAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadLeases = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth/login');
        return;
      }

      const allLeases = await leaseManagementService.getLeases({
        tenantId: user.id
      });

      if (isMounted) {
        setLeases(allLeases);
        toast({
          variant: 'success',
          title: 'Leases loaded',
          description: `Found ${allLeases.length} lease${allLeases.length !== 1 ? 's' : ''}`,
        });
      }
    } catch (err) {
      console.error('Error loading leases:', err);
      if (isMounted) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load leases';
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Error loading leases',
          description: errorMessage,
        });
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [navigate, toast]);

  const filterLeases = useCallback(() => {
    if (statusFilter === 'all') {
      setFilteredLeases(leases);
    } else {
      setFilteredLeases(leases.filter(lease => lease.status === statusFilter));
    }
  }, [leases, statusFilter]);

  useEffect(() => {
    loadLeases();
  }, [loadLeases]);

  useEffect(() => {
    filterLeases();
  }, [filterLeases]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      terminated: 'bg-gray-100 text-gray-800',
      draft: 'bg-blue-100 text-blue-800'
    };

    return (
      <Badge className={statusColors[status] || statusColors.pending}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const handleViewLease = (leaseId: string) => {
    navigate(`/tenant/leases/${leaseId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Leases</h1>
          <p className="text-gray-600">View and manage your rental agreements</p>
        </div>
        <ListSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={loadLeases} aria-label="Retry loading leases">
              Try Again
            </Button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Leases</h1>
          <p className="text-gray-600">View and manage your rental agreements</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-gray-400" aria-hidden="true" />
              <div className="flex-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-64" aria-label="Filter leases by status">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leases</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-500" role="status" aria-live="polite">
                {filteredLeases.length} {filteredLeases.length === 1 ? 'lease' : 'leases'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leases List */}
        {filteredLeases.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={statusFilter === 'all' ? 'No Leases Found' : `No ${statusFilter} Leases`}
            description={
              statusFilter === 'all'
                ? "You don't have any leases yet. Contact your landlord to get started."
                : `No ${statusFilter} leases found. Try changing the filter or view all leases.`
            }
            action={
              statusFilter !== 'all'
                ? {
                    label: 'View All Leases',
                    onClick: () => setStatusFilter('all')
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredLeases.map((lease) => (
              <Card 
                key={lease.id} 
                className="hover:shadow-lg transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                tabIndex={0}
                role="article"
                aria-label={`Lease for ${lease.propertyAddress}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{lease.propertyAddress}</CardTitle>
                        {getStatusBadge(lease.status)}
                      </div>
                      <CardDescription>
                        Lease ID: {lease.id.slice(0, 8)}...
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewLease(lease.id)}
                      aria-label={`View details for lease at ${lease.propertyAddress}`}
                    >
                      <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                      View Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-gray-400 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-medium">Lease Period</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {lease.type === 'fixed-term' ? 'Fixed Term' : 'Month-to-Month'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-medium">Monthly Rent</p>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(lease.monthlyRent)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Due on day {lease.paymentDueDay}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Home className="h-5 w-5 text-gray-400 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-medium">Security Deposit</p>
                          <p className="text-lg font-bold">
                            {formatCurrency(lease.securityDeposit)}
                          </p>
                          {lease.petDeposit && lease.petDeposit > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              + {formatCurrency(lease.petDeposit)} pet deposit
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {lease.utilities && lease.utilities.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Utilities Included</p>
                      <div className="flex flex-wrap gap-2">
                        {lease.utilities.map((utility, index) => (
                          <Badge key={index} variant="secondary">
                            {utility}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {lease.status === 'active' 
                          ? `${Math.ceil((new Date(lease.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining`
                          : `Ended ${formatDate(lease.endDate)}`
                        }
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewLease(lease.id)}
                        aria-label={`View documents for lease at ${lease.propertyAddress}`}
                      >
                        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                        Documents
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}