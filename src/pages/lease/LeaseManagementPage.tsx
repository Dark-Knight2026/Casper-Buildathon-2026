/**
 * Lease Management Page
 * Main page for managing all leases
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, TrendingUp, Users } from 'lucide-react';
import LeaseList from '@/components/lease/management/LeaseList';
import RenewalManager from '@/components/lease/management/RenewalManager';
import LeaseAnalyticsDashboard from '@/components/lease/LeaseAnalyticsDashboard';
import { leaseManagementService, LeaseStatistics, RenewalReminder } from '@/services/leaseManagementService';
import { useToast } from '@/hooks/use-toast';

export default function LeaseManagementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [statistics, setStatistics] = useState<LeaseStatistics | null>(null);
  const [renewalReminders, setRenewalReminders] = useState<RenewalReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [stats, reminders] = await Promise.all([
        leaseManagementService.getLeaseStatistics(),
        leaseManagementService.getRenewalReminders()
      ]);
      setStatistics(stats);
      setRenewalReminders(reminders);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load lease data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendReminder = async (reminderId: string) => {
    try {
      await leaseManagementService.sendRenewalReminder(reminderId);
      toast({
        title: 'Success',
        description: 'Renewal reminder sent'
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive'
      });
    }
  };

  const handleCreateRenewalOffer = async (reminderId: string, newRent: number, message: string) => {
    try {
      toast({
        title: 'Success',
        description: 'Renewal offer created'
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create renewal offer',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lease Management</h1>
          <p className="text-gray-600 mt-2">Manage all your lease agreements</p>
        </div>
        <Button onClick={() => navigate('/leases/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Lease
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="leases">
            <FileText className="h-4 w-4 mr-2" />
            All Leases
          </TabsTrigger>
          <TabsTrigger value="renewals">
            <Users className="h-4 w-4 mr-2" />
            Renewals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {statistics && <LeaseAnalyticsDashboard statistics={statistics} />}
        </TabsContent>

        <TabsContent value="leases">
          <LeaseList
            onViewLease={(id) => navigate(`/leases/${id}`)}
            onEditLease={(id) => navigate(`/leases/${id}/edit`)}
            onDeleteLease={async (id) => {
              await leaseManagementService.deleteLease(id);
              loadData();
            }}
          />
        </TabsContent>

        <TabsContent value="renewals">
          <RenewalManager
            reminders={renewalReminders}
            onSendReminder={handleSendReminder}
            onCreateRenewalOffer={handleCreateRenewalOffer}
            onViewLease={(id) => navigate(`/leases/${id}`)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}