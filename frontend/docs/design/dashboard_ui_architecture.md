# Dashboard UI Architecture Design
## Enhanced Component Structure for Tenant, Buyer, and Seller Dashboards

**Document Version:** 1.0  
**Date:** December 10, 2024  
**Prepared by:** Bob, Software Architect  
**Project:** Real Estate Management Platform - Dashboard UI Enhancement

---

## Executive Summary

This document provides a comprehensive system design for enhancing the Tenant, Buyer, and Seller dashboards based on Emma's UI enhancement specifications. The architecture focuses on component reusability, performance optimization, responsive design, and maintainable code structure while implementing modern design patterns and accessibility standards.

---

## Table of Contents

1. [Implementation Approach](#implementation-approach)
2. [User & UI Interaction Behaviors](#user--ui-interaction-behaviors)
3. [Enhanced Component Structure](#enhanced-component-structure)
4. [State Management Architecture](#state-management-architecture)
5. [Responsive Layout System](#responsive-layout-system)
6. [Component Reusability Patterns](#component-reusability-patterns)
7. [Performance Optimization](#performance-optimization)
8. [Animation & Transition Systems](#animation--transition-systems)
9. [Theme & Styling Architecture](#theme--styling-architecture)
10. [Data Flow Architecture](#data-flow-architecture)
11. [Testing Strategy](#testing-strategy)

---

## 1. Implementation Approach

### 1.1 Technology Stack

**Core Technologies:**
- React 18+ with TypeScript
- Tailwind CSS for utility-first styling
- Framer Motion for animations
- Recharts for data visualization
- React Query for data fetching and caching
- Zustand for lightweight state management

**Component Library:**
- Shadcn-ui as base component library
- Custom enhanced components built on top

**Build Tools:**
- Vite for fast development and optimized builds
- ESLint + Prettier for code quality
- Vitest for unit testing
- Playwright for E2E testing

### 1.2 Architecture Principles

1. **Component-First Design**: Build reusable, composable components
2. **Performance by Default**: Lazy loading, code splitting, memoization
3. **Accessibility First**: WCAG 2.1 AA compliance from the start
4. **Mobile-First Responsive**: Design for mobile, enhance for desktop
5. **Progressive Enhancement**: Core functionality works without JS
6. **Type Safety**: Comprehensive TypeScript coverage
7. **Testability**: Components designed for easy testing

### 1.3 Key Design Patterns

- **Compound Components**: For complex UI patterns (e.g., DataTable, Modal)
- **Render Props**: For flexible component composition
- **Custom Hooks**: For reusable logic extraction
- **Context + Hooks**: For theme, auth, and dashboard state
- **Factory Pattern**: For creating dashboard-specific components
- **Observer Pattern**: For real-time updates and notifications

---

## 2. User & UI Interaction Behaviors

### 2.1 Tenant Dashboard User Flows

```
User Entry → Dashboard Load → Quick Stats Display
    ↓
View Rent Payment Status → (Optional) Make Payment
    ↓
Check Maintenance Requests → (Optional) Submit New Request
    ↓
Review Tax Center → Track Deductions → Upload Documents
    ↓
View Notifications → (Optional) Respond to Landlord
```

**Key Interactions:**
1. **Payment Flow**: View → Select Payment Method → Confirm → Receipt
2. **Maintenance Request**: Create → Upload Photos → Submit → Track Status
3. **Tax Management**: View Summary → Add Deduction → Link to Property → Calculate Savings
4. **Document Access**: Browse → Preview → Download → Share

### 2.2 Buyer Dashboard User Flows

```
User Entry → Dashboard Load → View Saved Properties
    ↓
Browse Recommendations → View Details → Add to Wishlist
    ↓
Schedule Tour → Select Date/Time → Confirm
    ↓
Make Offer → Fill Form → Review → Submit
    ↓
Track Offer Status → (Optional) Revise Offer
```

**Key Interactions:**
1. **Property Discovery**: Search → Filter → View Results → Save Favorites
2. **Property Comparison**: Select Properties → Compare Side-by-Side → Remove/Add
3. **Tour Scheduling**: Select Property → Choose Date/Time → Add Notes → Confirm
4. **Offer Creation**: Enter Amount → Set Terms → Add Contingencies → Submit
5. **Tax Planning**: View First-Time Buyer Credits → Calculate Savings → Plan Expenses

### 2.3 Seller Dashboard User Flows

```
User Entry → Dashboard Load → View Listing Performance
    ↓
Review Offers → Accept/Reject/Counter
    ↓
Check Showing Schedule → (Optional) Adjust Availability
    ↓
Monitor Analytics → View Trends → Adjust Pricing
    ↓
Manage Tax Center → Track Capital Gains → Upload Documents
```

**Key Interactions:**
1. **Offer Management**: View Offer → Review Details → Accept/Reject/Counter
2. **Listing Management**: Edit Details → Update Photos → Adjust Price
3. **Showing Coordination**: View Schedule → Confirm/Reschedule → Add Notes
4. **Analytics Review**: View Metrics → Compare to Market → Adjust Strategy
5. **Tax Management**: Track Capital Gains → Record Expenses → Generate Reports

### 2.4 Common Interaction Patterns

**Navigation:**
- Top navigation bar with role-specific menu items
- Sidebar for secondary navigation (collapsible on mobile)
- Breadcrumbs for deep navigation paths
- Quick actions floating button (mobile)

**Data Entry:**
- Inline editing for quick updates
- Modal forms for complex data entry
- Auto-save for long forms
- Validation feedback in real-time

**Feedback:**
- Toast notifications for actions
- Loading states for async operations
- Error messages with recovery options
- Success confirmations with next steps

---

## 3. Enhanced Component Structure

### 3.1 Component Hierarchy

```
DashboardLayout
├── DashboardHeader
│   ├── Logo
│   ├── Navigation
│   ├── SearchBar
│   ├── NotificationBell
│   └── UserMenu
├── DashboardSidebar (collapsible)
│   ├── NavigationMenu
│   ├── QuickActions
│   └── HelpCenter
├── DashboardContent
│   ├── PageHeader
│   │   ├── Title
│   │   ├── Subtitle
│   │   └── Actions (TemplateSelector, BulkActions)
│   ├── QuickStatsGrid
│   │   └── EnhancedStatCard (x4)
│   ├── TaxCenterSection
│   │   ├── TaxSummaryCard
│   │   ├── DeductionTracker
│   │   ├── TaxCalendar
│   │   └── TaxSavingsCalculator
│   ├── MainContentArea
│   │   ├── PropertyRecommendations (Buyer)
│   │   ├── RecentPayments (Tenant)
│   │   ├── OfferManagement (Seller)
│   │   └── RecentActivity
│   └── SidebarWidgets
│       ├── PropertyAlerts
│       ├── MarketInsights
│       └── UpcomingEvents
└── DashboardFooter
```

### 3.2 Core Component Specifications

#### 3.2.1 EnhancedStatCard Component

```typescript
// Component Interface
interface EnhancedStatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  sparklineData?: number[];
  colorScheme: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  isLoading?: boolean;
  onClick?: () => void;
}

// Component Structure
const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  sparklineData,
  colorScheme,
  isLoading,
  onClick
}) => {
  const colorClasses = getColorClasses(colorScheme);
  
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Gradient overlay on hover */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100",
        "transition-opacity duration-300",
        colorClasses.gradientOverlay
      )} />
      
      <CardContent className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {/* Label */}
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
              {label}
            </p>
            
            {/* Value */}
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-3xl font-bold font-mono text-gray-900 tracking-tight">
                {value}
              </p>
            )}
            
            {/* Trend Indicator */}
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                {trend.direction === 'up' ? (
                  <TrendingUp className="w-3 h-3 text-success-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-error-500" />
                )}
                <span className={cn(
                  "font-medium",
                  trend.direction === 'up' ? "text-success-600" : "text-error-600"
                )}>
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
                <span className="text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
          
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              "transition-colors duration-300",
              colorClasses.iconBg,
              "group-hover:" + colorClasses.iconBgHover
            )}>
              <Icon className={cn("w-6 h-6", colorClasses.iconColor)} />
            </div>
          </div>
        </div>
        
        {/* Optional Sparkline */}
        {sparklineData && (
          <div className="mt-4 h-8">
            <Sparkline 
              data={sparklineData} 
              color={colorScheme}
              className="w-full h-full"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

#### 3.2.2 EnhancedDataTable Component

```typescript
// Component Interface
interface EnhancedDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
  pagination?: {
    pageSize: number;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  sorting?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  };
  mobileCardRenderer?: (row: T) => React.ReactNode;
}

// Component Structure with Responsive Behavior
const EnhancedDataTable = <T extends Record<string, any>>({
  data,
  columns,
  isLoading,
  emptyState,
  onRowClick,
  selectable,
  onSelectionChange,
  pagination,
  sorting,
  mobileCardRenderer
}: EnhancedDataTableProps<T>) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const isMobile = useMobileDetection();
  
  // Desktop table view
  const renderDesktopTable = () => (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow className="border-b border-gray-200">
            {selectable && (
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedRows.size === data.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead 
                key={column.id}
                className="font-semibold text-gray-700 text-xs uppercase tracking-wider"
                onClick={() => column.sortable && handleSort(column.id)}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && (
                    <SortIcon 
                      active={sorting?.sortBy === column.id}
                      direction={sorting?.sortOrder}
                    />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoadingSkeleton columns={columns.length} rows={5} />
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0)}>
                {emptyState}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow
                key={row.id || index}
                className={cn(
                  "border-b border-gray-100 transition-colors",
                  "hover:bg-gray-50",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(row.id)}
                      onCheckedChange={() => handleRowSelect(row.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.id} className="font-medium text-gray-900">
                    {column.cell ? column.cell(row) : row[column.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
  
  // Mobile card view
  const renderMobileCards = () => (
    <div className="space-y-4">
      {isLoading ? (
        <MobileCardsSkeleton count={5} />
      ) : data.length === 0 ? (
        emptyState
      ) : (
        data.map((row, index) => (
          <Card 
            key={row.id || index}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onRowClick?.(row)}
          >
            {mobileCardRenderer ? (
              mobileCardRenderer(row)
            ) : (
              <DefaultMobileCard row={row} columns={columns} />
            )}
          </Card>
        ))
      )}
    </div>
  );
  
  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:block">
        {renderDesktopTable()}
      </div>
      
      {/* Mobile view */}
      <div className="md:hidden">
        {renderMobileCards()}
      </div>
      
      {/* Pagination */}
      {pagination && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.pageSize, data.length)} of{' '}
            {data.length} results
          </p>
          <Pagination {...pagination} />
        </div>
      )}
    </>
  );
};
```

#### 3.2.3 EnhancedChartContainer Component

```typescript
interface EnhancedChartContainerProps {
  title: string;
  description?: string;
  timeRange?: {
    value: string;
    options: Array<{ label: string; value: string }>;
    onChange: (value: string) => void;
  };
  exportable?: boolean;
  children: React.ReactNode;
  isLoading?: boolean;
  actions?: React.ReactNode;
}

const EnhancedChartContainer: React.FC<EnhancedChartContainerProps> = ({
  title,
  description,
  timeRange,
  exportable,
  children,
  isLoading,
  actions
}) => {
  return (
    <Card className="p-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {timeRange && (
              <Select value={timeRange.value} onValueChange={timeRange.onChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRange.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {exportable && (
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            {actions}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full h-64" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {children}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
```

### 3.3 Dashboard-Specific Components

#### 3.3.1 Tenant Dashboard Components

```typescript
// TenantPaymentHistory Component
interface TenantPaymentHistoryProps {
  payments: Payment[];
  isLoading: boolean;
  onMakePayment: () => void;
}

// TenantMaintenanceTracker Component
interface TenantMaintenanceTrackerProps {
  requests: MaintenanceRequest[];
  isLoading: boolean;
  onCreateRequest: () => void;
}

// TenantLeaseTimeline Component
interface TenantLeaseTimelineProps {
  leaseInfo: LeaseInfo;
  milestones: LeaseMilestone[];
}
```

#### 3.3.2 Buyer Dashboard Components

```typescript
// BuyerPropertyCard Component
interface BuyerPropertyCardProps {
  property: Property;
  isInWishlist: boolean;
  onToggleWishlist: (id: string) => void;
  onViewDetails: (property: Property) => void;
  onScheduleTour: (id: string) => void;
  onMakeOffer: (id: string) => void;
}

// BuyerOfferTracker Component
interface BuyerOfferTrackerProps {
  offers: Offer[];
  isLoading: boolean;
  onViewOffer: (id: string) => void;
}

// BuyerTourSchedule Component
interface BuyerTourScheduleProps {
  tours: Tour[];
  isLoading: boolean;
  onRescheduleTour: (id: string) => void;
}
```

#### 3.3.3 Seller Dashboard Components

```typescript
// SellerListingPerformance Component
interface SellerListingPerformanceProps {
  listing: Listing;
  analytics: ListingAnalytics;
  isLoading: boolean;
}

// SellerOfferManagement Component
interface SellerOfferManagementProps {
  offers: Offer[];
  isLoading: boolean;
  onAcceptOffer: (id: string) => void;
  onRejectOffer: (id: string) => void;
  onCounterOffer: (id: string, amount: number) => void;
}

// SellerShowingCalendar Component
interface SellerShowingCalendarProps {
  showings: Showing[];
  isLoading: boolean;
  onConfirmShowing: (id: string) => void;
  onRescheduleShowing: (id: string) => void;
}
```

---

## 4. State Management Architecture

### 4.1 State Management Strategy

**Global State (Zustand):**
- User authentication and profile
- Theme preferences (light/dark mode)
- Dashboard template selection
- Notification state
- Real-time collaboration state

**Server State (React Query):**
- Dashboard data (properties, payments, offers)
- Tax information
- Analytics data
- User preferences
- Document lists

**Local State (useState/useReducer):**
- Form inputs
- Modal visibility
- Accordion expansion
- Filter selections
- Temporary UI state

**URL State:**
- Search parameters
- Filter criteria
- Pagination state
- Sort order
- Selected items

### 4.2 State Management Implementation

```typescript
// Global Store (Zustand)
interface DashboardStore {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Theme state
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  
  // Dashboard template
  dashboardTemplate: DashboardTemplate;
  setDashboardTemplate: (template: DashboardTemplate) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  
  // Selection state
  selectedItems: Set<string>;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
}

const useDashboardStore = create<DashboardStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  
  dashboardTemplate: 'grid',
  setDashboardTemplate: (template) => set({ dashboardTemplate: template }),
  
  notifications: [],
  addNotification: (notification) => 
    set((state) => ({ 
      notifications: [...state.notifications, notification] 
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    })),
  
  selectedItems: new Set(),
  toggleSelection: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedItems);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedItems: newSet };
    }),
  clearSelection: () => set({ selectedItems: new Set() }),
  selectAll: (ids) => set({ selectedItems: new Set(ids) })
}));

// Server State Hooks (React Query)
const useTenantDashboard = () => {
  const { data: leaseInfo, isLoading: leaseLoading } = useQuery({
    queryKey: ['tenant', 'lease'],
    queryFn: fetchLeaseInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const { data: rentPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['tenant', 'payments'],
    queryFn: fetchRentPayments,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  
  const { data: maintenanceRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['tenant', 'maintenance'],
    queryFn: fetchMaintenanceRequests,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
  
  return {
    leaseInfo,
    rentPayments,
    maintenanceRequests,
    isLoading: leaseLoading || paymentsLoading || requestsLoading
  };
};

// URL State Hook
const useDashboardUrlState = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filters = useMemo(() => ({
    status: searchParams.get('status') || 'all',
    sortBy: searchParams.get('sortBy') || 'date',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    page: parseInt(searchParams.get('page') || '1', 10),
  }), [searchParams]);
  
  const updateFilters = useCallback((updates: Partial<typeof filters>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      newParams.set(key, String(value));
    });
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);
  
  return { filters, updateFilters };
};
```

### 4.3 Data Flow Patterns

```
User Action → Component Event Handler → State Update → Re-render
                                    ↓
                            Server Mutation (if needed)
                                    ↓
                            Cache Invalidation
                                    ↓
                            Background Refetch
```

**Optimistic Updates Pattern:**
```typescript
const { mutate: makePayment } = useMutation({
  mutationFn: submitPayment,
  onMutate: async (newPayment) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['tenant', 'payments'] });
    
    // Snapshot previous value
    const previousPayments = queryClient.getQueryData(['tenant', 'payments']);
    
    // Optimistically update
    queryClient.setQueryData(['tenant', 'payments'], (old: Payment[]) => [
      ...old,
      { ...newPayment, status: 'pending', id: 'temp-' + Date.now() }
    ]);
    
    return { previousPayments };
  },
  onError: (err, newPayment, context) => {
    // Rollback on error
    queryClient.setQueryData(['tenant', 'payments'], context?.previousPayments);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['tenant', 'payments'] });
  }
});
```

---

## 5. Responsive Layout System

### 5.1 Breakpoint System

```typescript
// Breakpoint configuration
const breakpoints = {
  sm: '640px',   // Small devices (phones)
  md: '768px',   // Medium devices (tablets)
  lg: '1024px',  // Large devices (laptops)
  xl: '1280px',  // Extra large devices (desktops)
  '2xl': '1536px' // 2X large devices (large desktops)
} as const;

// Responsive hook
const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  useEffect(() => {
    const handleResize = debounce(() => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }, 150);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return {
    isMobile: windowSize.width < 768,
    isTablet: windowSize.width >= 768 && windowSize.width < 1024,
    isDesktop: windowSize.width >= 1024,
    windowSize
  };
};
```

### 5.2 Grid System

```typescript
// Responsive grid configuration
interface GridConfig {
  mobile: number;
  tablet: number;
  desktop: number;
}

const ResponsiveGrid: React.FC<{
  columns: GridConfig;
  gap?: number;
  children: React.ReactNode;
}> = ({ columns, gap = 6, children }) => {
  return (
    <div 
      className={cn(
        'grid',
        `grid-cols-${columns.mobile}`,
        `md:grid-cols-${columns.tablet}`,
        `lg:grid-cols-${columns.desktop}`,
        `gap-${gap}`
      )}
    >
      {children}
    </div>
  );
};

// Usage
<ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
  <StatCard />
  <StatCard />
  <StatCard />
  <StatCard />
</ResponsiveGrid>
```

### 5.3 Mobile-First Layout Components

```typescript
// Mobile navigation drawer
const MobileNavDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="w-6 h-6" />
      </Button>
      
      {/* Slide-out drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-80">
          <nav className="space-y-4 mt-8">
            <NavigationItems />
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
};

// Mobile bottom sheet for actions
const MobileActionSheet: React.FC<{
  trigger: React.ReactNode;
  actions: Array<{ label: string; icon: React.ComponentType; onClick: () => void }>;
}> = ({ trigger, actions }) => {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[80vh] rounded-t-2xl"
      >
        <div className="py-6 space-y-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start"
              onClick={action.onClick}
            >
              <action.icon className="w-5 h-5 mr-3" />
              {action.label}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
```

---

## 6. Component Reusability Patterns

### 6.1 Compound Component Pattern

```typescript
// DataTable compound component
const DataTable = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(tableReducer, initialState);
  
  return (
    <DataTableContext.Provider value={{ state, dispatch }}>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {children}
      </div>
    </DataTableContext.Provider>
  );
};

DataTable.Header = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-gray-50 border-b border-gray-200">
      {children}
    </div>
  );
};

DataTable.Body = ({ children }: { children: React.ReactNode }) => {
  const { state } = useDataTableContext();
  
  return (
    <div className="divide-y divide-gray-100">
      {state.isLoading ? <LoadingSkeleton /> : children}
    </div>
  );
};

DataTable.Row = ({ children, onClick }: { 
  children: React.ReactNode;
  onClick?: () => void;
}) => {
  return (
    <div 
      className="hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Usage
<DataTable>
  <DataTable.Header>
    <DataTable.HeaderCell>Name</DataTable.HeaderCell>
    <DataTable.HeaderCell>Status</DataTable.HeaderCell>
  </DataTable.Header>
  <DataTable.Body>
    {data.map((row) => (
      <DataTable.Row key={row.id} onClick={() => handleRowClick(row)}>
        <DataTable.Cell>{row.name}</DataTable.Cell>
        <DataTable.Cell>{row.status}</DataTable.Cell>
      </DataTable.Row>
    ))}
  </DataTable.Body>
</DataTable>
```

### 6.2 Render Props Pattern

```typescript
// Flexible data fetching component
interface DataFetcherProps<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  children: (data: {
    data: T | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  }) => React.ReactNode;
}

const DataFetcher = <T,>({ queryKey, queryFn, children }: DataFetcherProps<T>) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn
  });
  
  return <>{children({ data, isLoading, error, refetch })}</>;
};

// Usage
<DataFetcher
  queryKey={['tenant', 'payments']}
  queryFn={fetchPayments}
>
  {({ data, isLoading, error }) => {
    if (isLoading) return <LoadingSkeleton />;
    if (error) return <ErrorMessage error={error} />;
    return <PaymentList payments={data} />;
  }}
</DataFetcher>
```

### 6.3 Custom Hook Pattern

```typescript
// Reusable dashboard data hook
const useDashboardData = <T,>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: {
    refetchInterval?: number;
    staleTime?: number;
    enabled?: boolean;
  }
) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    enabled: options?.enabled ?? true
  });
  
  const isEmpty = !isLoading && (!data || (Array.isArray(data) && data.length === 0));
  
  return {
    data,
    isLoading,
    error,
    isEmpty,
    refetch
  };
};

// Usage in dashboard components
const TenantDashboard = () => {
  const { data: payments, isLoading, isEmpty } = useDashboardData(
    ['tenant', 'payments'],
    fetchPayments,
    { refetchInterval: 30000 }
  );
  
  // Component logic
};
```

---

## 7. Performance Optimization

### 7.1 Code Splitting Strategy

```typescript
// Route-based code splitting
const TenantDashboard = lazy(() => import('@/pages/dashboard/tenant/TenantOverview'));
const BuyerDashboard = lazy(() => import('@/pages/dashboard/buyer/BuyerOverview'));
const SellerDashboard = lazy(() => import('@/pages/dashboard/seller/SellerOverview'));

// Component-based code splitting
const PropertyMap = lazy(() => import('@/components/PropertyMap'));
const ChartComponents = lazy(() => import('@/components/charts'));

// Usage with Suspense
<Suspense fallback={<DashboardSkeleton />}>
  <TenantDashboard />
</Suspense>
```

### 7.2 Memoization Strategy

```typescript
// Memoize expensive computations
const ExpensiveComponent: React.FC<Props> = ({ data, filters }) => {
  const filteredData = useMemo(() => {
    return data.filter(item => 
      filters.every(filter => filter.fn(item))
    );
  }, [data, filters]);
  
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );
  }, [filteredData]);
  
  return <DataDisplay data={sortedData} />;
};

// Memoize components
const MemoizedStatCard = React.memo(EnhancedStatCard, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.trend?.value === nextProps.trend?.value
  );
});

// Memoize callbacks
const ParentComponent = () => {
  const handleClick = useCallback((id: string) => {
    // Handle click logic
  }, []); // Empty deps if no external dependencies
  
  return <ChildComponent onClick={handleClick} />;
};
```

### 7.3 Virtual Scrolling

```typescript
// Virtual list for large datasets
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualPropertyList: React.FC<{ properties: Property[] }> = ({ properties }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: properties.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated item height
    overscan: 5 // Number of items to render outside visible area
  });
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            <PropertyCard property={properties[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 7.4 Image Optimization

```typescript
// Lazy loading images with intersection observer
const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!isLoaded && (
        <Skeleton className="absolute inset-0" />
      )}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
};
```

### 7.5 Debouncing and Throttling

```typescript
// Debounce for search inputs
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// Usage
const SearchComponent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  useEffect(() => {
    if (debouncedSearchTerm) {
      performSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);
  
  return (
    <Input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search properties..."
    />
  );
};

// Throttle for scroll events
const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());
  
  return useCallback(
    ((...args) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      }
    }) as T,
    [callback, delay]
  );
};
```

---

## 8. Animation & Transition Systems

### 8.1 Framer Motion Configuration

```typescript
// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 }
};

// Page transition wrapper
const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

// List animation
const AnimatedList: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      variants={staggerChildren}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
};

const AnimatedListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div variants={fadeInUp}>
      {children}
    </motion.div>
  );
};
```

### 8.2 Micro-interactions

```typescript
// Button with ripple effect
const RippleButton: React.FC<ButtonProps> = ({ children, onClick, ...props }) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setRipples([...ripples, { x, y, id: Date.now() }]);
    onClick?.(e);
    
    setTimeout(() => {
      setRipples((prev) => prev.slice(1));
    }, 600);
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="relative overflow-hidden"
      {...props}
    >
      {children}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white/30"
          initial={{ width: 0, height: 0, x: ripple.x, y: ripple.y }}
          animate={{ width: 200, height: 200, x: ripple.x - 100, y: ripple.y - 100 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      ))}
    </motion.button>
  );
};

// Card hover effect
const HoverCard: React.FC<CardProps> = ({ children, ...props }) => {
  return (
    <motion.div
      whileHover={{ 
        y: -4,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      }}
      transition={{ duration: 0.2 }}
    >
      <Card {...props}>{children}</Card>
    </motion.div>
  );
};
```

### 8.3 Loading Animations

```typescript
// Skeleton with shimmer effect
const ShimmerSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('relative overflow-hidden bg-gray-200 rounded', className)}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ 
          repeat: Infinity, 
          duration: 1.5,
          ease: 'linear'
        }}
      />
    </div>
  );
};

// Spinner component
const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <motion.div
      className={cn('border-4 border-gray-200 border-t-primary-500 rounded-full', sizeClasses[size])}
      animate={{ rotate: 360 }}
      transition={{ 
        repeat: Infinity, 
        duration: 1,
        ease: 'linear'
      }}
    />
  );
};
```

### 8.4 Reduced Motion Support

```typescript
// Hook to detect reduced motion preference
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
};

// Conditional animation component
const ConditionalMotion: React.FC<{
  children: React.ReactNode;
  variants: any;
}> = ({ children, variants }) => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return <>{children}</>;
  }
  
  return (
    <motion.div variants={variants} initial="initial" animate="animate">
      {children}
    </motion.div>
  );
};
```

---

## 9. Theme & Styling Architecture

### 9.1 CSS Variables System

```css
/* Design tokens as CSS variables */
:root {
  /* Colors - Primary */
  --primary-50: #E8F4FF;
  --primary-500: #2E90FA;
  --primary-600: #1570EF;
  
  /* Colors - Secondary */
  --secondary-50: #E6F9F5;
  --secondary-500: #00C39B;
  
  /* Colors - Accent */
  --accent-50: #FFF4ED;
  --accent-500: #FF4405;
  
  /* Typography */
  --font-primary: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --text-h1: 2.25rem;
  --text-h2: 1.875rem;
  --text-base: 1rem;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  
  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}

/* Dark mode overrides */
[data-theme="dark"] {
  --gray-50: #111827;
  --gray-900: #F9FAFB;
  /* ... other dark mode colors */
}
```

### 9.2 Tailwind Configuration

```typescript
// tailwind.config.ts
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--primary-50)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
        },
        secondary: {
          50: 'var(--secondary-50)',
          500: 'var(--secondary-500)',
        },
        accent: {
          50: 'var(--accent-50)',
          500: 'var(--accent-500)',
        }
      },
      fontFamily: {
        sans: ['var(--font-primary)'],
        mono: ['var(--font-mono)']
      },
      fontSize: {
        'h1': 'var(--text-h1)',
        'h2': 'var(--text-h2)',
      },
      spacing: {
        '1': 'var(--space-1)',
        '4': 'var(--space-4)',
        '6': 'var(--space-6)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
      }
    }
  },
  plugins: []
};
```

### 9.3 Theme Provider

```typescript
// Theme context and provider
interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as 'light' | 'dark') || 'light';
  });
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

---

## 10. Data Flow Architecture

### 10.1 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Dashboard  │  │   Components │  │    Modals    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      State Management                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Zustand   │  │ React Query  │  │  URL State   │      │
│  │ (Global)     │  │ (Server)     │  │  (Routing)   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          │                  ▼                  │
          │         ┌──────────────┐            │
          │         │  API Layer   │            │
          │         └──────┬───────┘            │
          │                │                    │
          │                ▼                    │
          │         ┌──────────────┐            │
          └────────▶│   Backend    │◀───────────┘
                    │   Services   │
                    └──────────────┘
```

### 10.2 API Layer Structure

```typescript
// API client configuration
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API service modules
export const tenantApi = {
  getLeaseInfo: () => apiClient.get('/tenant/lease'),
  getRentPayments: () => apiClient.get('/tenant/payments'),
  getMaintenanceRequests: () => apiClient.get('/tenant/maintenance'),
  submitPayment: (data: PaymentData) => apiClient.post('/tenant/payments', data),
  createMaintenanceRequest: (data: MaintenanceRequestData) => 
    apiClient.post('/tenant/maintenance', data)
};

export const buyerApi = {
  getRecommendations: () => apiClient.get('/buyer/recommendations'),
  getWishlist: () => apiClient.get('/buyer/wishlist'),
  addToWishlist: (propertyId: string) => 
    apiClient.post(`/buyer/wishlist/${propertyId}`),
  scheduleTour: (data: TourData) => apiClient.post('/buyer/tours', data),
  submitOffer: (data: OfferData) => apiClient.post('/buyer/offers', data)
};

export const sellerApi = {
  getListings: () => apiClient.get('/seller/listings'),
  getOffers: () => apiClient.get('/seller/offers'),
  getShowings: () => apiClient.get('/seller/showings'),
  respondToOffer: (offerId: string, response: OfferResponse) =>
    apiClient.post(`/seller/offers/${offerId}/respond`, response)
};
```

---

## 11. Testing Strategy

### 11.1 Unit Testing

```typescript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react';
import { EnhancedStatCard } from './EnhancedStatCard';

describe('EnhancedStatCard', () => {
  it('renders label and value correctly', () => {
    render(
      <EnhancedStatCard
        label="Monthly Rent"
        value="$2,500"
        icon={DollarSign}
        colorScheme="primary"
      />
    );
    
    expect(screen.getByText('Monthly Rent')).toBeInTheDocument();
    expect(screen.getByText('$2,500')).toBeInTheDocument();
  });
  
  it('displays trend indicator when provided', () => {
    render(
      <EnhancedStatCard
        label="Monthly Rent"
        value="$2,500"
        icon={DollarSign}
        colorScheme="primary"
        trend={{ value: 5.2, direction: 'up', label: 'vs last month' }}
      />
    );
    
    expect(screen.getByText('+5.2%')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(
      <EnhancedStatCard
        label="Monthly Rent"
        value="$2,500"
        icon={DollarSign}
        colorScheme="primary"
        onClick={handleClick}
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 11.2 Integration Testing

```typescript
// Dashboard integration test
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantDashboard } from './TenantDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false }
  }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('TenantDashboard Integration', () => {
  it('loads and displays dashboard data', async () => {
    render(<TenantDashboard />, { wrapper });
    
    // Check loading state
    expect(screen.getAllByTestId('skeleton')).toHaveLength(4);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Monthly Rent')).toBeInTheDocument();
      expect(screen.getByText('$2,500')).toBeInTheDocument();
    });
  });
});
```

### 11.3 E2E Testing

```typescript
// Playwright E2E test
import { test, expect } from '@playwright/test';

test.describe('Tenant Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/tenant');
    await page.waitForLoadState('networkidle');
  });
  
  test('displays quick stats cards', async ({ page }) => {
    await expect(page.locator('text=Monthly Rent')).toBeVisible();
    await expect(page.locator('text=Unit')).toBeVisible();
    await expect(page.locator('text=Lease Ends')).toBeVisible();
    await expect(page.locator('text=Open Requests')).toBeVisible();
  });
  
  test('switches dashboard templates', async ({ page }) => {
    // Click template selector
    await page.click('[data-testid="template-selector"]');
    
    // Select list template
    await page.click('text=List View');
    
    // Verify layout changed
    await expect(page.locator('[data-template="list"]')).toBeVisible();
  });
  
  test('opens and submits maintenance request', async ({ page }) => {
    // Click create request button
    await page.click('text=Create Request');
    
    // Fill form
    await page.fill('[name="title"]', 'Leaky faucet');
    await page.fill('[name="description"]', 'Kitchen faucet is dripping');
    await page.selectOption('[name="priority"]', 'medium');
    
    // Submit
    await page.click('text=Submit Request');
    
    // Verify success
    await expect(page.locator('text=Request submitted successfully')).toBeVisible();
  });
});
```

---

## Conclusion

This comprehensive system design provides a solid foundation for enhancing the Tenant, Buyer, and Seller dashboards with modern UI/UX patterns, performance optimizations, and maintainable architecture. The design emphasizes:

1. **Component Reusability**: Shared components reduce duplication and ensure consistency
2. **Performance**: Lazy loading, memoization, and virtual scrolling optimize rendering
3. **Accessibility**: WCAG 2.1 AA compliance built into every component
4. **Responsive Design**: Mobile-first approach with adaptive layouts
5. **State Management**: Clear separation between global, server, and local state
6. **Type Safety**: Comprehensive TypeScript coverage prevents runtime errors
7. **Testability**: Components designed for easy unit, integration, and E2E testing

The architecture supports incremental implementation, allowing the team to deliver value in phases while maintaining code quality and user experience standards.

---

**Next Steps:**
1. Review and approve system design
2. Create detailed component specifications
3. Set up development environment with tooling
4. Begin Phase 1 implementation (Foundation)
5. Conduct regular code reviews and testing
6. Iterate based on user feedback

**Document Status:** Final  
**Next Review Date:** January 10, 2025  
**Contact:** Bob, Software Architect