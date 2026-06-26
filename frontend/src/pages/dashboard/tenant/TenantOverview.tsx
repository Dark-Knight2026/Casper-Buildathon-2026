import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useAuth } from '@/hooks/useAuth';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { TemplateSelector } from '@/components/dashboard/TemplateSelector';
import { DashboardTemplate } from '@/types/dashboard';
import { TaxSummaryCard } from '@/components/dashboard/tax/TaxSummaryCard';
import { DeductionTracker } from '@/components/dashboard/tax/DeductionTracker';
import { TaxCalendar } from '@/components/dashboard/tax/TaxCalendar';
import { TaxSavingsCalculator } from '@/components/dashboard/tax/TaxSavingsCalculator';
import { taxService } from '@/services/taxService';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { EnhancedStatCard } from '@/components/dashboard/shared/EnhancedStatCard';
import { EnhancedChartContainer } from '@/components/dashboard/shared/EnhancedChartContainer';
import { TaxSummary, TaxDeduction, TaxCalendarEvent } from '@/types/tax';
import {
  Home,
  DollarSign,
  Wrench,
  Bell,
  CreditCard,
  Calendar
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

interface RentPaymentHistory {
  id: string;
  month: string;
  amount: number;
  dueDate: string;
  status: string;
}

export default function TenantOverview() {
  const { user } = useAuth();
  const [template, setTemplate] = useState<DashboardTemplate>('grid');
  
  const {
    isLoading,
    leaseInfo,
    rentPayments,
    maintenanceRequests,
    notifications
  } = useTenantDashboard();

  // Tax Center State
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [taxDeductions, setTaxDeductions] = useState<TaxDeduction[]>([]);
  const [taxCalendar, setTaxCalendar] = useState<TaxCalendarEvent[]>([]);
  const [rentHistory, setRentHistory] = useState<RentPaymentHistory[]>([]);
  const [taxLoading, setTaxLoading] = useState(true);

  useEffect(() => {
    const loadTaxData = async () => {
      setTaxLoading(true);
      try {
        const [summary, deductions, calendar, history] = await Promise.all([
          taxService.getTenantTaxSummary('tenant_123'),
          taxService.getMovingExpenses(),
          taxService.getTaxCalendar(2025),
          taxService.getRentPaymentHistory('tenant_123')
        ]);
        setTaxSummary(summary);
        setTaxDeductions(deductions);
        setTaxCalendar(calendar);
        setRentHistory(history);
      } catch (error) {
        console.error('Failed to load tax data', error);
      } finally {
        setTaxLoading(false);
      }
    };
    loadTaxData();
  }, []);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-success-100 text-success-700 border-success-200';
      case 'Pending': return 'bg-warning-100 text-warning-700 border-warning-200';
      case 'Overdue': return 'bg-error-100 text-error-700 border-error-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Memoized data for performance
  const openRequestsCount = useMemo(() => 
    maintenanceRequests.filter(r => r.status !== 'Completed').length, 
    [maintenanceRequests]
  );

  const recentPayments = useMemo(() => 
    rentPayments.slice(0, 3), 
    [rentPayments]
  );

  const chartData = useMemo(() => 
    rentPayments.slice(0, 6).reverse(), 
    [rentPayments]
  );

  const renderQuickStats = () => {
    if (isLoading || !leaseInfo) {
      return Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-[60px]" />
              </div>
            </div>
          </CardContent>
        </Card>
      ));
    }

    return (
      <>
        <EnhancedStatCard
          label="Monthly Rent"
          value={`$${leaseInfo.monthlyRent.toLocaleString()}`}
          icon={DollarSign}
          colorScheme="primary"
          trend={{ value: 0, direction: 'up', label: 'No change' }}
          sparklineData={[2400, 2400, 2400, 2450, 2450, 2500, 2500]}
        />

        <EnhancedStatCard
          label="Unit Info"
          value={leaseInfo.unit}
          icon={Home}
          colorScheme="secondary"
          trend={{ value: 100, direction: 'up', label: 'Occupancy' }}
        />

        <EnhancedStatCard
          label="Lease Ends"
          value={leaseInfo.leaseEnd}
          icon={Calendar}
          colorScheme="accent"
          trend={{ value: 45, direction: 'down', label: 'Days remaining' }}
        />

        <EnhancedStatCard
          label="Open Requests"
          value={openRequestsCount}
          icon={Wrench}
          colorScheme="warning"
          trend={{ value: 1, direction: 'up', label: 'Since last week' }}
        />
      </>
    );
  };

  const renderCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <EnhancedChartContainer
        title="Rent Payment History"
        description="Your payment track record over the last 6 months"
        timeRange={{
          value: '6m',
          options: [{ label: '6 Months', value: '6m' }, { label: '12 Months', value: '12m' }],
          onChange: () => {}
        }}
        exportable
      >
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6B7280', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6B7280', fontSize: 12 }} 
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            cursor={{ fill: '#F3F4F6' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Bar 
            dataKey="amount" 
            fill="var(--primary-500)" 
            radius={[4, 4, 0, 0]} 
            barSize={40}
          />
        </BarChart>
      </EnhancedChartContainer>

      <EnhancedChartContainer
        title="Maintenance Request Status"
        description="Breakdown of your maintenance requests"
      >
        <AreaChart data={[
          { name: 'Jan', requests: 1 },
          { name: 'Feb', requests: 0 },
          { name: 'Mar', requests: 2 },
          { name: 'Apr', requests: 1 },
          { name: 'May', requests: 0 },
          { name: 'Jun', requests: 1 },
        ]}>
          <defs>
            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--warning-500)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--warning-500)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6B7280', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6B7280', fontSize: 12 }} 
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Area 
            type="monotone" 
            dataKey="requests" 
            stroke="var(--warning-500)" 
            fillOpacity={1} 
            fill="url(#colorRequests)" 
          />
        </AreaChart>
      </EnhancedChartContainer>
    </div>
  );

  const renderRecentActivity = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Recent Payments</CardTitle>
          <CreditCard className="h-5 w-5 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : (
              recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-success-50 flex items-center justify-center text-success-600">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{payment.month}</p>
                      <p className="text-sm text-gray-500">Due: {payment.dueDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${payment.amount.toLocaleString()}</p>
                    <Badge className={getPaymentStatusColor(payment.status)} variant="outline">
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
          <Bell className="h-5 w-5 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className={`h-2 w-2 mt-2 rounded-full ${
                    notification.priority === 'High' ? 'bg-error-500' : 
                    notification.priority === 'Medium' ? 'bg-warning-500' : 'bg-success-500'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{notification.type}</p>
                      <span className="text-xs text-gray-500">{notification.date}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tenant Dashboard</h1>
            <p className="text-gray-500 mt-2 text-lg">
              Welcome back, {user?.name || 'Tenant'}! Manage your rental account and requests.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <BulkActionBar 
              selectedCount={0} 
              onClearSelection={() => {}} 
              onExport={() => console.log('Exporting tenant data...')} 
            />
            <TemplateSelector
              dashboardId="tenant-overview"
              currentTemplate={template}
              onTemplateChange={setTemplate}
            />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderQuickStats()}
        </div>

        {/* Charts Section */}
        {renderCharts()}

        {/* Tax Center Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Tax Center</h2>
            <Badge variant="outline" className="text-primary-600 border-primary-200 bg-primary-50">
              Tax Season 2025
            </Badge>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TaxSummaryCard summary={taxSummary} isLoading={taxLoading} />
            </div>
            <div>
              <TaxSavingsCalculator onCalculate={taxService.calculateTaxSavings.bind(taxService)} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <DeductionTracker deductions={taxDeductions} isLoading={taxLoading} />
            <TaxCalendar events={taxCalendar} isLoading={taxLoading} />
          </div>
        </div>

        {/* Recent Activity Section */}
        {renderRecentActivity()}
      </div>
    </ErrorBoundary>
  );
}