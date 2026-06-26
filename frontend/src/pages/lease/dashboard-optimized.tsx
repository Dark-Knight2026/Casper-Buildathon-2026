/**
 * Optimized Lease Management Dashboard
 * Performance-optimized version with debouncing, memoization, and lazy loading
 */

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  FileText,
  Plus,
  Search,
  Download,
  TrendingUp,
  DollarSign,
  Home,
  Clock,
  MoreVertical,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { LeaseAgreement, LeaseFilter, LeaseStatus, LeaseType } from '@/types/lease';
import { 
  leaseManagementService, 
  LeaseStatistics,
  RenewalReminder,
  LeaseAmendment 
} from '@/services/leaseManagementService';
import { PDFGenerator } from '@/services/pdfGenerator';
import { DashboardSkeleton, ModalSkeleton } from '@/components/common/SkeletonLoader';
import { performanceMonitor } from '@/utils/performanceMonitor';

// Lazy load heavy components
const LeaseList = lazy(() => import('@/components/lease/management/LeaseList'));
const LeaseDetailModal = lazy(() => import('@/components/lease/management/LeaseDetailModal'));
const LeaseEditForm = lazy(() => import('@/components/lease/management/LeaseEditForm'));
const AmendmentCreator = lazy(() => import('@/components/lease/management/AmendmentCreator'));
const RenewalManager = lazy(() => import('@/components/lease/management/RenewalManager'));

// Memoized Statistics Card Component
const StatisticsCard = React.memo(({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconBgColor, 
  iconColor 
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  iconColor: string;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 ${iconBgColor} rounded-full flex items-center justify-center`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </CardContent>
  </Card>
));

StatisticsCard.displayName = 'StatisticsCard';

export default function LeaseDashboardOptimized() {
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

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Load data with performance monitoring
  const loadData = useCallback(async () => {
    const endMeasure = performanceMonitor.startMeasure('dashboard_load_data');
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
      endMeasure({ success: true });
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lease data',
        variant: 'destructive'
      });
      endMeasure({ success: false, error: true });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Memoized filter and search logic
  const applyFiltersAndSearch = useCallback(async () => {
    const endMeasure = performanceMonitor.startMeasure('dashboard_filter_search');
    
    const currentFilters: LeaseFilter = {
      ...filters,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      type: typeFilter.length > 0 ? typeFilter : undefined,
      searchTerm: debouncedSearchTerm
    };

    const result = await leaseManagementService.searchLeases(
      currentFilters,
      debouncedSearchTerm,
      1,
      1000,
      sortBy,
      sortOrder
    );

    setFilteredLeases(result.leases);
    endMeasure({ resultCount: result.leases.length });
  }, [filters, statusFilter, typeFilter, debouncedSearchTerm, sortBy, sortOrder]);

  useEffect(() => {
    if (!isLoading) {
      applyFiltersAndSearch();
    }
  }, [applyFiltersAndSearch, isLoading]);

  // Memoized callbacks
  const handleSelectLease = useCallback((leaseId: string) => {
    setSelectedLeases(prev =>
      prev.includes(leaseId)
        ? prev.filter(id => id !== leaseId)
        : [...prev, leaseId]
    );
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedLeases(selected ? filteredLeases.map(l => l.id) : []);
  }, [filteredLeases]);

  const handleViewLease = useCallback(async (leaseId: string) => {
    const lease = await leaseManagementService.getLeaseById(leaseId);
    if (lease) {
      setSelectedLease(lease);
      setShowDetailModal(true);
    }
  }, []);

  const handleEditLease = useCallback(async (leaseId: string) => {
    const lease = await leaseManagementService.getLeaseById(leaseId);
    if (lease) {
      setSelectedLease(lease);
      setShowEditModal(true);
    }
  }, []);

  const handleSaveEdit = useCallback(async (updates: Partial<LeaseAgreement>) => {
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
  }, [selectedLease, toast, loadData]);

  const handleRenewLease = useCallback((leaseId: string) => {
    navigate(`/lease/renew/${leaseId}`);
  }, [navigate]);

  const handleTerminateLease = useCallback(async (leaseId: string, date: Date, reason: string) => {
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
  }, [toast, loadData]);

  const handleDownloadLease = useCallback(async (leaseId: string) => {
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
  }, [toast]);

  const handleSendForSignature = useCallback((leaseId: string) => {
    navigate(`/lease/sign/${leaseId}`);
  }, [navigate]);

  const handleExportCSV = useCallback(async () => {
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
  }, [selectedLeases, leases, filteredLeases, toast]);

  const handleBulkStatusUpdate = useCallback(async (newStatus: LeaseStatus) => {
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
  }, [selectedLeases, toast, loadData]);

  const handleSort = useCallback((field: string) => {
    setSortBy(prevSortBy => {
      if (prevSortBy === field) {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        return prevSortBy;
      } else {
        setSortOrder('desc');
        return field;
      }
    });
  }, []);

  // Memoized tab leases calculation
  const tabLeases = useMemo(() => {
    const endMeasure = performanceMonitor.startMeasure('dashboard_calculate_tab_leases');
    
    let result: LeaseAgreement[];
    switch (activeTab) {
      case 'active':
        result = filteredLeases.filter(l => l.status === 'active');
        break;
      case 'pending':
        result = filteredLeases.filter(l => 
          l.status === 'pending-signatures' || 
          l.status === 'pending_approval' ||
          l.status === 'under-review'
        );
        break;
      case 'expiring':
        result = filteredLeases.filter(l => {
          if (l.status !== 'active') return false;
          const daysUntil = Math.ceil((new Date(l.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return daysUntil <= 90 && daysUntil > 0;
        });
        break;
      case 'expired':
        result = filteredLeases.filter(l => l.status === 'expired' || l.status === 'terminated');
        break;
      default:
        result = filteredLeases;
    }
    
    endMeasure({ count: result.length });
    return result;
  }, [activeTab, filteredLeases]);

  if (isLoading) {
    return <DashboardSkeleton />;
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
          <StatisticsCard
            title="Total Leases"
            value={statistics.total}
            subtitle={`${statistics.active} active`}
            icon={FileText}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatisticsCard
            title="Monthly Revenue"
            value={`$${(statistics.totalMonthlyRevenue / 1000).toFixed(1)}k`}
            subtitle="Active leases"
            icon={DollarSign}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
          />
          <StatisticsCard
            title="Expiring Soon"
            value={statistics.expiringIn30Days + statistics.expiringIn60Days}
            subtitle="Next 60 days"
            icon={Clock}
            iconBgColor="bg-orange-100"
            iconColor="text-orange-600"
          />
          <StatisticsCard
            title="Occupancy Rate"
            value={`${statistics.occupancyRate.toFixed(0)}%`}
            subtitle={`${statistics.active} of ${statistics.total}`}
            icon={Home}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search leases by property, tenant, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

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
          <TabsTrigger value="all">All ({filteredLeases.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({statistics?.active || 0})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({statistics?.pending || 0})</TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring ({(statistics?.expiringIn30Days || 0) + (statistics?.expiringIn60Days || 0)})
          </TabsTrigger>
          <TabsTrigger value="expired">Expired ({statistics?.expired || 0})</TabsTrigger>
          <TabsTrigger value="renewals">Renewals ({renewalReminders.length})</TabsTrigger>
        </TabsList>

        {activeTab !== 'renewals' ? (
          <TabsContent value={activeTab} className="mt-6">
            <Suspense fallback={<DashboardSkeleton />}>
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
            </Suspense>
          </TabsContent>
        ) : (
          <TabsContent value="renewals" className="mt-6">
            <Suspense fallback={<DashboardSkeleton />}>
              <RenewalManager
                reminders={renewalReminders}
                onSendReminder={async (id) => {
                  await leaseManagementService.sendRenewalReminder(id);
                  toast({ title: 'Success', description: 'Renewal reminder sent' });
                  await loadData();
                }}
                onCreateRenewalOffer={async () => {
                  toast({ title: 'Success', description: 'Renewal offer sent to tenant' });
                  await loadData();
                }}
                onViewLease={handleViewLease}
              />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>

      {/* Modals with Lazy Loading */}
      <Suspense fallback={<ModalSkeleton />}>
        {showDetailModal && (
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
        )}
      </Suspense>

      <Suspense fallback={<ModalSkeleton />}>
        {showEditModal && (
          <LeaseEditForm
            lease={selectedLease}
            open={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedLease(null);
            }}
            onSave={handleSaveEdit}
          />
        )}
      </Suspense>

      <Suspense fallback={<ModalSkeleton />}>
        {showAmendmentModal && (
          <AmendmentCreator
            leaseId={selectedLease?.id || ''}
            open={showAmendmentModal}
            onClose={() => setShowAmendmentModal(false)}
            onSave={async (amendment) => {
              await leaseManagementService.createAmendment(amendment);
              toast({ title: 'Success', description: 'Amendment created successfully' });
              setShowAmendmentModal(false);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}