/**
 * Agent Clients Page
 * Full client management with CRUD operations, real-time updates, and advanced filtering
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { agentService, type AgentClient, type ClientSearchParams } from '@/services/agentService';
import ClientList from '@/components/client/ClientList';
import AddClientModal from '@/components/client/AddClientModal';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function AgentClients() {
  const [clients, setClients] = useState<AgentClient[]>([]);
  const [filteredClients, setFilteredClients] = useState<AgentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadClients = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const params: ClientSearchParams = {
        page,
        limit: 20,
        sortBy: 'lastContact',
        sortOrder: 'desc'
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = [statusFilter];
      if (typeFilter !== 'all') params.type = [typeFilter];
      if (priorityFilter !== 'all') params.priority = [priorityFilter];

      const result = await agentService.getClients(userId, params);
      
      setClients(result.clients);
      setFilteredClients(result.clients);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Error loading clients:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load clients';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [userId, page, searchTerm, statusFilter, typeFilter, priorityFilter, toast]);

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
      loadClients();
    }
  }, [userId, loadClients]);

  // Real-time subscription for client changes
  useEffect(() => {
    if (!userId) return;

    const subscription = agentService.subscribeToClients(userId, (payload) => {
      console.log('Client change detected:', payload);
      loadClients();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, loadClients]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  const handlePriorityFilter = (value: string) => {
    setPriorityFilter(value);
    setPage(1);
  };

  const handleRefresh = () => {
    loadClients();
    toast({
      title: 'Refreshed',
      description: 'Client list has been refreshed'
    });
  };

  const handleExport = () => {
    // Export clients to CSV
    const csv = [
      ['Name', 'Email', 'Phone', 'Type', 'Status', 'Priority', 'Lead Score', 'Last Contact'].join(','),
      ...filteredClients.map((client) =>
        [
          `${client.firstName} ${client.lastName}`,
          client.email,
          client.phone,
          client.type,
          client.status,
          client.priority,
          client.leadScore || 0,
          new Date(client.lastContact).toLocaleDateString()
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: 'Exported',
      description: 'Client list has been exported to CSV'
    });
  };

  if (loading && clients.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error && clients.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Client Management</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadClients}>
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
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Client Management</h1>
            <p className="text-gray-500 mt-1">
              Manage your clients and track their progress through the sales pipeline
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <AddClientModal />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clients.filter((c) => c.status === 'active').length}
              </div>
              <p className="text-xs text-gray-500 mt-1">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <Badge className="bg-red-100 text-red-800">Urgent</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clients.filter((c) => c.priority === 'high' || c.priority === 'urgent').length}
              </div>
              <p className="text-xs text-gray-500 mt-1">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Lead Score</CardTitle>
              <Badge variant="outline">Score</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clients.length > 0
                  ? Math.round(
                      clients.reduce((sum, c) => sum + (c.leadScore || 0), 0) / clients.length
                    )
                  : 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Out of 100</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search clients by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={handleTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="renter">Renter</SelectItem>
                  <SelectItem value="investor">Investor</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={handlePriorityFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Client List */}
        <ClientList showAddButton={false} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} clients
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}