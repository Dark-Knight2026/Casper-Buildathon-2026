/**
 * Agent Commissions Page
 * Commission tracking, payment history, and earnings dashboard
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { agentService, type AgentCommission } from '@/services/agentService';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

export default function AgentCommissions() {
  const [commissions, setCommissions] = useState<AgentCommission[]>([]);
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
      const statusArray = statusFilter !== 'all' ? [statusFilter] : undefined;
      const result = await agentService.getCommissions(userId, statusArray);
      setCommissions(result);
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

  const calculateTotalEarned = () => {
    return commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.netAmount, 0);
  };

  const calculatePending = () => {
    return commissions
      .filter((c) => c.status === 'pending' || c.status === 'approved')
      .reduce((sum, c) => sum + c.netAmount, 0);
  };

  const calculateThisMonth = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return commissions
      .filter((c) => c.status === 'paid' && new Date(c.paymentDate!) >= firstDayOfMonth)
      .reduce((sum, c) => sum + c.netAmount, 0);
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Transaction ID', 'Amount', 'Rate', 'Split', 'Net Amount', 'Status', 'Payment Date'].join(','),
      ...commissions.map((c) =>
        [
          new Date(c.createdAt).toLocaleDateString(),
          c.transactionId.slice(0, 8),
          c.amount,
          `${c.rate}%`,
          `${c.splitPercentage}%`,
          c.netAmount,
          c.status,
          c.paymentDate ? new Date(c.paymentDate).toLocaleDateString() : 'N/A'
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: 'Exported',
      description: 'Commission report has been exported to CSV'
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
        <h1 className="text-3xl font-bold">Commission Tracking</h1>
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
            <h1 className="text-3xl font-bold tracking-tight">Commission Tracking</h1>
            <p className="text-gray-500 mt-1">
              Track your earnings and commission payments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadCommissions} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${calculateTotalEarned().toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${calculateThisMonth().toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {new Date().toLocaleString('default', { month: 'long' })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${calculatePending().toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{commissions.length}</div>
              <p className="text-xs text-gray-500 mt-1">Commission records</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
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
                variant={statusFilter === 'paid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('paid')}
              >
                Paid
              </Button>
              <Button
                variant={statusFilter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('approved')}
              >
                Approved
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Pending
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

        {/* Commission Table */}
        <Card>
          <CardHeader>
            <CardTitle>Commission History</CardTitle>
            <CardDescription>Detailed breakdown of your commission earnings</CardDescription>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No commissions yet</h3>
                <p className="text-gray-500">
                  Your commission earnings will appear here once deals are closed
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Gross Amount</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Split</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {commission.transactionId.slice(0, 8)}...
                      </TableCell>
                      <TableCell>${commission.amount.toLocaleString()}</TableCell>
                      <TableCell>{commission.rate}%</TableCell>
                      <TableCell>{commission.splitPercentage}%</TableCell>
                      <TableCell className="font-bold">
                        ${commission.netAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(commission.status)}>
                          {commission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {commission.paymentDate
                          ? new Date(commission.paymentDate).toLocaleDateString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}