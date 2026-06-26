# Tenant Financial Section Architecture
## Sidebar Integration and Component Structure

**Document Version:** 1.0  
**Date:** December 10, 2024  
**Prepared by:** Bob, Software Architect  
**Project:** Real Estate Management Platform - Tenant Dashboard Financial Features

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Sidebar Navigation Structure](#sidebar-navigation-structure)
3. [Component Architecture](#component-architecture)
4. [Routing Configuration](#routing-configuration)
5. [Data Flow and State Management](#data-flow-and-state-management)
6. [Integration Points](#integration-points)
7. [Implementation Plan](#implementation-plan)

---

## 1. Executive Summary

This document defines the technical architecture for integrating the Financial section (TaxCenter and Budget features) into the Tenant Dashboard sidebar. The design ensures seamless integration with existing dashboard infrastructure while maintaining scalability, performance, and user experience standards.

### Key Architectural Decisions

1. **Sidebar Structure**: Expandable Financial section with sub-navigation for TaxCenter and Budget
2. **Component Organization**: Modular, reusable components following established patterns
3. **Routing**: Nested routes under `/dashboard/tenant/financial/*`
4. **State Management**: React Query for server state, Zustand for UI state, URL state for filters
5. **Integration**: Leverages existing dashboard layout, hooks, and shared components

### Design Principles

- **Consistency**: Follow existing dashboard patterns and conventions
- **Modularity**: Build reusable, composable components
- **Performance**: Lazy loading, code splitting, and optimized rendering
- **Accessibility**: WCAG 2.1 AA compliance throughout
- **Maintainability**: Clear separation of concerns and comprehensive documentation

---

## 2. Sidebar Navigation Structure

### 2.1 Navigation Hierarchy

```
Tenant Dashboard
├── Overview (/)
├── Lease (/lease)
├── Payments (/payments)
├── Maintenance (/maintenance)
├── Financial (/financial) ← NEW SECTION
│   ├── TaxCenter (/financial/tax-center)
│   │   ├── Payment History (/financial/tax-center/payments)
│   │   ├── Documents (/financial/tax-center/documents)
│   │   ├── Deductions (/financial/tax-center/deductions)
│   │   ├── Calendar (/financial/tax-center/calendar)
│   │   └── Calculator (/financial/tax-center/calculator)
│   └── Budget (/financial/budget)
│       ├── Dashboard (/financial/budget/dashboard)
│       ├── Expenses (/financial/budget/expenses)
│       ├── Insights (/financial/budget/insights)
│       └── Reports (/financial/budget/reports)
├── Documents (/documents)
├── Calendar (/calendar)
└── Settings (/settings)
```

### 2.2 Sidebar Component Structure

```typescript
// src/components/dashboard/Sidebar.tsx (Enhanced)

import { 
  Home, 
  FileText, 
  CreditCard, 
  Wrench, 
  DollarSign,  // Financial section icon
  Receipt,     // TaxCenter icon
  PieChart,    // Budget icon
  Calendar, 
  Settings 
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: number | string;
  children?: SidebarItem[];
  roles?: string[];
}

const tenantSidebarItems: SidebarItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Home,
    href: '/dashboard/tenant',
  },
  {
    id: 'lease',
    label: 'Lease',
    icon: FileText,
    href: '/dashboard/tenant/lease',
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: CreditCard,
    href: '/dashboard/tenant/payments',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    href: '/dashboard/tenant/maintenance',
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: DollarSign,
    badge: 'NEW', // Optional badge for new feature
    children: [
      {
        id: 'tax-center',
        label: 'TaxCenter',
        icon: Receipt,
        href: '/dashboard/tenant/financial/tax-center',
      },
      {
        id: 'budget',
        label: 'Budget',
        icon: PieChart,
        href: '/dashboard/tenant/financial/budget',
      },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    href: '/dashboard/tenant/documents',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    href: '/dashboard/tenant/calendar',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/dashboard/tenant/settings',
  },
];
```

### 2.3 Sidebar Item Component

```typescript
// src/components/dashboard/SidebarItem.tsx

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SidebarItemProps {
  item: SidebarItem;
  isCollapsed?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ 
  item, 
  isCollapsed = false 
}) => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(
    item.children?.some(child => location.pathname.startsWith(child.href || ''))
  );

  const isActive = item.href 
    ? location.pathname === item.href 
    : item.children?.some(child => location.pathname.startsWith(child.href || ''));

  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const ItemContent = () => (
    <>
      <div className="flex items-center gap-3 flex-1">
        <item.icon 
          className={cn(
            'w-5 h-5 transition-colors',
            isActive ? 'text-accent-500' : 'text-gray-600'
          )} 
        />
        {!isCollapsed && (
          <span className={cn(
            'font-medium text-sm transition-colors',
            isActive ? 'text-accent-500' : 'text-gray-700'
          )}>
            {item.label}
          </span>
        )}
      </div>
      {!isCollapsed && item.badge && (
        <Badge 
          variant="secondary" 
          className="ml-auto text-xs bg-accent-50 text-accent-600 border-accent-200"
        >
          {item.badge}
        </Badge>
      )}
      {!isCollapsed && hasChildren && (
        <div className="ml-auto">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </div>
      )}
    </>
  );

  const baseClassName = cn(
    'flex items-center px-3 py-2.5 rounded-lg transition-all duration-200',
    'hover:bg-gray-100',
    isActive && 'bg-accent-50 border-l-4 border-accent-500',
    isCollapsed && 'justify-center'
  );

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={handleClick}
          className={baseClassName}
          aria-expanded={isExpanded}
          aria-label={`${item.label} section`}
        >
          <ItemContent />
        </button>
        {isExpanded && !isCollapsed && (
          <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
            {item.children?.map((child) => (
              <Link
                key={child.id}
                to={child.href || '#'}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                  'hover:bg-gray-100',
                  location.pathname === child.href && 'bg-accent-50 text-accent-600 font-medium'
                )}
              >
                <child.icon className="w-4 h-4" />
                <span>{child.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link to={item.href || '#'} className={baseClassName}>
      <ItemContent />
    </Link>
  );
};
```

### 2.4 Responsive Sidebar Behavior

**Desktop (≥1024px):**
- Full sidebar width: 280px
- Collapsible to icon-only mode (64px)
- Expandable sub-items with smooth transitions
- Persistent expand/collapse state in localStorage

**Tablet (768px - 1023px):**
- Overlay sidebar with backdrop
- Full width when open (280px)
- Swipe gesture to close
- Auto-close on navigation

**Mobile (<768px):**
- Full-screen overlay sidebar
- Slide-in from left animation
- Touch-optimized spacing (min 44px touch targets)
- Bottom navigation alternative for quick access

```typescript
// src/hooks/useSidebar.ts

import { useState, useEffect } from 'react';
import { useMobileDetection } from './useMobileDetection';

export const useSidebar = () => {
  const { isMobile, isTablet } = useMobileDetection();
  const [isOpen, setIsOpen] = useState(!isMobile && !isTablet);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Auto-close on mobile/tablet
    if (isMobile || isTablet) {
      setIsOpen(false);
    }
  }, [isMobile, isTablet]);

  useEffect(() => {
    // Restore collapsed state from localStorage
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) {
      setIsCollapsed(JSON.parse(stored));
    }
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);
  
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  return {
    isOpen,
    isCollapsed,
    toggleSidebar,
    toggleCollapse,
    isMobile,
    isTablet,
  };
};
```

---

## 3. Component Architecture

### 3.1 Directory Structure

```
src/
├── pages/
│   └── dashboard/
│       └── tenant/
│           ├── TenantOverview.tsx
│           ├── TenantLease.tsx
│           ├── TenantPayments.tsx
│           ├── TenantMaintenance.tsx
│           ├── TenantCalendar.tsx
│           └── financial/
│               ├── FinancialLayout.tsx (wrapper with sub-navigation)
│               ├── TaxCenter.tsx (main TaxCenter page)
│               ├── Budget.tsx (main Budget page)
│               ├── tax-center/
│               │   ├── PaymentHistory.tsx
│               │   ├── DocumentManager.tsx
│               │   ├── DeductionTracker.tsx
│               │   ├── TaxCalendar.tsx
│               │   └── TaxCalculator.tsx
│               └── budget/
│                   ├── BudgetDashboard.tsx
│                   ├── ExpenseTracker.tsx
│                   ├── BudgetInsights.tsx
│                   └── BudgetReports.tsx
├── components/
│   └── dashboard/
│       └── financial/
│           ├── shared/
│           │   ├── FinancialCard.tsx
│           │   ├── FinancialMetric.tsx
│           │   ├── FinancialChart.tsx
│           │   └── FinancialTable.tsx
│           ├── tax/
│           │   ├── DocumentCard.tsx
│           │   ├── DocumentUploader.tsx
│           │   ├── DeductionForm.tsx
│           │   ├── DeductionCard.tsx
│           │   ├── CalendarEvent.tsx
│           │   ├── CalculatorInput.tsx
│           │   └── PaymentHistoryTable.tsx
│           └── budget/
│               ├── BudgetCard.tsx
│               ├── BudgetSetupWizard.tsx
│               ├── ExpenseForm.tsx
│               ├── ExpenseCard.tsx
│               ├── CategoryChart.tsx
│               ├── InsightCard.tsx
│               ├── AlertBanner.tsx
│               └── ReportGenerator.tsx
├── hooks/
│   └── financial/
│       ├── useTaxCenter.ts
│       ├── useTaxDocuments.ts
│       ├── useTaxDeductions.ts
│       ├── useTaxCalendar.ts
│       ├── useBudget.ts
│       ├── useBudgetExpenses.ts
│       ├── useBudgetInsights.ts
│       └── useBudgetAlerts.ts
├── services/
│   └── financial/
│       ├── taxCenterService.ts
│       └── budgetService.ts
└── types/
    └── financial/
        ├── taxCenter.ts
        └── budget.ts
```

### 3.2 Core Component Specifications

#### 3.2.1 FinancialLayout Component

```typescript
// src/pages/dashboard/tenant/financial/FinancialLayout.tsx

import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Receipt, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const financialTabs = [
  {
    id: 'tax-center',
    label: 'TaxCenter',
    icon: Receipt,
    href: '/dashboard/tenant/financial/tax-center',
    description: 'Manage tax documents and deductions',
  },
  {
    id: 'budget',
    label: 'Budget',
    icon: PieChart,
    href: '/dashboard/tenant/financial/budget',
    description: 'Track expenses and manage budget',
  },
];

export const FinancialLayout: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Financial Management
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Manage your rental finances, taxes, and budget all in one place.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Financial sections">
            {financialTabs.map((tab) => (
              <NavLink
                key={tab.id}
                to={tab.href}
                className={({ isActive }) =>
                  cn(
                    'group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                    isActive
                      ? 'border-accent-500 text-accent-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )
                }
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </ErrorBoundary>
  );
};
```

#### 3.2.2 TaxCenter Main Page

```typescript
// src/pages/dashboard/tenant/financial/TaxCenter.tsx

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTaxCenter } from '@/hooks/financial/useTaxCenter';
import { PaymentHistory } from './tax-center/PaymentHistory';
import { DocumentManager } from './tax-center/DocumentManager';
import { DeductionTracker } from './tax-center/DeductionTracker';
import { TaxCalendar } from './tax-center/TaxCalendar';
import { TaxCalculator } from './tax-center/TaxCalculator';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { 
  Receipt, 
  FileText, 
  Calculator, 
  Calendar, 
  TrendingUp 
} from 'lucide-react';

export default function TaxCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  const { summary, isLoading } = useTaxCenter();

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rent Paid (2024)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${summary?.totalRentPaid?.toLocaleString() || '0'}
                </p>
              </div>
              <Receipt className="w-10 h-10 text-primary-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tax Documents</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {summary?.documentCount || 0}
                </p>
              </div>
              <FileText className="w-10 h-10 text-secondary-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Potential Savings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${summary?.potentialSavings?.toLocaleString() || '0'}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-success-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="deductions">Deductions</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PaymentHistory limit={5} />
              <TaxCalculator />
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <PaymentHistory />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentManager />
          </TabsContent>

          <TabsContent value="deductions">
            <DeductionTracker />
          </TabsContent>

          <TabsContent value="calendar">
            <TaxCalendar />
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
```

#### 3.2.3 Budget Main Page

```typescript
// src/pages/dashboard/tenant/financial/Budget.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useBudget } from '@/hooks/financial/useBudget';
import { BudgetDashboard } from './budget/BudgetDashboard';
import { ExpenseTracker } from './budget/ExpenseTracker';
import { BudgetInsights } from './budget/BudgetInsights';
import { BudgetReports } from './budget/BudgetReports';
import { BudgetSetupWizard } from '@/components/dashboard/financial/budget/BudgetSetupWizard';
import { ExpenseForm } from '@/components/dashboard/financial/budget/ExpenseForm';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { EmptyState } from '@/components/ui/empty-state';
import { PieChart } from 'lucide-react';

export default function Budget() {
  const { budget, isLoading, isEmpty } = useBudget();
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isEmpty) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={PieChart}
          title="Create Your First Budget"
          description="Take control of your finances by setting up a budget that works for you."
          action={{
            label: 'Set Up Budget',
            onClick: () => setShowSetupWizard(true),
          }}
          secondaryAction={{
            label: 'Learn About Budgeting',
            onClick: () => window.open('/help/budgeting', '_blank'),
          }}
        />
        {showSetupWizard && (
          <BudgetSetupWizard onClose={() => setShowSetupWizard(false)} />
        )}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {budget?.name || 'My Budget'}
            </h2>
            <p className="text-gray-500 mt-1">
              {budget?.period} budget • {budget?.method}
            </p>
          </div>
          <Button onClick={() => setShowExpenseForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {/* Dashboard Overview */}
        <BudgetDashboard budget={budget} />

        {/* Tabs for Different Views */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ExpenseTracker budgetId={budget?.id} />
          </div>
          <div className="space-y-6">
            <BudgetInsights budgetId={budget?.id} />
          </div>
        </div>

        {/* Reports Section */}
        <BudgetReports budgetId={budget?.id} />

        {/* Modals */}
        {showExpenseForm && (
          <ExpenseForm
            budgetId={budget?.id}
            onClose={() => setShowExpenseForm(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
```

### 3.3 Shared Component Library

#### 3.3.1 FinancialCard Component

```typescript
// src/components/dashboard/financial/shared/FinancialCard.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FinancialCardProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  value?: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const FinancialCard: React.FC<FinancialCardProps> = ({
  title,
  description,
  icon: Icon,
  value,
  trend,
  actions,
  children,
  className,
}) => {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-primary-50 rounded-lg">
              <Icon className="w-5 h-5 text-primary-600" />
            </div>
          )}
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
        </div>
        {actions}
      </CardHeader>
      <CardContent>
        {value !== undefined && (
          <div className="mb-4">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-1 text-sm">
                <span
                  className={cn(
                    'font-medium',
                    trend.direction === 'up' ? 'text-success-600' : 'text-error-600'
                  )}
                >
                  {trend.direction === 'up' ? '+' : '-'}
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
};
```

#### 3.3.2 FinancialTable Component

```typescript
// src/components/dashboard/financial/shared/FinancialTable.tsx

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MoreHorizontal } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface FinancialTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyState?: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  };
  onRowClick?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
}

export function FinancialTable<T extends { id: string }>({
  data,
  columns,
  isLoading,
  emptyState,
  onRowClick,
  actions,
}: FinancialTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <EmptyState
        icon={emptyState.icon}
        title={emptyState.title}
        description={emptyState.description}
      />
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className="font-semibold text-gray-700">
                {column.header}
              </TableHead>
            ))}
            {actions && <TableHead className="w-12"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={item.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render ? column.render(item) : (item as any)[column.key]}
                </TableCell>
              ))}
              {actions && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## 4. Routing Configuration

### 4.1 Route Structure

```typescript
// src/App.tsx (Financial Routes Addition)

import { lazy } from 'react';

// Lazy load Financial pages
const FinancialLayout = lazy(() => import('./pages/dashboard/tenant/financial/FinancialLayout'));
const TaxCenter = lazy(() => import('./pages/dashboard/tenant/financial/TaxCenter'));
const Budget = lazy(() => import('./pages/dashboard/tenant/financial/Budget'));

// Add to existing routes
<Route path="/dashboard/tenant" element={<DashboardLayout />}>
  <Route index element={<TenantOverview />} />
  <Route path="lease" element={<TenantLease />} />
  <Route path="payments" element={<TenantPayments />} />
  <Route path="maintenance" element={<TenantMaintenance />} />
  
  {/* Financial Section Routes */}
  <Route path="financial" element={<FinancialLayout />}>
    <Route index element={<Navigate to="tax-center" replace />} />
    <Route path="tax-center" element={<TaxCenter />} />
    <Route path="budget" element={<Budget />} />
  </Route>
  
  <Route path="documents" element={<TenantDocuments />} />
  <Route path="calendar" element={<TenantCalendar />} />
  <Route path="settings" element={<TenantSettings />} />
</Route>
```

### 4.2 Route Guards and Permissions

```typescript
// src/components/auth/FinancialRouteGuard.tsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface FinancialRouteGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const FinancialRouteGuard: React.FC<FinancialRouteGuardProps> = ({
  children,
  requiredRole = 'tenant',
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
```

### 4.3 Navigation Utilities

```typescript
// src/utils/navigation.ts

export const financialRoutes = {
  taxCenter: {
    root: '/dashboard/tenant/financial/tax-center',
    payments: '/dashboard/tenant/financial/tax-center/payments',
    documents: '/dashboard/tenant/financial/tax-center/documents',
    deductions: '/dashboard/tenant/financial/tax-center/deductions',
    calendar: '/dashboard/tenant/financial/tax-center/calendar',
    calculator: '/dashboard/tenant/financial/tax-center/calculator',
  },
  budget: {
    root: '/dashboard/tenant/financial/budget',
    dashboard: '/dashboard/tenant/financial/budget/dashboard',
    expenses: '/dashboard/tenant/financial/budget/expenses',
    insights: '/dashboard/tenant/financial/budget/insights',
    reports: '/dashboard/tenant/financial/budget/reports',
  },
};

export const navigateToFinancial = (
  navigate: NavigateFunction,
  section: 'taxCenter' | 'budget',
  subsection?: string
) => {
  const route = subsection
    ? financialRoutes[section][subsection as keyof typeof financialRoutes[typeof section]]
    : financialRoutes[section].root;
  navigate(route);
};
```

---

## 5. Data Flow and State Management

### 5.1 State Management Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Components                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  TaxCenter   │  │    Budget    │  │   Shared     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Custom Hooks Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ useTaxCenter │  │  useBudget   │  │useFinancial  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   State Management Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ React Query  │  │   Zustand    │  │  URL State   │      │
│  │ (Server)     │  │  (UI State)  │  │  (Filters)   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  │                  │
┌─────────────────────────┐ │                  │
│    Service Layer        │ │                  │
│  ┌──────────────┐       │ │                  │
│  │taxCenterSvc  │       │ │                  │
│  │budgetService │       │ │                  │
│  └──────┬───────┘       │ │                  │
│         │               │ │                  │
└─────────┼───────────────┘ │                  │
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Supabase    │  │  PostgreSQL  │  │   Storage    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Custom Hooks

#### 5.2.1 useTaxCenter Hook

```typescript
// src/hooks/financial/useTaxCenter.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxCenterService } from '@/services/financial/taxCenterService';

export const useTaxCenter = () => {
  const queryClient = useQueryClient();

  // Fetch tax summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['taxCenter', 'summary'],
    queryFn: () => taxCenterService.getSummary(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch payment history
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['taxCenter', 'payments'],
    queryFn: () => taxCenterService.getPaymentHistory(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch documents
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['taxCenter', 'documents'],
    queryFn: () => taxCenterService.getDocuments(),
  });

  // Upload document mutation
  const uploadDocument = useMutation({
    mutationFn: (file: File) => taxCenterService.uploadDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxCenter', 'documents'] });
    },
  });

  // Add deduction mutation
  const addDeduction = useMutation({
    mutationFn: (deduction: any) => taxCenterService.addDeduction(deduction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxCenter', 'deductions'] });
      queryClient.invalidateQueries({ queryKey: ['taxCenter', 'summary'] });
    },
  });

  return {
    summary,
    payments,
    documents,
    isLoading: summaryLoading || paymentsLoading || documentsLoading,
    uploadDocument: uploadDocument.mutate,
    addDeduction: addDeduction.mutate,
    isUploading: uploadDocument.isPending,
    isAddingDeduction: addDeduction.isPending,
  };
};
```

#### 5.2.2 useBudget Hook

```typescript
// src/hooks/financial/useBudget.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '@/services/financial/budgetService';

export const useBudget = () => {
  const queryClient = useQueryClient();

  // Fetch active budget
  const { data: budget, isLoading, error } = useQuery({
    queryKey: ['budget', 'active'],
    queryFn: () => budgetService.getActiveBudget(),
  });

  // Fetch budget summary
  const { data: summary } = useQuery({
    queryKey: ['budget', 'summary', budget?.id],
    queryFn: () => budgetService.getBudgetSummary(budget!.id),
    enabled: !!budget?.id,
  });

  // Create budget mutation
  const createBudget = useMutation({
    mutationFn: (data: any) => budgetService.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
    },
  });

  // Add expense mutation
  const addExpense = useMutation({
    mutationFn: (expense: any) => budgetService.addExpense(expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['budget', 'summary'] });
    },
  });

  const isEmpty = !isLoading && !budget;

  return {
    budget,
    summary,
    isLoading,
    isEmpty,
    error,
    createBudget: createBudget.mutate,
    addExpense: addExpense.mutate,
    isCreating: createBudget.isPending,
    isAddingExpense: addExpense.isPending,
  };
};
```

### 5.3 Service Layer

#### 5.3.1 TaxCenter Service

```typescript
// src/services/financial/taxCenterService.ts

import { apiClient } from '@/lib/apiClient';
import type { 
  TaxSummary, 
  RentalPayment, 
  TaxDocument, 
  TaxDeduction 
} from '@/types/financial/taxCenter';

export const taxCenterService = {
  // Get tax summary
  getSummary: async (): Promise<TaxSummary> => {
    return apiClient.get('/api/tenant/tax-center/summary');
  },

  // Get payment history
  getPaymentHistory: async (year?: number): Promise<RentalPayment[]> => {
    const params = year ? { year } : {};
    return apiClient.get('/api/tenant/tax-center/payments', { params });
  },

  // Export payment history
  exportPayments: async (year: number, format: 'pdf' | 'csv'): Promise<Blob> => {
    return apiClient.get('/api/tenant/tax-center/payments/export', {
      params: { year, format },
      responseType: 'blob',
    });
  },

  // Get documents
  getDocuments: async (filters?: any): Promise<TaxDocument[]> => {
    return apiClient.get('/api/tenant/tax-center/documents', { params: filters });
  },

  // Upload document
  uploadDocument: async (file: File, metadata?: any): Promise<TaxDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    return apiClient.post('/api/tenant/tax-center/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Delete document
  deleteDocument: async (documentId: string): Promise<void> => {
    return apiClient.delete(`/api/tenant/tax-center/documents/${documentId}`);
  },

  // Get deductions
  getDeductions: async (year?: number): Promise<TaxDeduction[]> => {
    const params = year ? { year } : {};
    return apiClient.get('/api/tenant/tax-center/deductions', { params });
  },

  // Add deduction
  addDeduction: async (deduction: Partial<TaxDeduction>): Promise<TaxDeduction> => {
    return apiClient.post('/api/tenant/tax-center/deductions', deduction);
  },

  // Update deduction
  updateDeduction: async (
    deductionId: string,
    updates: Partial<TaxDeduction>
  ): Promise<TaxDeduction> => {
    return apiClient.put(`/api/tenant/tax-center/deductions/${deductionId}`, updates);
  },

  // Delete deduction
  deleteDeduction: async (deductionId: string): Promise<void> => {
    return apiClient.delete(`/api/tenant/tax-center/deductions/${deductionId}`);
  },

  // Get tax calendar events
  getCalendarEvents: async (year: number): Promise<any[]> => {
    return apiClient.get('/api/tenant/tax-center/calendar/events', { params: { year } });
  },

  // Calculate tax savings
  calculateSavings: async (data: any): Promise<any> => {
    return apiClient.post('/api/tenant/tax-center/calculator/estimate', data);
  },
};
```

#### 5.3.2 Budget Service

```typescript
// src/services/financial/budgetService.ts

import { apiClient } from '@/lib/apiClient';
import type { 
  Budget, 
  BudgetSummary, 
  Expense, 
  BudgetInsight 
} from '@/types/financial/budget';

export const budgetService = {
  // Get active budget
  getActiveBudget: async (): Promise<Budget | null> => {
    return apiClient.get('/api/tenant/budget/active');
  },

  // Get budget by ID
  getBudget: async (budgetId: string): Promise<Budget> => {
    return apiClient.get(`/api/tenant/budget/${budgetId}`);
  },

  // Create budget
  createBudget: async (data: Partial<Budget>): Promise<Budget> => {
    return apiClient.post('/api/tenant/budget', data);
  },

  // Update budget
  updateBudget: async (budgetId: string, updates: Partial<Budget>): Promise<Budget> => {
    return apiClient.put(`/api/tenant/budget/${budgetId}`, updates);
  },

  // Delete budget
  deleteBudget: async (budgetId: string): Promise<void> => {
    return apiClient.delete(`/api/tenant/budget/${budgetId}`);
  },

  // Get budget summary
  getBudgetSummary: async (budgetId: string): Promise<BudgetSummary> => {
    return apiClient.get(`/api/tenant/budget/${budgetId}/summary`);
  },

  // Get expenses
  getExpenses: async (budgetId: string, filters?: any): Promise<Expense[]> => {
    return apiClient.get(`/api/tenant/budget/${budgetId}/expenses`, { params: filters });
  },

  // Add expense
  addExpense: async (budgetId: string, expense: Partial<Expense>): Promise<Expense> => {
    return apiClient.post(`/api/tenant/budget/${budgetId}/expenses`, expense);
  },

  // Update expense
  updateExpense: async (
    budgetId: string,
    expenseId: string,
    updates: Partial<Expense>
  ): Promise<Expense> => {
    return apiClient.put(`/api/tenant/budget/${budgetId}/expenses/${expenseId}`, updates);
  },

  // Delete expense
  deleteExpense: async (budgetId: string, expenseId: string): Promise<void> => {
    return apiClient.delete(`/api/tenant/budget/${budgetId}/expenses/${expenseId}`);
  },

  // Get insights
  getInsights: async (budgetId: string): Promise<BudgetInsight[]> => {
    return apiClient.get(`/api/tenant/budget/${budgetId}/insights`);
  },

  // Get budget analytics
  getAnalytics: async (budgetId: string): Promise<any> => {
    return apiClient.get(`/api/tenant/budget/${budgetId}/analytics`);
  },

  // Generate report
  generateReport: async (budgetId: string, options: any): Promise<Blob> => {
    return apiClient.post(`/api/tenant/budget/${budgetId}/reports/generate`, options, {
      responseType: 'blob',
    });
  },
};
```

### 5.4 Type Definitions

```typescript
// src/types/financial/taxCenter.ts

export interface TaxSummary {
  totalRentPaid: number;
  documentCount: number;
  deductionCount: number;
  potentialSavings: number;
  taxYear: number;
}

export interface RentalPayment {
  id: string;
  tenantId: string;
  propertyId: string;
  date: Date;
  amount: number;
  paymentMethod: PaymentMethod;
  confirmationNumber: string;
  status: PaymentStatus;
  lateFee?: number;
  notes?: string;
  receiptUrl?: string;
}

export type PaymentMethod = 'credit_card' | 'bank_transfer' | 'check' | 'cash' | 'auto_pay';
export type PaymentStatus = 'paid' | 'pending' | 'late' | 'refunded' | 'failed';

export interface TaxDocument {
  id: string;
  tenantId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: Date;
  taxYear: number;
  category: DocumentCategory;
  tags: string[];
  description?: string;
  storageUrl: string;
  thumbnailUrl?: string;
}

export type DocumentCategory = 'income' | 'rental' | 'expenses' | 'tax_forms' | 'other';

export interface TaxDeduction {
  id: string;
  tenantId: string;
  category: DeductionCategory;
  description: string;
  amount: number;
  date: Date;
  taxYear: number;
  documentIds: string[];
  notes?: string;
  eligibilityStatus: EligibilityStatus;
}

export type DeductionCategory = 
  | 'home_office' 
  | 'moving_expenses' 
  | 'business_expenses' 
  | 'state_specific' 
  | 'other';

export type EligibilityStatus = 'eligible' | 'maybe' | 'not_eligible';
```

```typescript
// src/types/financial/budget.ts

export interface Budget {
  id: string;
  tenantId: string;
  name: string;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  categories: BudgetCategory[];
  totalBudget: number;
  method: BudgetMethod;
  settings: BudgetSettings;
}

export type BudgetPeriod = 'monthly' | 'quarterly' | 'annually';
export type BudgetMethod = 'zero_based' | '50_30_20' | 'custom';

export interface BudgetSettings {
  alertThresholds: number[];
  notificationChannels: NotificationChannel[];
  autoRollover: boolean;
}

export type NotificationChannel = 'in_app' | 'email' | 'sms';

export interface BudgetCategory {
  id: string;
  budgetId: string;
  name: string;
  type: CategoryType;
  budgetAmount: number;
  actualAmount: number;
  color: string;
  icon: string;
}

export type CategoryType = 'fixed' | 'variable' | 'one_time';

export interface Expense {
  id: string;
  tenantId: string;
  budgetId: string;
  categoryId: string;
  date: Date;
  amount: number;
  description: string;
  merchant?: string;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
  recurring: boolean;
  recurringFrequency?: RecurringFrequency;
  tags: string[];
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface BudgetSummary {
  budgetId: string;
  period: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  daysRemaining: number;
  categoryBreakdown: CategorySummary[];
  healthScore: number;
  projectedSpending: number;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  status: 'under' | 'on_track' | 'over';
}

export interface BudgetInsight {
  id: string;
  tenantId: string;
  type: InsightType;
  title: string;
  description: string;
  priority: Priority;
  category: string;
  potentialSavings?: number;
  actionable: boolean;
  actionUrl?: string;
}

export type InsightType = 
  | 'spending_pattern' 
  | 'savings_opportunity' 
  | 'budget_optimization' 
  | 'goal_progress' 
  | 'financial_health';

export type Priority = 'high' | 'medium' | 'low';
```

---

## 6. Integration Points

### 6.1 Integration with Existing Tenant Dashboard

#### 6.1.1 Dashboard Overview Integration

```typescript
// src/pages/dashboard/tenant/TenantOverview.tsx (Enhanced)

import { Link } from 'react-router-dom';
import { DollarSign, Receipt, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Add Financial Quick Access Widget
const FinancialQuickAccess = () => {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-accent-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Financial Management</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Manage your rental finances, taxes, and budget
              </p>
            </div>
          </div>
          <Link to="/dashboard/tenant/financial">
            <Button variant="outline">View All</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/dashboard/tenant/financial/tax-center"
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Receipt className="w-8 h-8 text-primary-600" />
            <div>
              <p className="font-medium text-gray-900">TaxCenter</p>
              <p className="text-sm text-gray-500">
                Track deductions and manage tax documents
              </p>
            </div>
          </Link>

          <Link
            to="/dashboard/tenant/financial/budget"
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <PieChart className="w-8 h-8 text-secondary-600" />
            <div>
              <p className="font-medium text-gray-900">Budget</p>
              <p className="text-sm text-gray-500">
                Track expenses and manage your budget
              </p>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

// Add to TenantOverview component
export default function TenantOverview() {
  return (
    <div className="space-y-8">
      {/* Existing content */}
      
      {/* Financial Quick Access Widget */}
      <FinancialQuickAccess />
      
      {/* Rest of the dashboard */}
    </div>
  );
}
```

#### 6.1.2 Payment Integration

```typescript
// Automatically sync rent payments to TaxCenter
// src/hooks/useTenantDashboard.ts (Enhanced)

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useTenantDashboard = () => {
  const queryClient = useQueryClient();
  
  // Existing dashboard logic...
  
  // Sync payments to TaxCenter
  useEffect(() => {
    const syncPaymentsToTaxCenter = async () => {
      // Invalidate TaxCenter payment cache when new payment is made
      queryClient.invalidateQueries({ queryKey: ['taxCenter', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['taxCenter', 'summary'] });
    };
    
    // Listen for payment events
    const unsubscribe = subscribeToPaymentEvents(syncPaymentsToTaxCenter);
    
    return () => unsubscribe();
  }, [queryClient]);
  
  return {
    // Existing returns...
  };
};
```

#### 6.1.3 Document Integration

```typescript
// Share documents between main Documents section and TaxCenter
// src/services/documentService.ts (Enhanced)

export const documentService = {
  // Existing methods...
  
  // Link document to TaxCenter
  linkToTaxCenter: async (documentId: string, taxYear: number, category: string) => {
    return apiClient.post(`/api/documents/${documentId}/link-tax`, {
      taxYear,
      category,
    });
  },
  
  // Get tax-related documents
  getTaxDocuments: async (taxYear?: number) => {
    return apiClient.get('/api/documents/tax', {
      params: { taxYear },
    });
  },
};
```

### 6.2 Integration with Notification System

```typescript
// src/services/financial/notificationService.ts

import { useNotificationStore } from '@/stores/notificationStore';

export const financialNotificationService = {
  // Budget alert notifications
  sendBudgetAlert: (alert: BudgetAlert) => {
    const { addNotification } = useNotificationStore.getState();
    
    addNotification({
      id: alert.id,
      type: alert.severity === 'critical' ? 'error' : 'warning',
      title: 'Budget Alert',
      message: alert.message,
      actionUrl: alert.actionUrl,
      timestamp: new Date(),
    });
  },
  
  // Tax deadline reminders
  sendTaxReminder: (event: TaxCalendarEvent) => {
    const { addNotification } = useNotificationStore.getState();
    
    addNotification({
      id: event.id,
      type: event.importance === 'critical' ? 'error' : 'info',
      title: 'Tax Reminder',
      message: event.description,
      actionUrl: event.actionUrl,
      timestamp: new Date(),
    });
  },
};
```

### 6.3 Integration with Calendar

```typescript
// Sync tax deadlines and budget periods to main calendar
// src/hooks/useCalendarIntegration.ts

import { useQuery } from '@tanstack/react-query';
import { taxCenterService } from '@/services/financial/taxCenterService';
import { budgetService } from '@/services/financial/budgetService';

export const useCalendarIntegration = () => {
  // Fetch tax calendar events
  const { data: taxEvents } = useQuery({
    queryKey: ['calendar', 'tax-events'],
    queryFn: () => taxCenterService.getCalendarEvents(new Date().getFullYear()),
  });
  
  // Fetch budget periods
  const { data: budgetPeriods } = useQuery({
    queryKey: ['calendar', 'budget-periods'],
    queryFn: () => budgetService.getBudgetPeriods(),
  });
  
  // Merge events
  const allEvents = [
    ...(taxEvents || []).map(e => ({
      ...e,
      source: 'taxCenter',
      color: '#FF4405', // Accent color
    })),
    ...(budgetPeriods || []).map(p => ({
      ...p,
      source: 'budget',
      color: '#00C39B', // Secondary color
    })),
  ];
  
  return { events: allEvents };
};
```

---

## 7. Implementation Plan

### 7.1 Phase 1: Foundation (Week 1)

**Tasks:**
1. Update sidebar navigation structure
   - Add Financial section to sidebar
   - Implement expandable sub-items
   - Add keyboard shortcuts (Alt+F, Alt+T, Alt+B)

2. Create routing configuration
   - Add Financial routes to App.tsx
   - Implement FinancialLayout wrapper
   - Set up route guards

3. Set up directory structure
   - Create financial folder structure
   - Set up shared components
   - Create type definitions

4. Implement state management foundation
   - Set up React Query queries
   - Create custom hooks
   - Implement service layer

**Deliverables:**
- Updated Sidebar component
- Financial routes configured
- Directory structure created
- Base hooks and services

### 7.2 Phase 2: TaxCenter (Weeks 2-3)

**Tasks:**
1. Build TaxCenter main page
   - Summary cards
   - Tab navigation
   - Empty states

2. Implement Payment History
   - Payment table
   - Export functionality
   - Filters and search

3. Build Document Manager
   - Upload interface
   - Document grid/list
   - Preview modal
   - Category filters

4. Create Deduction Tracker
   - Deduction form
   - Eligibility checker
   - Deduction list
   - Savings calculator

5. Implement Tax Calendar
   - Calendar view
   - Event list
   - Reminder system
   - Export to calendar

6. Build Tax Calculator
   - Input form
   - Calculation logic
   - Results display
   - Comparison chart

**Deliverables:**
- Complete TaxCenter feature
- All sub-pages functional
- API integration complete
- Tests written

### 7.3 Phase 3: Budget (Weeks 4-5)

**Tasks:**
1. Build Budget main page
   - Setup wizard
   - Dashboard overview
   - Empty states

2. Implement Budget Dashboard
   - Summary cards
   - Category breakdown
   - Spending trends
   - Recent transactions

3. Create Expense Tracker
   - Expense form
   - Expense list
   - Receipt upload
   - Recurring expenses

4. Build Budget Insights
   - Insight cards
   - Financial health score
   - Savings opportunities
   - Goal tracking

5. Implement Budget Reports
   - Report generator
   - Export functionality
   - Custom date ranges
   - Category filters

6. Create Alert System
   - Alert configuration
   - Notification triggers
   - Alert history
   - Dismiss/snooze

**Deliverables:**
- Complete Budget feature
- All sub-pages functional
- API integration complete
- Tests written

### 7.4 Phase 4: Integration & Polish (Week 6)

**Tasks:**
1. Dashboard integration
   - Add Financial widget to Overview
   - Sync payments to TaxCenter
   - Link documents

2. Notification integration
   - Budget alerts
   - Tax reminders
   - Deadline notifications

3. Calendar integration
   - Sync tax events
   - Sync budget periods
   - Color coding

4. Mobile optimization
   - Responsive layouts
   - Touch interactions
   - Mobile navigation

5. Accessibility audit
   - WCAG compliance check
   - Screen reader testing
   - Keyboard navigation

6. Performance optimization
   - Code splitting
   - Lazy loading
   - Caching strategy

**Deliverables:**
- Fully integrated Financial section
- Mobile-optimized
- Accessibility compliant
- Performance optimized

### 7.5 Phase 5: Testing & Launch (Week 7)

**Tasks:**
1. Unit testing
   - Component tests
   - Hook tests
   - Service tests

2. Integration testing
   - API integration tests
   - User flow tests
   - Cross-feature tests

3. E2E testing
   - Critical user journeys
   - Cross-browser testing
   - Mobile testing

4. User acceptance testing
   - Internal testing
   - Beta user testing
   - Feedback collection

5. Documentation
   - User guides
   - Developer docs
   - API documentation

6. Launch preparation
   - Feature flags
   - Monitoring setup
   - Rollout plan

**Deliverables:**
- Comprehensive test coverage
- Documentation complete
- Ready for production launch

---

## Conclusion

This architecture document provides a complete blueprint for integrating the Financial section (TaxCenter and Budget) into the Tenant Dashboard. The design ensures:

1. **Seamless Integration**: Works harmoniously with existing dashboard infrastructure
2. **Scalability**: Modular architecture supports future enhancements
3. **Performance**: Optimized data fetching and rendering strategies
4. **User Experience**: Intuitive navigation and responsive design
5. **Maintainability**: Clear separation of concerns and comprehensive documentation

The phased implementation approach allows for incremental delivery while maintaining code quality and user experience standards.

---

**Document Status:** Final  
**Next Steps:**
1. Review and approve architecture design
2. Begin Phase 1 implementation
3. Set up development environment
4. Create component specifications
5. Start coding!

**Contact:** Bob, Software Architect