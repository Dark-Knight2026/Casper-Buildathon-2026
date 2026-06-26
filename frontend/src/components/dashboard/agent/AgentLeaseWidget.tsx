import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Clock, AlertCircle, CheckCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { leaseApi } from '@/lib/api/lease';
import { LeaseAgreement } from '@/types/lease';
import { format, isValid } from 'date-fns';

export const AgentLeaseWidget: React.FC = () => {
  const navigate = useNavigate();
  const [leases, setLeases] = useState<LeaseAgreement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeases = async () => {
      try {
        // Fetch leases relevant to the agent (created by them or assigned)
        const data = await leaseApi.getLeases({ role: 'agent' });
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
    pendingApproval: leases.filter(l => l.status === 'pending_approval').length,
    active: leases.filter(l => l.status === 'active').length,
    draft: leases.filter(l => l.status === 'draft').length,
    expiring: leases.filter(l => {
      if (l.status !== 'active' || !l.endDate) return false;
      const endDate = new Date(l.endDate);
      if (!isValid(endDate)) return false;
      
      const daysUntilEnd = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilEnd <= 60 && daysUntilEnd > 0;
    }).length,
  };

  const recentActivity = leases
    .filter(l => l.updatedAt && isValid(new Date(l.updatedAt)))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
      case 'pending_approval': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      case 'pending_signature': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'expired':
      case 'terminated': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lease Management</CardTitle>
          <CardDescription>Manage client leases and approvals</CardDescription>
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
          <CardTitle>Lease Management</CardTitle>
          <CardDescription>Manage client leases and approvals</CardDescription>
        </div>
        <Button onClick={() => navigate('/create-lease?mode=agent')} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Lease for Client
        </Button>
      </CardHeader>
      <CardContent>
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-800 dark:text-orange-100">Pending Approval</span>
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-2xl font-bold text-orange-900 dark:text-orange-50">{stats.pendingApproval}</span>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800 dark:text-green-100">Active Leases</span>
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
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Recent Lease Activity</h4>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((lease) => (
                <div 
                  key={lease.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => navigate(`/leases/${lease.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-700 rounded-full border shadow-sm">
                      <User className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{lease.propertyId}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Updated {lease.updatedAt ? format(new Date(lease.updatedAt), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(lease.status)}>
                    {formatStatus(lease.status)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No lease agreements found</p>
              <Button variant="link" onClick={() => navigate('/create-lease?mode=agent')} className="mt-2">
                Create lease for client
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};