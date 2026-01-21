import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Clock, AlertCircle, CheckCircle, User, Briefcase, PenTool } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { leaseApi } from '@/lib/api/lease';
import { LeaseAgreement } from '@/types/lease';
import { format, isValid } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const LeaseWidget: React.FC = () => {
  const navigate = useNavigate();
  const [leases, setLeases] = useState<LeaseAgreement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeases = async () => {
      try {
        // In a real app, we would get the current user's ID
        // For now, we'll fetch all leases and filter or rely on API to filter
        const data = await leaseApi.getLeases();
        setLeases(data);
      } catch (error) {
        console.error('Failed to fetch leases:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeases();
  }, []);

  const stats = {
    active: leases.filter(l => l.status === 'active').length,
    expiring: leases.filter(l => {
      if (l.status !== 'active' || !l.endDate) return false;
      const endDate = new Date(l.endDate);
      if (!isValid(endDate)) return false;
      
      const daysUntilEnd = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilEnd <= 60 && daysUntilEnd > 0;
    }).length,
    draft: leases.filter(l => l.status === 'draft').length,
    pending: leases.filter(l => l.status === 'pending_approval' || l.status === 'pending_signature').length,
  };

  const recentActivity = leases
    .filter(l => l.updatedAt && isValid(new Date(l.updatedAt)))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
      case 'pending_approval':
      case 'pending_signature': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'expired':
      case 'terminated': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'changes_requested': return 'bg-orange-100 text-orange-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const getSignatureStatusColor = (status: string) => {
    return status === 'signed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500';
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lease Agreements</CardTitle>
          <CardDescription>Manage your rental contracts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
            <Skeleton className="h-[200px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Lease Agreements</CardTitle>
          <CardDescription>Overview of your rental contracts</CardDescription>
        </div>
        <Button onClick={() => navigate('/create-lease')} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Lease
        </Button>
      </CardHeader>
      <CardContent>
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800 dark:text-green-100">Active</span>
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-2xl font-bold text-green-900 dark:text-green-50">{stats.active}</span>
          </div>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-100">Expiring Soon</span>
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <span className="text-2xl font-bold text-yellow-900 dark:text-yellow-50">{stats.expiring}</span>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-100">Pending</span>
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-blue-900 dark:text-blue-50">{stats.pending}</span>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Drafts</span>
              <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats.draft}</span>
          </div>
        </div>

        {/* Recent Activity List */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Recent Activity</h4>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((lease) => (
                <div 
                  key={lease.id} 
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer gap-4"
                  onClick={() => navigate(`/leases/${lease.id}`)}
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="p-2 bg-white dark:bg-gray-700 rounded-full border shadow-sm shrink-0">
                      {lease.createdByRole === 'agent' ? (
                        <Briefcase className="h-4 w-4 text-purple-500" />
                      ) : (
                        <User className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{lease.propertyId}</p>
                        {lease.createdByRole === 'agent' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-[10px] h-5 px-1 bg-purple-50 text-purple-700 border-purple-200">
                                  Agent
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Created by Agent</p>
                                {lease.agentCommission && (
                                  <p>Commission: ${lease.agentCommission.toLocaleString()}</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Updated {lease.updatedAt ? format(new Date(lease.updatedAt), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Approval Status Badge */}
                    {lease.approvalStatus && lease.approvalStatus !== 'not_required' && (
                      <Badge className={getApprovalStatusColor(lease.approvalStatus)} variant="outline">
                        Approval: {formatStatus(lease.approvalStatus)}
                      </Badge>
                    )}

                    {/* Signature Status Badge */}
                    {lease.signatureStatus && (
                      <Badge className={getSignatureStatusColor(lease.signatureStatus)} variant="outline">
                        <PenTool className="w-3 h-3 mr-1" />
                        {lease.signatureStatus === 'signed' ? 'Signed' : 'Pending Sign'}
                      </Badge>
                    )}

                    {/* Main Status Badge */}
                    <Badge className={getStatusColor(lease.status)}>
                      {formatStatus(lease.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No lease agreements found</p>
              <Button variant="link" onClick={() => navigate('/create-lease')} className="mt-2">
                Create your first lease
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};