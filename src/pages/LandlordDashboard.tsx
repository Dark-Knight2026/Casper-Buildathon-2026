import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useAuth } from '@/hooks/useAuth';
import { useLandlordManagement } from '@/contexts/LandlordManagementContext';
import { useLeaseManagement } from '@/contexts/LeaseManagementContext';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { RoleSwitcher } from '@/components/auth/RoleSwitcher';
import { Property } from '@/types/clientLandlord';
import { LeaseAgreement, LeaseClause, LeaseTemplate } from '@/types/lease';
import PropertyListEnhanced from '@/components/property/PropertyListEnhanced';
import PropertyMetricsCard from '@/components/property/PropertyMetricsCard';
import AddPropertyWizard from '@/components/property/AddPropertyWizard';
import PropertyDetailsPage from '@/components/property/PropertyDetailsPage';
import TenantDialog from '@/components/tenant/TenantDialog';
import LeaseTimeline from '@/components/lease/LeaseTimeline';
import MaintenanceWorkflow from '@/components/maintenance/MaintenanceWorkflow';
import ExportDialog from '@/components/shared/ExportDialog';
import AdvancedFilter, { FilterOption, ActiveFilter, SavedFilter } from '@/components/shared/AdvancedFilter';
import ResponsiveContainer, { MobileCard, MobileGrid, useResponsive } from '@/components/shared/ResponsiveContainer';
import PerformanceMonitor from '@/components/shared/PerformanceMonitor';
import BulkOperations from '@/components/shared/BulkOperations';
import SmartFilterSuggestions from '@/components/shared/SmartFilterSuggestions';
import AdvancedExportDialog from '@/components/shared/AdvancedExportDialog';
import OnboardingTour from '@/components/dashboard/OnboardingTour';
import KeyboardShortcutsDialog from '@/components/dashboard/KeyboardShortcutsDialog';
import DashboardSettings from '@/components/dashboard/DashboardSettings';
import KeyboardShortcutsHandler from '@/components/dashboard/KeyboardShortcutsHandler';
import { LeaseWidget } from '@/components/dashboard/landlord/LeaseWidget';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  DollarSign,
  Calendar,
  User,
  Plus,
  TrendingUp,
  AlertCircle,
  Bell,
  Wrench,
  RefreshCw,
  Download,
  Activity,
  BarChart3,
  Sparkles,
  Brain,
  MessageSquare,
  Shield,
  FileText,
  Receipt,
  Loader2,
  Settings,
  Keyboard
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Lazy load heavy components for code splitting
const AdvancedAnalyticsDashboard = lazy(() => import('@/components/analytics/AdvancedAnalyticsDashboard'));
const PredictiveAnalytics = lazy(() => import('@/components/analytics/PredictiveAnalytics'));
const RealTimeCollaboration = lazy(() => import('@/components/collaboration/RealTimeCollaboration'));
const AIClauseSuggestionEngine = lazy(() => import('@/components/lease/AIClauseSuggestionEngine'));
const ComplianceChecker = lazy(() => import('@/components/lease/ComplianceChecker'));
const LeaseTemplateMarketplace = lazy(() => import('@/components/lease/LeaseTemplateMarketplace'));

// Lazy load tax prep components
const TaxDashboard = lazy(() => import('@/components/landlord/TaxDashboard'));
const IncomeExpenseTracker = lazy(() => import('@/components/landlord/IncomeExpenseTracker'));
const TaxDocumentGenerator = lazy(() => import('@/components/landlord/TaxDocumentGenerator'));
const DepreciationCalculator = lazy(() => import('@/components/landlord/DepreciationCalculator'));
const TaxReportExporter = lazy(() => import('@/components/landlord/TaxReportExporter'));
const BankFeedIntegration = lazy(() => import('@/components/landlord/BankFeedIntegration'));
const EFilingIntegration = lazy(() => import('@/components/landlord/EFilingIntegration'));
const ReceiptScanner = lazy(() => import('@/components/landlord/ReceiptScanner'));
const CPACollaborationPortal = lazy(() => import('@/components/landlord/CPACollaborationPortal'));
const AITaxAssistant = lazy(() => import('@/components/landlord/AITaxAssistant'));
const TaxEducationHub = lazy(() => import('@/components/landlord/TaxEducationHub'));
const TaxCalendar = lazy(() => import('@/components/landlord/TaxCalendar'));

// Loading fallback component
const LoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center p-12">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-300">{message}</p>
    </div>
  </div>
);

export default function LandlordDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isMobile, isTablet } = useResponsive();
  const { preferences } = useDashboardPreferences();
  const navigate = useNavigate();
  const { 
    clients, 
    properties, 
    tenants, 
    notifications,
    getUnreadNotifications,
    getTenantsForProperty 
  } = useLandlordManagement();
  
  const {
    templates,
    checkCompliance
  } = useLeaseManagement();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAddPropertyWizard, setShowAddPropertyWizard] = useState(false);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [showTenantDialog, setShowTenantDialog] = useState(false);
  const [selectedPropertyForTenant, setSelectedPropertyForTenant] = useState<Property | null>(null);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // UX Enhancement States
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showDashboardSettings, setShowDashboardSettings] = useState(false);
  
  // Export state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAdvancedExportDialog, setShowAdvancedExportDialog] = useState(false);
  const [exportType, setExportType] = useState<'properties' | 'tenants' | 'financials' | 'maintenance'>('properties');
  
  // Filter state
  const [propertyFilters, setPropertyFilters] = useState<ActiveFilter[]>([]);
  const [tenantFilters, setTenantFilters] = useState<ActiveFilter[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  // Bulk operations state
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [showBulkOperations, setShowBulkOperations] = useState(false);

  // Smart filter suggestions state
  const [showSmartFilters, setShowSmartFilters] = useState(false);

  // Analytics state
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');

  // Search state with debouncing
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Lease Tools state
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showComplianceChecker, setShowComplianceChecker] = useState(false);
  const [showTemplateMarketplace, setShowTemplateMarketplace] = useState(false);
  const [selectedLeaseForTools, setSelectedLeaseForTools] = useState<LeaseAgreement | null>(null);

  // Tax Prep state - Updated with new sub-tabs
  const [taxPrepSubTab, setTaxPrepSubTab] = useState<'dashboard' | 'tracker' | 'documents' | 'depreciation' | 'export' | 'bank-feeds' | 'e-filing' | 'receipts' | 'cpa-portal' | 'assistant' | 'education' | 'calendar'>('dashboard');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Debounce search input with proper cleanup
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Memoize current landlord to prevent recalculation
  const currentLandlord = useMemo(() => 
    clients.find(c => c.personalInfo.email === user?.email),
    [clients, user?.email]
  );

  // Memoize landlord properties
  const landlordProperties = useMemo(() => 
    currentLandlord ? properties.filter(p => currentLandlord.propertyIds.includes(p.id)) : [],
    [currentLandlord, properties]
  );

  // Memoize landlord tenants
  const landlordTenants = useMemo(() => 
    landlordProperties.flatMap(p => getTenantsForProperty(p.id)),
    [landlordProperties, getTenantsForProperty]
  );
  
  // Memoize financial metrics
  const financialMetrics = useMemo(() => {
    const totalMonthlyIncome = landlordProperties.reduce((sum, property) => 
      sum + (property.financialInfo.monthlyIncome || 0), 0);
    const totalMonthlyExpenses = landlordProperties.reduce((sum, property) => 
      sum + property.financialInfo.expenses.reduce((expSum, exp) => 
        expSum + (exp.recurring ? exp.amount : 0), 0), 0);
    const netMonthlyIncome = totalMonthlyIncome - totalMonthlyExpenses;
    
    return { totalMonthlyIncome, totalMonthlyExpenses, netMonthlyIncome };
  }, [landlordProperties]);

  const { totalMonthlyIncome, totalMonthlyExpenses, netMonthlyIncome } = financialMetrics;
  
  // Memoize additional metrics
  const propertyMetrics = useMemo(() => {
    const rentedProperties = landlordProperties.filter(p => p.status === 'rented').length;
    const availableProperties = landlordProperties.filter(p => p.status === 'available').length;
    const occupancyRate = landlordProperties.length > 0 
      ? (rentedProperties / landlordProperties.length) * 100 
      : 0;
    
    return { rentedProperties, availableProperties, occupancyRate };
  }, [landlordProperties]);

  const { rentedProperties, availableProperties, occupancyRate } = propertyMetrics;
  
  // Memoize average ROI calculation
  const avgRoi = useMemo(() => {
    if (landlordProperties.length === 0) return 0;
    
    return landlordProperties.reduce((sum, property) => {
      const monthlyIncome = property.financialInfo.monthlyIncome || 0;
      const monthlyExpenses = property.financialInfo.expenses
        .filter(exp => exp.recurring)
        .reduce((expSum, exp) => expSum + exp.amount, 0);
      const netIncome = monthlyIncome - monthlyExpenses;
      const roi = property.details.price > 0 
        ? ((netIncome * 12) / property.details.price) * 100 
        : 0;
      return sum + roi;
    }, 0) / landlordProperties.length;
  }, [landlordProperties]);
  
  // Memoize unread notifications
  const unreadNotifications = useMemo(() => 
    currentLandlord ? getUnreadNotifications(currentLandlord.id) : [],
    [currentLandlord, getUnreadNotifications]
  );

  // Memoize property metrics with detailed calculations
  const propertiesWithMetrics = useMemo(() => 
    landlordProperties.map(property => {
      const monthlyIncome = property.financialInfo.monthlyIncome || 0;
      const monthlyExpenses = property.financialInfo.expenses
        .filter(exp => exp.recurring)
        .reduce((sum, exp) => sum + exp.amount, 0);
      const netIncome = monthlyIncome - monthlyExpenses;
      const roi = property.details.price > 0 
        ? ((netIncome * 12) / property.details.price) * 100 
        : 0;
      
      const daysVacant = property.status === 'available' 
        ? Math.floor((new Date().getTime() - property.listingDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        property,
        metrics: {
          monthlyIncome,
          monthlyExpenses,
          netIncome,
          roi,
          daysVacant,
          occupancyRate: property.tenantIds.length > 0 ? 100 : 0
        }
      };
    }),
    [landlordProperties]
  );

  // Memoize properties needing attention
  const propertiesNeedingAttention = useMemo(() => 
    propertiesWithMetrics.filter(
      ({ metrics }) => metrics.daysVacant > 30 || metrics.roi < 3 || metrics.netIncome < 0
    ),
    [propertiesWithMetrics]
  );

  // Memoize mock maintenance requests
  const mockMaintenanceRequests = useMemo(() => 
    landlordProperties.slice(0, 3).map((property, index) => ({
      id: `maint-${index + 1}`,
      propertyId: property.id,
      propertyAddress: property.details.address.street,
      tenantName: 'John Doe',
      title: ['Leaking Faucet', 'AC Not Working', 'Broken Window'][index],
      description: ['Kitchen faucet is dripping constantly', 'Air conditioning unit not cooling', 'Bedroom window cracked'][index],
      category: ['plumbing', 'hvac', 'structural'][index] as 'plumbing' | 'hvac' | 'structural',
      priority: ['medium', 'high', 'urgent'][index] as 'medium' | 'high' | 'urgent',
      status: ['new', 'assigned', 'in-progress'][index] as 'new' | 'assigned' | 'in-progress',
      assignedVendor: index > 0 ? 'ABC Repairs' : undefined,
      estimatedCost: [150, 500, 300][index],
      actualCost: index === 2 ? 280 : undefined,
      createdDate: new Date(Date.now() - index * 86400000),
      assignedDate: index > 0 ? new Date(Date.now() - (index - 1) * 43200000) : undefined,
      dueDate: new Date(Date.now() + (7 - index) * 86400000),
      completedDate: index === 2 ? new Date(Date.now() - 86400000) : undefined,
      photos: [],
      messages: []
    })),
    [landlordProperties]
  );

  // Memoize analytics data
  const analyticsData = useMemo(() => ({
    properties: landlordProperties.map(p => {
      const metrics = propertiesWithMetrics.find(pm => pm.property.id === p.id)?.metrics;
      return {
        id: p.id,
        address: p.details.address.street,
        roi: metrics?.roi || 0,
        occupancyRate: metrics?.occupancyRate || 0,
        monthlyIncome: metrics?.monthlyIncome || 0,
        monthlyExpenses: metrics?.monthlyExpenses || 0,
        netIncome: metrics?.netIncome || 0,
        appreciation: 5.2
      };
    }),
    tenants: landlordTenants.map(t => ({
      id: t.id,
      name: `${t.personalInfo.firstName} ${t.personalInfo.lastName}`,
      onTimePayments: 12,
      latePayments: 0,
      maintenanceRequests: 2,
      leaseRenewalProbability: 85,
      satisfactionScore: 4.5
    })),
    maintenance: [
      { category: 'plumbing', count: 8, avgCost: 250, avgResolutionTime: 3, urgentCount: 2 },
      { category: 'hvac', count: 5, avgCost: 450, avgResolutionTime: 5, urgentCount: 1 },
      { category: 'electrical', count: 6, avgCost: 300, avgResolutionTime: 4, urgentCount: 1 },
      { category: 'structural', count: 3, avgCost: 800, avgResolutionTime: 7, urgentCount: 0 },
      { category: 'appliance', count: 10, avgCost: 200, avgResolutionTime: 2, urgentCount: 0 }
    ],
    financial: {
      totalRevenue: totalMonthlyIncome * 12,
      totalExpenses: totalMonthlyExpenses * 12,
      netIncome: netMonthlyIncome * 12,
      roi: avgRoi,
      occupancyRate: occupancyRate,
      avgRentPerUnit: landlordProperties.length > 0 ? totalMonthlyIncome / landlordProperties.length : 0,
      revenueGrowth: 8.5,
      expenseGrowth: 4.2
    }
  }), [landlordProperties, landlordTenants, propertiesWithMetrics, totalMonthlyIncome, totalMonthlyExpenses, netMonthlyIncome, avgRoi, occupancyRate]);

  // Memoize predictive analytics data
  const predictiveData = useMemo(() => ({
    properties: landlordProperties.map(p => {
      const metrics = propertiesWithMetrics.find(pm => pm.property.id === p.id)?.metrics;
      return {
        id: p.id,
        address: p.details.address.street,
        currentRent: metrics?.monthlyIncome || 0,
        roi: metrics?.roi || 0,
        occupancyRate: metrics?.occupancyRate || 0,
        maintenanceCosts: metrics?.monthlyExpenses || 0
      };
    }),
    tenants: landlordTenants.map(t => ({
      id: t.id,
      name: `${t.personalInfo.firstName} ${t.personalInfo.lastName}`,
      leaseEndDate: t.leaseInfo.endDate,
      paymentHistory: 95,
      satisfactionScore: 4.5,
      renewalProbability: 85
    })),
    historicalData: {
      monthlyRevenue: Array.from({ length: 12 }, (_, i) => totalMonthlyIncome * (0.95 + Math.random() * 0.1)),
      monthlyExpenses: Array.from({ length: 12 }, (_, i) => totalMonthlyExpenses * (0.95 + Math.random() * 0.1)),
      occupancyRates: Array.from({ length: 12 }, () => occupancyRate + (Math.random() * 10 - 5)),
      maintenanceCosts: Array.from({ length: 12 }, (_, i) => 500 + Math.random() * 300)
    }
  }), [landlordProperties, landlordTenants, propertiesWithMetrics, totalMonthlyIncome, totalMonthlyExpenses, occupancyRate]);

  // Memoize filter options
  const propertyFilterOptions: FilterOption[] = useMemo(() => [
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'available', label: 'Available' },
        { value: 'rented', label: 'Rented' },
        { value: 'maintenance', label: 'Under Maintenance' }
      ]
    },
    {
      id: 'city',
      label: 'City',
      type: 'text'
    },
    {
      id: 'roi',
      label: 'ROI (%)',
      type: 'range'
    },
    {
      id: 'monthlyIncome',
      label: 'Monthly Income',
      type: 'range'
    },
    {
      id: 'bedrooms',
      label: 'Bedrooms',
      type: 'number'
    }
  ], []);

  const tenantFilterOptions: FilterOption[] = useMemo(() => [
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    {
      id: 'property',
      label: 'Property',
      type: 'text'
    },
    {
      id: 'monthlyRent',
      label: 'Monthly Rent',
      type: 'range'
    }
  ], []);

  // Memoize export field options
  const propertyExportFields = useMemo(() => [
    { id: 'address', label: 'Address', selected: true, required: true },
    { id: 'city', label: 'City', selected: true },
    { id: 'state', label: 'State', selected: true },
    { id: 'zipCode', label: 'Zip Code', selected: true },
    { id: 'status', label: 'Status', selected: true },
    { id: 'monthlyIncome', label: 'Monthly Income', selected: true },
    { id: 'roi', label: 'ROI', selected: true },
    { id: 'bedrooms', label: 'Bedrooms', selected: false },
    { id: 'bathrooms', label: 'Bathrooms', selected: false },
    { id: 'squareFeet', label: 'Square Feet', selected: false }
  ], []);

  // Use useCallback for event handlers to prevent unnecessary re-renders
  const handlePropertySelect = useCallback((property: Property) => {
    setSelectedProperty(property);
    setShowPropertyDetails(true);
  }, []);

  const handlePropertyEdit = useCallback((property: Property) => {
    setSelectedProperty(property);
    toast({
      title: 'Edit Property',
      description: 'Property editing functionality will be available soon.'
    });
  }, [toast]);

  const handleAddProperty = useCallback(() => {
    setShowAddPropertyWizard(true);
  }, []);

  const handleAddPropertyComplete = useCallback((formData: unknown) => {
    console.log('Adding property:', formData);
    toast({
      title: 'Property Added',
      description: 'Your property has been successfully added to your portfolio.'
    });
    setShowAddPropertyWizard(false);
  }, [toast]);

  const handlePropertyDelete = useCallback(() => {
    if (selectedProperty) {
      toast({
        title: 'Delete Property',
        description: 'Property deletion functionality will be available soon.'
      });
    }
  }, [selectedProperty, toast]);

  const handleBackToList = useCallback(() => {
    setShowPropertyDetails(false);
    setSelectedProperty(null);
  }, []);

  const handleInviteTenant = useCallback(() => {
    if (landlordProperties.length > 0) {
      setSelectedPropertyForTenant(landlordProperties[0]);
      setShowTenantDialog(true);
    } else {
      toast({
        title: 'No Properties',
        description: 'Please add a property first',
        variant: 'destructive'
      });
    }
  }, [landlordProperties, toast]);

  const handleTenantDialogSuccess = useCallback(() => {
    toast({
      title: 'Success',
      description: 'Tenant has been added successfully.'
    });
    setShowTenantDialog(false);
    setSelectedPropertyForTenant(null);
  }, [toast]);

  const handleRenewLease = useCallback((propertyId: string) => {
    toast({
      title: 'Lease Renewal',
      description: 'Lease renewal workflow will be available soon.'
    });
  }, [toast]);

  const handleViewPropertyFromLease = useCallback((propertyId: string) => {
    const property = landlordProperties.find(p => p.id === propertyId);
    if (property) {
      handlePropertySelect(property);
    }
  }, [landlordProperties, handlePropertySelect]);

  const handleUpdateMaintenanceRequest = useCallback((requestId: string, updates: unknown) => {
    console.log('Update maintenance request:', requestId, updates);
    toast({
      title: 'Request Updated',
      description: 'Maintenance request has been updated.'
    });
  }, [toast]);

  const handleAddMaintenanceMessage = useCallback((requestId: string, message: string) => {
    console.log('Add message:', requestId, message);
  }, []);

  const handleExport = useCallback((type: 'properties' | 'tenants' | 'financials' | 'maintenance') => {
    setExportType(type);
    setShowExportDialog(true);
  }, []);

  const handleAdvancedExport = useCallback((type: 'properties' | 'tenants' | 'financials' | 'maintenance') => {
    setExportType(type);
    setShowAdvancedExportDialog(true);
  }, []);

  const getExportData = useCallback(() => {
    switch (exportType) {
      case 'properties':
        return landlordProperties;
      case 'tenants':
        return landlordTenants;
      case 'financials':
        return propertiesWithMetrics;
      case 'maintenance':
        return mockMaintenanceRequests;
      default:
        return [];
    }
  }, [exportType, landlordProperties, landlordTenants, propertiesWithMetrics, mockMaintenanceRequests]);

  const handleSaveFilter = useCallback((name: string, filters: ActiveFilter[]) => {
    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name,
      filters,
      createdAt: new Date()
    };
    setSavedFilters(prev => [...prev, newFilter]);
  }, []);

  const handleLoadFilter = useCallback((filter: SavedFilter) => {
    if (activeTab === 'properties') {
      setPropertyFilters(filter.filters);
    } else if (activeTab === 'tenants') {
      setTenantFilters(filter.filters);
    }
  }, [activeTab]);

  const handleDeleteFilter = useCallback((filterId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
  }, []);

  const handleBulkAction = useCallback((action: { id: string }, selectedIds: string[], options?: Record<string, string>) => {
    console.log('Bulk action:', action, selectedIds, options);
    toast({
      title: 'Bulk Action Complete',
      description: `${action.id} applied to ${selectedIds.length} items`
    });
  }, [toast]);

  const handleApplySmartFilter = useCallback((filters: { field: string; operator: string; value: string | number | Date }[]) => {
    console.log('Apply smart filter:', filters);
    toast({
      title: 'Filter Applied',
      description: 'Smart filter has been applied to your data'
    });
  }, [toast]);

  const handleAdvancedExportSubmit = useCallback((config: unknown) => {
    console.log('Advanced export config:', config);
    toast({
      title: 'Export Complete',
      description: 'Your data has been exported successfully'
    });
  }, [toast]);

  // Lease Tools handlers
  const handleAddClause = useCallback((clause: LeaseClause) => {
    toast({
      title: 'Clause Added',
      description: `"${clause.title}" has been added to the lease`
    });
  }, [toast]);

  const handlePreviewClause = useCallback((clause: LeaseClause) => {
    toast({
      title: clause.title,
      description: clause.content.substring(0, 100) + '...'
    });
  }, [toast]);

  const handleFixComplianceIssue = useCallback((issueId: string) => {
    toast({
      title: 'Issue Fixed',
      description: 'Compliance issue has been resolved'
    });
  }, [toast]);

  const handleViewRule = useCallback((ruleId: string) => {
    toast({
      title: 'Compliance Rule',
      description: 'Opening rule documentation...'
    });
  }, [toast]);

  const handleUseTemplate = useCallback((templateId: string) => {
    toast({
      title: 'Template Selected',
      description: 'Creating new lease from template...'
    });
    setShowTemplateMarketplace(false);
  }, [toast]);

  const handlePreviewTemplate = useCallback((template: LeaseTemplate) => {
    console.log('Preview template:', template);
  }, []);

  // If viewing property details, show the details page
  if (showPropertyDetails && selectedProperty) {
    return (
      <ErrorBoundary>
        <PropertyDetailsPage
          property={selectedProperty}
          onBack={handleBackToList}
          onEdit={() => handlePropertyEdit(selectedProperty)}
          onDelete={handlePropertyDelete}
        />
      </ErrorBoundary>
    );
  }

  // Filter enabled widgets based on preferences
  const enabledWidgets = preferences.layout.widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);

  // Render quick stats cards with responsive layout
  const renderQuickStats = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-6 w-[60px]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!enabledWidgets.find(w => w.id === 'quick-stats')) return null;
    
    return (
      <ResponsiveContainer
        mobileLayout="stack"
        tabletLayout="grid"
        desktopLayout="grid"
        className="mb-6"
        data-tour="quick-stats"
      >
        <MobileCard touchOptimized>
          <CardContent className={preferences.compactMode ? "p-4" : "p-6"}>
            <div className="flex items-center">
              <Home className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{landlordProperties.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {rentedProperties} rented • {availableProperties} available
                </p>
              </div>
            </div>
          </CardContent>
        </MobileCard>

        <MobileCard touchOptimized>
          <CardContent className={preferences.compactMode ? "p-4" : "p-6"}>
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Occupancy Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{occupancyRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {landlordTenants.length} active tenant{landlordTenants.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </MobileCard>

        <MobileCard touchOptimized>
          <CardContent className={preferences.compactMode ? "p-4" : "p-6"}>
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Net Monthly Income</p>
                <p className="text-2xl font-bold text-green-600">
                  ${netMonthlyIncome.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ${totalMonthlyIncome.toLocaleString()} income
                </p>
              </div>
            </div>
          </CardContent>
        </MobileCard>

        <MobileCard touchOptimized>
          <CardContent className={preferences.compactMode ? "p-4" : "p-6"}>
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Average ROI</p>
                <p className="text-2xl font-bold text-purple-600">
                  {avgRoi.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Annual return
                </p>
              </div>
            </div>
          </CardContent>
        </MobileCard>
      </ResponsiveContainer>
    );
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${preferences.animationsEnabled ? 'transition-colors duration-200' : ''} bg-gray-50 dark:bg-gray-900`}>
        {/* Keyboard Shortcuts Handler */}
        <KeyboardShortcutsHandler
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onShowShortcuts={() => setShowKeyboardShortcuts(true)}
          onAddProperty={handleAddProperty}
          onInviteTenant={handleInviteTenant}
        />

        {/* Onboarding Tour */}
        <OnboardingTour />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with Settings Toggle */}
          <div className="mb-8 flex justify-between items-start" data-tour="overview">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Landlord Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Welcome back, {user?.name || 'Landlord'}! Manage your properties and tenants.
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <RoleSwitcher />
              {!isMobile && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
                    aria-label={showPerformanceMonitor ? 'Hide performance monitor' : 'Show performance monitor'}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    {showPerformanceMonitor ? 'Hide' : 'Show'} Performance
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKeyboardShortcuts(true)}
                    title="Keyboard Shortcuts (Ctrl+K)"
                    aria-label="Open keyboard shortcuts"
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDashboardSettings(true)}
                data-tour="settings"
                aria-label="Open dashboard settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={isMobile ? "grid w-full grid-cols-2 gap-2" : "grid w-full grid-cols-12"}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics" data-tour="analytics-tab">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="predictive">
                <Brain className="h-4 w-4 mr-2" />
                Predictive
              </TabsTrigger>
              <TabsTrigger value="collaboration">
                <MessageSquare className="h-4 w-4 mr-2" />
                Team
              </TabsTrigger>
              <TabsTrigger value="lease-tools">
                <Sparkles className="h-4 w-4 mr-2" />
                Lease Tools
              </TabsTrigger>
              <TabsTrigger value="tax-prep" data-tour="tax-prep-tab">
                <Receipt className="h-4 w-4 mr-2" />
                Tax Prep
              </TabsTrigger>
              <TabsTrigger value="properties" data-tour="properties-tab">
                Properties
                {propertiesNeedingAttention.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {propertiesNeedingAttention.length}
                  </Badge>
                )}
              </TabsTrigger>
              {!isMobile && (
                <>
                  <TabsTrigger value="tenants">Tenants</TabsTrigger>
                  <TabsTrigger value="leases">
                    Leases
                    <Badge variant="outline" className="ml-2">
                      <RefreshCw className="h-3 w-3" />
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="maintenance">
                    Maintenance
                    <Badge variant="outline" className="ml-2">
                      {mockMaintenanceRequests.filter(r => r.status === 'new').length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="financials">Financials</TabsTrigger>
                  <TabsTrigger value="notifications">
                    Notifications
                    {unreadNotifications.length > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {unreadNotifications.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Quick Stats - Responsive */}
              {renderQuickStats()}

              {/* Lease Widget */}
              <div className="mb-6">
                <LeaseWidget />
              </div>

              {/* Properties Needing Attention */}
              {enabledWidgets.find(w => w.id === 'properties-attention') && propertiesNeedingAttention.length > 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <CardTitle className="text-orange-900 dark:text-orange-100">
                        Properties Needing Attention ({propertiesNeedingAttention.length})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <MobileGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }}>
                      {propertiesNeedingAttention.slice(0, 3).map(({ property, metrics }) => (
                        <PropertyMetricsCard
                          key={property.id}
                          property={property}
                          metrics={metrics}
                          compact
                        />
                      ))}
                    </MobileGrid>
                    {propertiesNeedingAttention.length > 3 && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-4" 
                        onClick={() => setActiveTab('properties')}
                        aria-label="View all properties needing attention"
                      >
                        View All Properties Needing Attention
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Properties Overview and Notifications - Responsive */}
              <ResponsiveContainer
                mobileLayout="stack"
                tabletLayout="grid"
                desktopLayout="grid"
              >
                {enabledWidgets.find(w => w.id === 'top-properties') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performing Properties</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-20 w-full mb-4" />
                        ))
                      ) : landlordProperties.length > 0 ? (
                        <>
                          <div className="space-y-4">
                            {propertiesWithMetrics
                              .sort((a, b) => b.metrics.roi - a.metrics.roi)
                              .slice(0, 3)
                              .map(({ property, metrics }) => (
                                <MobileCard
                                  key={property.id}
                                  onClick={() => handlePropertySelect(property)}
                                  touchOptimized
                                  className="p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center space-x-3">
                                    <Home className="h-5 w-5 text-blue-600" />
                                    <div className="flex-1">
                                      <p className="font-medium dark:text-gray-100">{property.details.address.street}</p>
                                      <p className="text-sm text-gray-600 dark:text-gray-300">
                                        {property.details.address.city}, {property.details.address.state}
                                      </p>
                                      <div className="flex items-center gap-4 mt-1">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          ${metrics.monthlyIncome.toLocaleString()}/mo
                                        </span>
                                        <span className="text-xs font-medium text-green-600">
                                          ROI: {metrics.roi.toFixed(2)}%
                                        </span>
                                      </div>
                                    </div>
                                    <Badge className={
                                      property.status === 'rented' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                                      property.status === 'available' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                                    }>
                                      {property.status}
                                    </Badge>
                                  </div>
                                </MobileCard>
                              ))}
                          </div>
                          {landlordProperties.length > 3 && (
                            <Button 
                              variant="outline" 
                              className="w-full mt-4" 
                              onClick={() => setActiveTab('properties')}
                              aria-label={`View all ${landlordProperties.length} properties`}
                            >
                              View All Properties ({landlordProperties.length})
                            </Button>
                          )}
                        </>
                      ) : (
                        <EmptyState
                          icon={Home}
                          title="No properties yet"
                          description="Add your first property to start managing your rental portfolio"
                          action={{
                            label: "Add Property",
                            onClick: handleAddProperty
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}

                {enabledWidgets.find(w => w.id === 'notifications') && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Recent Notifications</CardTitle>
                        {unreadNotifications.length > 0 && (
                          <Badge variant="destructive">
                            {unreadNotifications.length} new
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-20 w-full mb-4" />
                        ))
                      ) : unreadNotifications.length > 0 ? (
                        <>
                          <div className="space-y-4">
                            {unreadNotifications.slice(0, 3).map((notification) => (
                              <MobileCard key={notification.id} touchOptimized className="p-3 bg-gray-50 dark:bg-gray-800">
                                <div className="flex items-start space-x-3">
                                  <Bell className="h-5 w-5 text-orange-600 mt-1" />
                                  <div className="flex-1">
                                    <p className="font-medium dark:text-gray-100">{notification.title}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{notification.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {notification.createdAt.toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Badge className={
                                    notification.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                                    notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                                  }>
                                    {notification.priority}
                                  </Badge>
                                </div>
                              </MobileCard>
                            ))}
                          </div>
                          {unreadNotifications.length > 3 && (
                            <Button 
                              variant="outline" 
                              className="w-full mt-4" 
                              onClick={() => setActiveTab('notifications')}
                              aria-label={`View all ${unreadNotifications.length} notifications`}
                            >
                              View All Notifications ({unreadNotifications.length})
                            </Button>
                          )}
                        </>
                      ) : (
                        <EmptyState
                          icon={Bell}
                          title="No notifications"
                          description="You're all caught up! Notifications will appear here"
                        />
                      )}
                    </CardContent>
                  </Card>
                )}
              </ResponsiveContainer>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6 mt-6">
              <Suspense fallback={<LoadingFallback message="Loading analytics dashboard..." />}>
                <AdvancedAnalyticsDashboard
                  data={analyticsData}
                  timeRange={analyticsTimeRange}
                  onTimeRangeChange={setAnalyticsTimeRange}
                />
              </Suspense>
            </TabsContent>

            {/* Predictive Analytics Tab */}
            <TabsContent value="predictive" className="space-y-6 mt-6">
              <Suspense fallback={<LoadingFallback message="Loading predictive analytics..." />}>
                <PredictiveAnalytics
                  data={predictiveData}
                  onExport={() => handleExport('financials')}
                />
              </Suspense>
            </TabsContent>

            {/* Collaboration Tab */}
            <TabsContent value="collaboration" className="space-y-6 mt-6">
              <Suspense fallback={<LoadingFallback message="Loading collaboration tools..." />}>
                <RealTimeCollaboration
                  userId={user?.id || ''}
                  userName={user?.name || 'Landlord'}
                  properties={landlordProperties}
                  tenants={landlordTenants}
                />
              </Suspense>
            </TabsContent>

            {/* Lease Tools Tab */}
            <TabsContent value="lease-tools" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>AI-Powered Lease Tools</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center"
                        onClick={() => navigate('/create-lease')}
                      >
                        <Plus className="h-8 w-8 mb-2 text-primary" />
                        <span>Create New Lease</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center"
                        onClick={() => setShowAISuggestions(true)}
                      >
                        <Sparkles className="h-8 w-8 mb-2 text-purple-600" />
                        <span>AI Clause Suggestions</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center"
                        onClick={() => setShowComplianceChecker(true)}
                      >
                        <Shield className="h-8 w-8 mb-2 text-green-600" />
                        <span>Compliance Checker</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center"
                        onClick={() => setShowTemplateMarketplace(true)}
                      >
                        <FileText className="h-8 w-8 mb-2 text-blue-600" />
                        <span>Template Marketplace</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {showAISuggestions && (
                <Suspense fallback={<LoadingFallback message="Loading AI suggestions..." />}>
                  <AIClauseSuggestionEngine
                    leaseType="residential"
                    jurisdiction="CA"
                    onAddClause={handleAddClause}
                    onPreviewClause={handlePreviewClause}
                  />
                </Suspense>
              )}

              {showComplianceChecker && selectedLeaseForTools && (
                <Suspense fallback={<LoadingFallback message="Checking compliance..." />}>
                  <ComplianceChecker
                    lease={selectedLeaseForTools}
                    onFixIssue={handleFixComplianceIssue}
                    onViewRule={handleViewRule}
                  />
                </Suspense>
              )}

              {showTemplateMarketplace && (
                <Suspense fallback={<LoadingFallback message="Loading templates..." />}>
                  <LeaseTemplateMarketplace
                    templates={templates}
                    onUseTemplate={handleUseTemplate}
                    onPreviewTemplate={handlePreviewTemplate}
                  />
                </Suspense>
              )}
            </TabsContent>

            {/* Tax Prep Tab - Updated with new sub-tabs */}
            <TabsContent value="tax-prep" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-6">
                <Button
                  variant={taxPrepSubTab === 'dashboard' ? 'default' : 'outline'}
                  onClick={() => setTaxPrepSubTab('dashboard')}
                  className="w-full"
                  size="sm"
                >
                  Dashboard
                </Button>
                <Button
                  variant={taxPrepSubTab === 'tracker' ? 'default' : 'outline'}
                  onClick={() => setTaxPrepSubTab('tracker')}
                  className="w-full"
                  size="sm"
                >
                  Tracker
                </Button>
                <Button
                  variant={taxPrepSubTab === 'documents' ? 'default' : 'outline'}
                  onClick={() => setTaxPrepSubTab('documents')}
                  className="w-full"
                  size="sm"
                >
                  Documents
                </Button>
                <Button
                  variant={taxPrepSubTab === 'depreciation' ? 'default' : 'outline'}
                  onClick={() => setTaxPrepSubTab('depreciation')}
                  className="w-full"
                  size="sm"
                >
                  Depreciation
                </Button>
                <Button
                  variant={taxPrepSubTab === 'assistant' ? 'default' : 'outline'}
                  onClick={() => setTaxPrepSubTab('assistant')}
                  className="w-full"
                  size="sm"
                >
                  AI Assistant
                </Button>
                <Button
                  variant={taxPrepSubTab === 'education' ? 'default' : 'outline'}
                  onClick={() => setTaxPrepSubTab('education')}
                  className="w-full"
                  size="sm"
                >
                  Education
                </Button>
                <Button
                  variant={taxPrepSubTab === 'calendar' ? 'default' : 'outline'}
                  onClick={() => setTaxPrepSubTab('calendar')}
                  className="w-full col-span-2 lg:col-span-1"
                  size="sm"
                >
                  Calendar
                </Button>
              </div>

              <Suspense fallback={<LoadingFallback message="Loading tax prep tools..." />}>
                {taxPrepSubTab === 'dashboard' && <TaxDashboard properties={landlordProperties} />}
                {taxPrepSubTab === 'tracker' && <IncomeExpenseTracker properties={landlordProperties} />}
                {taxPrepSubTab === 'documents' && <TaxDocumentGenerator properties={landlordProperties} />}
                {taxPrepSubTab === 'depreciation' && <DepreciationCalculator properties={landlordProperties} />}
                {taxPrepSubTab === 'assistant' && <AITaxAssistant />}
                {taxPrepSubTab === 'education' && <TaxEducationHub />}
                {taxPrepSubTab === 'calendar' && <TaxCalendar />}
              </Suspense>
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties" className="space-y-6 mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Properties</h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Manage your {landlordProperties.length} properties
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowSmartFilters(!showSmartFilters)} variant="outline">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Smart Filters
                  </Button>
                  <Button onClick={() => handleExport('properties')} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button onClick={handleAddProperty}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </Button>
                </div>
              </div>

              {showSmartFilters && (
                <SmartFilterSuggestions
                  data={landlordProperties}
                  onApplyFilter={handleApplySmartFilter}
                />
              )}

              <AdvancedFilter
                options={propertyFilterOptions}
                activeFilters={propertyFilters}
                onFiltersChange={setPropertyFilters}
                savedFilters={savedFilters}
                onSaveFilter={handleSaveFilter}
                onLoadFilter={handleLoadFilter}
                onDeleteFilter={handleDeleteFilter}
              />

              {selectedPropertyIds.length > 0 && (
                <BulkOperations
                  selectedCount={selectedPropertyIds.length}
                  actions={[
                    { id: 'export', label: 'Export Selected', icon: Download },
                    { id: 'update-status', label: 'Update Status', icon: RefreshCw },
                    { id: 'send-notice', label: 'Send Notice', icon: Bell }
                  ]}
                  onAction={handleBulkAction}
                  onClearSelection={() => setSelectedPropertyIds([])}
                />
              )}

              <PropertyListEnhanced
                properties={landlordProperties}
                onPropertySelect={handlePropertySelect}
                onPropertyEdit={handlePropertyEdit}
                filters={propertyFilters}
                selectedIds={selectedPropertyIds}
                onSelectionChange={setSelectedPropertyIds}
              />
            </TabsContent>

            {/* Tenants Tab */}
            <TabsContent value="tenants" className="space-y-6 mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Tenants</h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Manage your {landlordTenants.length} tenants
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleExport('tenants')} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button onClick={handleInviteTenant}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tenant
                  </Button>
                </div>
              </div>

              <AdvancedFilter
                options={tenantFilterOptions}
                activeFilters={tenantFilters}
                onFiltersChange={setTenantFilters}
                savedFilters={savedFilters}
                onSaveFilter={handleSaveFilter}
                onLoadFilter={handleLoadFilter}
                onDeleteFilter={handleDeleteFilter}
              />

              {landlordTenants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {landlordTenants.map((tenant) => (
                    <Card key={tenant.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-lg">
                              {tenant.personalInfo.firstName} {tenant.personalInfo.lastName}
                            </CardTitle>
                          </div>
                          <Badge variant="outline">Active</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Email:</span>
                            <span className="font-medium">{tenant.personalInfo.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Phone:</span>
                            <span className="font-medium">{tenant.personalInfo.phone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Rent:</span>
                            <span className="font-medium">${tenant.leaseInfo.monthlyRent.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Lease End:</span>
                            <span className="font-medium">{tenant.leaseInfo.endDate.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No tenants yet"
                  description="Invite tenants to your properties"
                  action={{
                    label: "Add Tenant",
                    onClick: handleInviteTenant
                  }}
                />
              )}
            </TabsContent>

            {/* Leases Tab */}
            <TabsContent value="leases" className="space-y-6 mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Leases</h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Manage lease agreements and renewals
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => navigate('/create-lease')}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Lease
                  </Button>
                  <Button onClick={() => setActiveTab('lease-tools')} variant="outline">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Lease Tools
                  </Button>
                </div>
              </div>

              {/* Lease Widget */}
              <div className="mb-6">
                <LeaseWidget />
              </div>

              <LeaseTimeline
                properties={landlordProperties}
                onRenewLease={handleRenewLease}
                onViewProperty={handleViewPropertyFromLease}
              />
            </TabsContent>

            {/* Maintenance Tab */}
            <TabsContent value="maintenance" className="space-y-6 mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Maintenance Requests</h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Track and manage maintenance requests
                  </p>
                </div>
                <Button onClick={() => handleExport('maintenance')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <MaintenanceWorkflow
                requests={mockMaintenanceRequests}
                onUpdateRequest={handleUpdateMaintenanceRequest}
                onAddMessage={handleAddMaintenanceMessage}
              />
            </TabsContent>

            {/* Financials Tab */}
            <TabsContent value="financials" className="space-y-6 mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Financial Overview</h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Track income, expenses, and financial performance
                  </p>
                </div>
                <Button onClick={() => handleAdvancedExport('financials')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Total Monthly Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">
                      ${totalMonthlyIncome.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      From {rentedProperties} rented properties
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Total Monthly Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600">
                      ${totalMonthlyExpenses.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Recurring expenses
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Net Monthly Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">
                      ${netMonthlyIncome.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Average ROI: {avgRoi.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Property Financial Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {propertiesWithMetrics.map(({ property, metrics }) => (
                      <div key={property.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{property.details.address.street}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {property.details.address.city}, {property.details.address.state}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-right">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Income</p>
                            <p className="font-medium text-green-600">${metrics.monthlyIncome.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Expenses</p>
                            <p className="font-medium text-red-600">${metrics.monthlyExpenses.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">ROI</p>
                            <p className="font-medium text-blue-600">{metrics.roi.toFixed(2)}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6 mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Notifications</h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {unreadNotifications.length} unread notifications
                  </p>
                </div>
                <Button variant="outline">
                  Mark All as Read
                </Button>
              </div>

              {unreadNotifications.length > 0 ? (
                <div className="space-y-4">
                  {unreadNotifications.map((notification) => (
                    <Card key={notification.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-full ${
                            notification.priority === 'high' ? 'bg-red-100' :
                            notification.priority === 'medium' ? 'bg-yellow-100' :
                            'bg-blue-100'
                          }`}>
                            <Bell className={`h-5 w-5 ${
                              notification.priority === 'high' ? 'text-red-600' :
                              notification.priority === 'medium' ? 'text-yellow-600' :
                              'text-blue-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{notification.title}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {notification.createdAt.toLocaleString()}
                                </p>
                              </div>
                              <Badge variant={
                                notification.priority === 'high' ? 'destructive' :
                                notification.priority === 'medium' ? 'default' :
                                'outline'
                              }>
                                {notification.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Bell}
                  title="No notifications"
                  description="You're all caught up! Notifications will appear here"
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialog Components */}
        {showAddPropertyWizard && (
          <AddPropertyWizard
            onComplete={handleAddPropertyComplete}
            onCancel={() => setShowAddPropertyWizard(false)}
          />
        )}

        {showTenantDialog && (
          <TenantDialog
            open={showTenantDialog}
            onOpenChange={setShowTenantDialog}
            propertyId={selectedPropertyForTenant?.id}
            propertyAddress={selectedPropertyForTenant ? `${selectedPropertyForTenant.details.address.street}, ${selectedPropertyForTenant.details.address.city}` : undefined}
            onSuccess={handleTenantDialogSuccess}
          />
        )}

        {showExportDialog && (
          <ExportDialog
            isOpen={showExportDialog}
            onClose={() => setShowExportDialog(false)}
            data={getExportData()}
            filename={`${exportType}-export`}
            title={`Export ${exportType.charAt(0).toUpperCase() + exportType.slice(1)}`}
          />
        )}

        {showAdvancedExportDialog && (
          <AdvancedExportDialog
            isOpen={showAdvancedExportDialog}
            onClose={() => setShowAdvancedExportDialog(false)}
            data={getExportData()}
            availableFields={propertyExportFields}
            onExport={handleAdvancedExportSubmit}
          />
        )}

        {showKeyboardShortcuts && (
          <KeyboardShortcutsDialog
            isOpen={showKeyboardShortcuts}
            onClose={() => setShowKeyboardShortcuts(false)}
          />
        )}

        {showDashboardSettings && (
          <DashboardSettings
            isOpen={showDashboardSettings}
            onClose={() => setShowDashboardSettings(false)}
          />
        )}

        {/* Performance Monitor - Show only in development and when toggled */}
        {process.env.NODE_ENV === 'development' && showPerformanceMonitor && (
          <PerformanceMonitor />
        )}
      </div>
    </ErrorBoundary>
  );
}