/**
 * Broker Agents Page
 * Agent management and performance tracking
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  DollarSign,
  Award,
  Search,
  Filter,
  RefreshCw,
  Plus,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { brokerService, type BrokerAgent } from '@/services/brokerService';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function BrokerAgents() {
  const [agents, setAgents] = useState<BrokerAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadAgents = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit: 20,
        sortBy: 'totalVolume',
        sortOrder: 'desc' as const,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? [statusFilter] : undefined
      };

      const result = await brokerService.getAgents(userId, params);
      setAgents(result.agents);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Error loading agents:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load agents';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [userId, page, searchTerm, statusFilter, toast]);

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
      loadAgents();
    }
  }, [userId, loadAgents]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const subscription = brokerService.subscribeToAgents(userId, (payload) => {
      console.log('Agent change detected:', payload);
      loadAgents();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, loadAgents]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'team_lead':
        return 'bg-purple-100 text-purple-800';
      case 'senior_agent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateStats = () => {
    const totalAgents = agents.length;
    const activeAgents = agents.filter((a) => a.status === 'active').length;
    const totalVolume = agents.reduce((sum, a) => sum + a.totalVolume, 0);
    const totalCommission = agents.reduce((sum, a) => sum + a.totalCommission, 0);
    const averageRating = agents.length > 0
      ? agents.reduce((sum, a) => sum + a.rating, 0) / agents.length
      : 0;

    return { totalAgents, activeAgents, totalVolume, totalCommission, averageRating };
  };

  const stats = calculateStats();

  if (loading && agents.length === 0) {
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

  if (error && agents.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Team Agents</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadAgents}>
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
            <h1 className="text-3xl font-bold tracking-tight">Team Agents</h1>
            <p className="text-gray-500 mt-1">
              Manage your agents and track their performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadAgents} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Agent
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAgents}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.activeAgents} active
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
                ${stats.totalVolume.toLocaleString()}
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
                ${stats.totalCommission.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Earned commission</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Award className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <p className="text-xs text-gray-500 mt-1">Out of 5.0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Volume</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalAgents > 0 ? Math.round(stats.totalVolume / stats.totalAgents).toLocaleString() : '0'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Per agent</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search agents by name, email, or license..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('inactive')}
                >
                  Inactive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>All agents in your brokerage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Add your first agent to get started'}
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Agent
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-left text-sm text-gray-500">
                          <th className="pb-3 font-medium">Agent</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Role</th>
                          <th className="pb-3 font-medium">Deals</th>
                          <th className="pb-3 font-medium">Volume</th>
                          <th className="pb-3 font-medium">Commission</th>
                          <th className="pb-3 font-medium">Split</th>
                          <th className="pb-3 font-medium">Rating</th>
                          <th className="pb-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {agents.map((agent) => (
                          <tr key={agent.id} className="border-b hover:bg-gray-50">
                            <td className="py-4">
                              <div>
                                <div className="font-medium">
                                  {agent.firstName} {agent.lastName}
                                </div>
                                <div className="text-sm text-gray-500">{agent.email}</div>
                                <div className="text-xs text-gray-400">
                                  License: {agent.licenseNumber}
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <Badge className={getStatusColor(agent.status)}>
                                {agent.status}
                              </Badge>
                            </td>
                            <td className="py-4">
                              <Badge className={getRoleColor(agent.role)}>
                                {agent.role.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="py-4 font-medium">{agent.totalDeals}</td>
                            <td className="py-4 font-medium">
                              ${agent.totalVolume.toLocaleString()}
                            </td>
                            <td className="py-4 font-medium text-green-600">
                              ${agent.totalCommission.toLocaleString()}
                            </td>
                            <td className="py-4">{agent.commissionSplit}%</td>
                            <td className="py-4">
                              <div className="flex items-center gap-1">
                                <Award className="h-4 w-4 text-yellow-600" />
                                <span>{agent.rating.toFixed(1)}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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