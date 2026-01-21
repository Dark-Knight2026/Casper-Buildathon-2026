/**
 * Broker Team Analytics Page
 * Team performance metrics and KPIs
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Award,
  RefreshCw,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { brokerService, type TeamAnalytics } from '@/services/brokerService';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function BrokerTeamAnalytics() {
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadAnalytics = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await brokerService.getTeamAnalytics(userId);
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
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
      loadAnalytics();
    }
  }, [userId, loadAnalytics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Team Analytics</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Failed to load analytics'}</AlertDescription>
        </Alert>
        <Button onClick={loadAnalytics}>
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
            <h1 className="text-3xl font-bold tracking-tight">Team Analytics</h1>
            <p className="text-gray-500 mt-1">
              Comprehensive performance metrics for your team
            </p>
          </div>
          <Button variant="outline" onClick={loadAnalytics} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalAgents}</div>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.activeAgents} active ({Math.round((analytics.activeAgents / analytics.totalAgents) * 100)}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
              <Target className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalDeals}</div>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.activeAgents > 0 ? Math.round(analytics.totalDeals / analytics.activeAgents) : 0} per agent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics.totalVolume.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">All-time sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${analytics.totalCommission.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ${Math.round(analytics.averageCommissionPerAgent).toLocaleString()} avg per agent
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Your highest performing agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topPerformers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No performance data available yet
                </div>
              ) : (
                analytics.topPerformers.map((agent, index) => (
                  <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          {agent.firstName} {agent.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{agent.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        ${agent.totalVolume.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {agent.totalDeals} deals • ${agent.totalCommission.toLocaleString()} commission
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Distribution</CardTitle>
            <CardDescription>Deals by pipeline stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.dealsByStage).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pipeline data available yet
                </div>
              ) : (
                Object.entries(analytics.dealsByStage).map(([stage, count]) => {
                  const percentage = analytics.totalDeals > 0 ? (count / analytics.totalDeals) * 100 : 0;
                  return (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {stage.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-600">
                          {count} deals ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Volume Trend</CardTitle>
              <CardDescription>Last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.volumeByMonth.slice(-6).map((item, index, arr) => {
                  const prevVolume = index > 0 ? arr[index - 1].volume : item.volume;
                  const change = prevVolume > 0 ? ((item.volume - prevVolume) / prevVolume) * 100 : 0;
                  const isPositive = change >= 0;

                  return (
                    <div key={item.month} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${item.volume.toLocaleString()}</span>
                        {index > 0 && (
                          <span className={`text-xs flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {Math.abs(change).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Commission Trend</CardTitle>
              <CardDescription>Last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.commissionByMonth.slice(-6).map((item, index, arr) => {
                  const prevCommission = index > 0 ? arr[index - 1].commission : item.commission;
                  const change = prevCommission > 0 ? ((item.commission - prevCommission) / prevCommission) * 100 : 0;
                  const isPositive = change >= 0;

                  return (
                    <div key={item.month} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-600">
                          ${item.commission.toLocaleString()}
                        </span>
                        {index > 0 && (
                          <span className={`text-xs flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {Math.abs(change).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
}