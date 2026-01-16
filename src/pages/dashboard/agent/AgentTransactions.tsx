/**
 * Agent Transactions Page
 * Transaction pipeline visualization, milestone tracking, and commission calculations
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { agentService, type AgentTransaction, type TransactionSearchParams } from '@/services/agentService';
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

export default function AgentTransactions() {
  const [transactions, setTransactions] = useState<AgentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadTransactions = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const params: TransactionSearchParams = {
        page: 1,
        limit: 100,
        sortBy: 'stageEnteredAt',
        sortOrder: 'desc'
      };

      if (selectedStage !== 'all') {
        params.pipelineStage = [selectedStage];
      }

      const result = await agentService.getTransactions(userId, params);
      setTransactions(result.transactions);
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
  }, [userId, selectedStage, toast]);

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

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const subscription = agentService.subscribeToTransactions(userId, (payload) => {
      console.log('Transaction change detected:', payload);
      loadTransactions();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, loadTransactions]);

  const getStageColor = (stage: string) => {
    const stageConfig = PIPELINE_STAGES.find((s) => s.key === stage);
    return stageConfig?.color || 'bg-gray-100 text-gray-800';
  };

  const calculateTotalValue = () => {
    return transactions
      .filter((t) => t.pipelineStage !== 'lost')
      .reduce((sum, t) => sum + (t.salePrice || 0), 0);
  };

  const calculateTotalCommission = () => {
    return transactions
      .filter((t) => t.pipelineStage === 'closed')
      .reduce((sum, t) => sum + (t.commissionAmount || 0), 0);
  };

  const calculateWeightedPipeline = () => {
    return transactions
      .filter((t) => t.pipelineStage !== 'closed' && t.pipelineStage !== 'lost')
      .reduce((sum, t) => sum + (t.salePrice || 0) * (t.probabilityPercent / 100), 0);
  };

  const getStageCount = (stage: string) => {
    return transactions.filter((t) => t.pipelineStage === stage).length;
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
        <h1 className="text-3xl font-bold">Transaction Pipeline</h1>
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
            <h1 className="text-3xl font-bold tracking-tight">Transaction Pipeline</h1>
            <p className="text-gray-500 mt-1">
              Track your deals through each stage of the sales process
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadTransactions} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${calculateTotalValue().toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {transactions.filter((t) => t.pipelineStage !== 'lost').length} active deals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weighted Pipeline</CardTitle>
              <Target className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${calculateWeightedPipeline().toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Based on probability</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closed Deals</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getStageCount('closed')}</div>
              <p className="text-xs text-gray-500 mt-1">This period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${calculateTotalCommission().toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Earned commission</p>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Stages */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stages</CardTitle>
            <CardDescription>Visual representation of your transaction pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {PIPELINE_STAGES.filter((s) => s.key !== 'lost').map((stage) => {
                const count = getStageCount(stage.key);
                const value = transactions
                  .filter((t) => t.pipelineStage === stage.key)
                  .reduce((sum, t) => sum + (t.salePrice || 0), 0);
                const percentage =
                  transactions.length > 0
                    ? (count / transactions.filter((t) => t.pipelineStage !== 'lost').length) * 100
                    : 0;

                return (
                  <div key={stage.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={stage.color}>{stage.label}</Badge>
                        <span className="text-sm text-gray-600">
                          {count} {count === 1 ? 'deal' : 'deals'}
                        </span>
                      </div>
                      <span className="text-sm font-medium">${value.toLocaleString()}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Transaction List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <div className="flex items-center gap-2">
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                  <p className="text-gray-500 mb-4">
                    Start tracking your deals by creating your first transaction
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Transaction
                  </Button>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
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
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ${transaction.salePrice?.toLocaleString() || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {transaction.estimatedCloseDate
                            ? new Date(transaction.estimatedCloseDate).toLocaleDateString()
                            : 'No date set'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {transaction.probabilityPercent}% probability
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        ${transaction.commissionAmount?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-gray-500">Commission</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}