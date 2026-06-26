/**
 * Lease Management Dashboard
 * Comprehensive dashboard for managing all lease agreements
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  RefreshCw,
  Calendar,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LeaseAgreement, LeaseFilter, LeaseStatus, LeaseType } from '@/types/lease';
import { 
  leaseManagementService, 
  LeaseStatistics,
  RenewalReminder,
  LeaseAmendment 
} from '@/services/leaseManagementService';
import { PDFGenerator } from '@/services/pdfGenerator';

// Import management components
import LeaseList from '@/components/lease/management/LeaseList';
import LeaseDetailModal from '@/components/lease/management/LeaseDetailModal';
import LeaseEditForm from '@/components/lease/management/LeaseEditForm';
import AmendmentCreator from '@/components/lease/management/AmendmentCreator';
import RenewalManager from '@/components/lease/management/RenewalManager';

export default function LeaseDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [statistics, setStatistics] = useState<LeaseStatistics | null>(null);
  const [leases, setLeases] = useState<LeaseAgreement[]>([]);
  const [filteredLeases, setFilteredLeases] = useState<LeaseAgreement[]>([]);
  const [renewalReminders, setRenewalReminders] = useState<RenewalReminder[]>([]);
  const [selectedLeases, setSelectedLeases] = useState<string[]>([]);
  const [selectedLease, setSelectedLease] = useState<LeaseAgreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<LeaseFilter>({});
  const [statusFilter, setStatusFilter] = useState<LeaseStatus[]>([]);
  const [typeFilter, setTypeFilter] = useState<LeaseType[]>([]);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stats, searchResult, reminders] = await Promise.all([
        leaseManagementService.getLeaseStatistics(),
        leaseManagementService.searchLeases({}, '', 1, 1000),
        leaseManagementService.getRenewalReminders()
      ]);

      setStatistics(stats);
      setLeases(searchResult.leases);
      setRenewalReminders(reminders);
    } catch (error) {
      console.error('Failed to load data:', error);
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

  // Apply filters and search
  const applyFiltersAndSearch = useCallback(async () => {
    const currentFilters: LeaseFilter = {
      ...filters,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      type: typeFilter.length > 0 ? typeFilter : undefined,
      searchTerm
    };

    const result = await leaseManagementService.searchLeases(
      currentFilters,
      searchTerm,
      1,
      1000,
      sortBy,
      sortOrder
    );

    setFilteredLeases(result.leases);
  }, [filters, statusFilter, typeFilter, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  const handleSelectLease = (leaseId: string) => {
    setSelectedLeases(prev =>
      prev.includes(leaseId)
        ? prev.filter(id => id !== leaseId)
        : [...prev, leaseId]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedLeases(selected ? filteredLeases.map(l => l.id) : []);
  };

  const handleViewLease = async (leaseId: string) => {
    const lease = await leaseManagementService.getLeaseById(leaseId);
    if (lease) {
      setSelectedLease(lease);
      setShowDetailModal(true);
    }
  };

  const handleEditLease = async (leaseId: string) => {
    const lease = await leaseManagementService.getLeaseById(leaseId);
    if (lease) {
      setSelectedLease(lease);
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async (updates: Partial<LeaseAgreement>) => {
    if (!selectedLease) return;

    try {
      await leaseManagementService.updateLease(selectedLease.id, updates);
      toast({
        title: 'Success',
        description: 'Lease updated successfully'
      });
      await loadData();
      setShowEditModal(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update lease',
        variant: 'destructive'
      });
    }
  };

  const handleRenewLease = (leaseId: string) => {
    navigate(`/lease/renew/${leaseId}`);
  };

  const handleTerminateLease = async (leaseId: string, date: Date, reason: string) => {
    try {
      await leaseManagementService.terminateLease(leaseId, date, reason, 'current-user');
      toast({
        title: 'Success',
        description: 'Lease terminated successfully'
      });
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to terminate lease',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadLease = async (leaseId: string) => {
    try {
      const lease = await leaseManagementService.getLeaseById(leaseId);
      if (lease) {
        const pdfBlob = await PDFGenerator.generateLeasePDF(lease, false);
        PDFGenerator.downloadPDF(pdfBlob, `lease_${lease.id}.pdf`);
        toast({
          title: 'Success',
          description: 'Lease PDF downloaded'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download lease',
        variant: 'destructive'
      });
    }
  };

  const handleSendForSignature = (leaseId: string) => {
    navigate(`/lease/sign/${leaseId}`);
  };

  const handleCreateAmendment = async (amendment: Omit<LeaseAmendment, 'id' | 'createdAt'>) => {
    try {
      await leaseManagementService.createAmendment(amendment);
      toast({
        title: 'Success',
        description: 'Amendment created successfully'
      });
      setShowAmendmentModal(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create amendment',
        variant: 'destructive'
      });
    }
  };

  const handleSendRenewalReminder = async (reminderId: string) => {
    try {
      await leaseManagementService.sendRenewalReminder(reminderId);
      toast({
        title: 'Success',
        description: 'Renewal reminder sent'
      });
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive'
      });
    }
  };

  const handleCreateRenewalOffer = async (reminderId: string, newRent: number, message: string) => {
    toast({
      title: 'Success',
      description: 'Renewal offer sent to tenant'
    });
    await loadData();
  };

  const handleExportCSV = async () => {
    try {
      const csv = await leaseManagementService.exportToCSV(selectedLeases.length > 0 
        ? leases.filter(l => selectedLeases.includes(l.id))
        : filteredLeases
      );
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leases_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Leases exported to CSV'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export leases',
        variant: 'destructive'
      });
    }
  };

  const handleBulkStatusUpdate = async (newStatus: LeaseStatus) => {
    if (selectedLeases.length === 0) return;

    try {
      await leaseManagementService.bulkUpdateStatus(selectedLeases, newStatus);
      toast({
        title: 'Success',
        description: `${selectedLeases.length} lease(s) updated`
      });
      setSelectedLeases([]);
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update leases',
        variant: 'destructive'
      });
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Get leases for current tab
  const getTabLeases = () => {
    switch (activeTab) {
      case 'active':
        return filteredLeases.filter(l => l.status === 'active');
      case 'pending':
        return filteredLeases.filter(l => 
          l.status === 'pending-signatures' || 
          l.status === 'pending_approval' ||
          l.status === 'under-review'
        );
      case 'expiring':
        return filteredLeases.filter(l => {
          if (l.status !== 'active') return false;
          const daysUntil = Math.ceil((new Date(l.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return daysUntil <= 90 && daysUntil > 0;
        });
      case 'expired':
        return filteredLeases.filter(l => l.status === 'expired' || l.status === 'terminated');
      case 'renewals':
        return filteredLeases; // Will show renewal manager
      default:
        return filteredLeases;
    }
  };

  const tabLeases = getTabLeases();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading lease data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lease Management</h1>
          <p className="text-gray-600 mt-1">Manage all your lease agreements in one place</p>
        </div>
        <Button onClick={() => navigate('/create-lease')} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create New Lease
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Leases</p>
                  <p className="text-3xl font-bold text-gray-900">{statistics.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {statistics.active} active
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-green-900">
                    ${(statistics.totalMonthlyRevenue / 1000).toFixed(1)}k
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <p className="text-xs text-green-600">Active leases</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Expiring Soon</p>
                  <p className="text-3xl font-bold text-orange-900">
                    {statistics.expiringIn30Days + statistics.expiringIn60Days}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Next 60 days
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Occupancy Rate</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {statistics.occupancyRate.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {statistics.active} of {statistics.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Home className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search leases by property, tenant, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter[0] || 'all'}
              onValueChange={(value) => setStatusFilter(value === 'all' ? [] : [value as LeaseStatus])}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending-signatures">Pending Signatures</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={typeFilter[0] || 'all'}
              onValueChange={(value) => setTypeFilter(value === 'all' ? [] : [value as LeaseType])}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="residential-long-term">Residential Long-term</SelectItem>
                <SelectItem value="residential-short-term">Residential Short-term</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="student-housing">Student Housing</SelectItem>
              </SelectContent>
            </Select>

            {/* Bulk Actions */}
            {selectedLeases.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Bulk Actions ({selectedLeases.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Selected
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('active')}>
                    Set as Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('terminated')}>
                    Terminate Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Export */}
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">
            All ({filteredLeases.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({statistics?.active || 0})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({statistics?.pending || 0})
          </TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring ({(statistics?.expiringIn30Days || 0) + (statistics?.expiringIn60Days || 0)})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Expired ({statistics?.expired || 0})
          </TabsTrigger>
          <TabsTrigger value="renewals">
            Renewals ({renewalReminders.length})
          </TabsTrigger>
        </TabsList>

        {/* All Tabs except Renewals */}
        {activeTab !== 'renewals' ? (
          <TabsContent value={activeTab} className="mt-6">
            <LeaseList
              leases={tabLeases}
              selectedLeases={selectedLeases}
              onSelectLease={handleSelectLease}
              onSelectAll={handleSelectAll}
              onView={handleViewLease}
              onEdit={handleEditLease}
              onRenew={handleRenewLease}
              onTerminate={(id) => handleTerminateLease(id, new Date(), 'User requested termination')}
              onDownload={handleDownloadLease}
              onSendForSignature={handleSendForSignature}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </TabsContent>
        ) : (
          <TabsContent value="renewals" className="mt-6">
            <RenewalManager
              reminders={renewalReminders}
              onSendReminder={handleSendRenewalReminder}
              onCreateRenewalOffer={handleCreateRenewalOffer}
              onViewLease={handleViewLease}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Modals */}
      <LeaseDetailModal
        lease={selectedLease}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedLease(null);
        }}
        onEdit={() => {
          setShowDetailModal(false);
          setShowEditModal(true);
        }}
        onRenew={() => {
          if (selectedLease) handleRenewLease(selectedLease.id);
        }}
        onTerminate={() => {
          if (selectedLease) {
            handleTerminateLease(selectedLease.id, new Date(), 'User requested termination');
          }
        }}
        onDownload={() => {
          if (selectedLease) handleDownloadLease(selectedLease.id);
        }}
        onSendForSignature={() => {
          if (selectedLease) handleSendForSignature(selectedLease.id);
        }}
      />

      <LeaseEditForm
        lease={selectedLease}
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedLease(null);
        }}
        onSave={handleSaveEdit}
      />

      <AmendmentCreator
        leaseId={selectedLease?.id || ''}
        open={showAmendmentModal}
        onClose={() => setShowAmendmentModal(false)}
        onSave={handleCreateAmendment}
      />
    </div>
  );
}