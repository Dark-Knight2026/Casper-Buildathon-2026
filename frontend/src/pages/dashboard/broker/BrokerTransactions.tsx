/**
 * Broker Transactions Page
 * All team transactions overview
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { brokerService, type BrokerTransaction } from '@/services/brokerService';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead', color: 'bg-gray-100 text-gray-800' },
  { key: 'showing', label: 'Showing', color: 'bg-blue-100 text-blue-800' },
  { key: 'offer', label: 'Offer', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'under_contract', label: 'Under Contract', color: 'bg-orange-100 text-orange-800' },
  { key: 'closing', label: 'Closing', color: 'bg-purple-100 text-purple-800' },
  { key: 'closed', label: 'Closed', color: 'bg-green-100 text-green-800' },
  { key: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' }
];

export default function BrokerTransactions() {
  const [transactions, setTransactions] = useState<BrokerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadTransactions = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
        pipelineStage: selectedStage !== 'all' ? [selectedStage] : undefined
      };

      const result = await brokerService.getTeamTransactions(userId, params);
      setTransactions(result.transactions);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Error loading transactions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [userId, page, selectedStage, toast]);

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
      loadTransactions();
    }
  }, [userId, loadTransactions]);

  const getStageColor = (stage: string) => {
    const stageConfig = PIPELINE_STAGES.find((s) => s.key === stage);
    return stageConfig?.color || 'bg-gray-100 text-gray-800';
  };

  const calculateStats = () => {
    const totalValue = transactions.reduce((sum, t) => sum + (t.salePrice || 0), 0);
    const totalCommission = transactions.reduce((sum, t) => sum + (t.commissionAmount || 0), 0);
    const brokerCommission = transactions.reduce((sum, t) => sum + t.brokerCommission, 0);
    const closedDeals = transactions.filter((t) => t.pipelineStage === 'closed').length;

    return { totalValue, totalCommission, brokerCommission, closedDeals };
  };

  const stats = calculateStats();

  const exportToCSV = () => {
    const headers = ['Date', 'Agent', 'Type', 'Stage', 'Sale Price', 'Commission', 'Broker Commission'];
    const rows = transactions.map((t) => [
      new Date(t.createdAt).toLocaleDateString(),
      t.agentName,
      t.type,
      t.pipelineStage,
      t.salePrice || 0,
      t.commissionAmount || 0,
      t.brokerCommission
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Transactions exported to CSV'
    });
  };

  if (loading && transactions.length === 0) {
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

  if (error && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Team Transactions</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadTransactions}>
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
            <h1 className="text-3xl font-bold tracking-tight">Team Transactions</h1>
            <p className="text-gray-500 mt-1">
              Overview of all transactions across your team
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportToCSV} disabled={transactions.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={loadTransactions} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactions.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.closedDeals} closed deals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalValue.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Pipeline value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${stats.totalCommission.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">All transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Broker Commission</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${stats.brokerCommission.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Your share</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Button
                variant={selectedStage === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStage('all')}
              >
                All
              </Button>
              {PIPELINE_STAGES.map((stage) => (
                <Button
                  key={stage.key}
                  variant={selectedStage === stage.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStage(stage.key)}
                >
                  {stage.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>All team transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                  <p className="text-gray-500">
                    {selectedStage !== 'all'
                      ? 'Try selecting a different stage'
                      : 'Transactions will appear here as your team closes deals'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">Transaction #{transaction.id.slice(0, 8)}</h4>
                            <Badge className={getStageColor(transaction.pipelineStage)}>
                              {PIPELINE_STAGES.find((s) => s.key === transaction.pipelineStage)?.label}
                            </Badge>
                            <Badge variant="outline">{transaction.type}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Agent: {transaction.agentName}</span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              ${transaction.salePrice?.toLocaleString() || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-green-600">
                            ${transaction.commissionAmount?.toLocaleString() || '0'}
                          </div>
                          <div className="text-sm text-gray-500">
                            Broker: ${transaction.brokerCommission.toLocaleString()} ({transaction.brokerCommissionRate}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-gray-500">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}