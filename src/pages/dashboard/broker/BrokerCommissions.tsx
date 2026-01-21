/**
 * Broker Commissions Page
 * Commission distribution and splits management
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Users,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { brokerService, type BrokerCommissionSplit } from '@/services/brokerService';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function BrokerCommissions() {
  const [commissions, setCommissions] = useState<BrokerCommissionSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadCommissions = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const status = statusFilter !== 'all' ? [statusFilter] : undefined;
      const data = await brokerService.getCommissionSplits(userId, status);
      setCommissions(data);
    } catch (err) {
      console.error('Error loading commissions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load commissions';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [userId, statusFilter, toast]);

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
      loadCommissions();
    }
  }, [userId, loadCommissions]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const subscription = brokerService.subscribeToCommissionSplits(userId, (payload) => {
      console.log('Commission split change detected:', payload);
      loadCommissions();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, loadCommissions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'disputed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'disputed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const calculateStats = () => {
    const totalCommission = commissions.reduce((sum, c) => sum + c.totalCommission, 0);
    const brokerAmount = commissions.reduce((sum, c) => sum + c.brokerAmount, 0);
    const agentAmount = commissions.reduce((sum, c) => sum + c.agentAmount, 0);
    const paidAmount = commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.brokerAmount, 0);
    const pendingAmount = commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.brokerAmount, 0);

    return { totalCommission, brokerAmount, agentAmount, paidAmount, pendingAmount };
  };

  const stats = calculateStats();

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Agent',
      'Transaction ID',
      'Total Commission',
      'Agent Split %',
      'Agent Amount',
      'Broker Split %',
      'Broker Amount',
      'Status',
      'Payment Date'
    ];
    const rows = commissions.map((c) => [
      new Date(c.createdAt).toLocaleDateString(),
      c.agentName,
      c.transactionId,
      c.totalCommission,
      c.agentSplit,
      c.agentAmount,
      c.brokerSplit,
      c.brokerAmount,
      c.status,
      c.paymentDate ? new Date(c.paymentDate).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Commissions exported to CSV'
    });
  };

  if (loading && commissions.length === 0) {
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

  if (error && commissions.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Commission Splits</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadCommissions}>
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
            <h1 className="text-3xl font-bold tracking-tight">Commission Splits</h1>
            <p className="text-gray-500 mt-1">
              Track and manage commission distributions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportToCSV} disabled={commissions.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={loadCommissions} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalCommission.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">{commissions.length} splits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Broker Share</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${stats.brokerAmount.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Your commission</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agent Share</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.agentAmount.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Agent commission</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${stats.paidAmount.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Completed payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${stats.pendingAmount.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
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
                variant={statusFilter === 'paid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('paid')}
              >
                Paid
              </Button>
              <Button
                variant={statusFilter === 'disputed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('disputed')}
              >
                Disputed
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Commissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Commission Splits</CardTitle>
            <CardDescription>Detailed breakdown of all commission distributions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {commissions.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No commissions found</h3>
                  <p className="text-gray-500">
                    {statusFilter !== 'all'
                      ? 'Try selecting a different status'
                      : 'Commission splits will appear here as transactions close'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left text-sm text-gray-500">
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Agent</th>
                        <th className="pb-3 font-medium">Total</th>
                        <th className="pb-3 font-medium">Agent Split</th>
                        <th className="pb-3 font-medium">Broker Split</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Payment Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((commission) => (
                        <tr key={commission.id} className="border-b hover:bg-gray-50">
                          <td className="py-4 text-sm">
                            {new Date(commission.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4">
                            <div className="font-medium">{commission.agentName}</div>
                            <div className="text-xs text-gray-500">
                              Transaction #{commission.transactionId.slice(0, 8)}
                            </div>
                          </td>
                          <td className="py-4 font-bold">
                            ${commission.totalCommission.toLocaleString()}
                          </td>
                          <td className="py-4">
                            <div className="font-medium">
                              ${commission.agentAmount.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">{commission.agentSplit}%</div>
                          </td>
                          <td className="py-4">
                            <div className="font-medium text-blue-600">
                              ${commission.brokerAmount.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">{commission.brokerSplit}%</div>
                          </td>
                          <td className="py-4">
                            <Badge className={getStatusColor(commission.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(commission.status)}
                                {commission.status}
                              </span>
                            </Badge>
                          </td>
                          <td className="py-4 text-sm">
                            {commission.paymentDate
                              ? new Date(commission.paymentDate).toLocaleDateString()
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}