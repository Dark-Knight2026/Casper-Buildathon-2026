import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useSellerDashboard } from '@/hooks/useSellerDashboard';
import { useNavigate } from 'react-router-dom';
import { TaxSummaryCard } from '@/components/dashboard/tax/TaxSummaryCard';
import { DeductionTracker } from '@/components/dashboard/tax/DeductionTracker';
import { TaxCalendar } from '@/components/dashboard/tax/TaxCalendar';
import { TaxDocumentUploader } from '@/components/dashboard/tax/TaxDocumentUploader';
import { taxService } from '@/services/taxService';
import { TemplateSelector } from '@/components/dashboard/TemplateSelector';
import { DashboardTemplate } from '@/types/dashboard';
import { EnhancedStatCard } from '@/components/dashboard/shared/EnhancedStatCard';
import { EnhancedChartContainer } from '@/components/dashboard/shared/EnhancedChartContainer';
import { TaxSummary, TaxDeduction, TaxCalendarEvent, TaxDocument } from '@/types/tax';
import { useToast } from '@/hooks/use-toast';
import AddPropertyWizard from '@/components/property/AddPropertyWizard';
import {
  Home,
  FileText,
  Eye,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  Plus
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function SellerOverview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [template, setTemplate] = useState<DashboardTemplate>('grid');
  const [showAddPropertyWizard, setShowAddPropertyWizard] = useState(false);
  const { 
    isLoading, 
    myListings, 
    offers, 
    showings, 
  } = useSellerDashboard();

  // Tax Center State
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [taxDeductions, setTaxDeductions] = useState<TaxDeduction[]>([]);
  const [taxCalendar, setTaxCalendar] = useState<TaxCalendarEvent[]>([]);
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([]);
  const [taxLoading, setTaxLoading] = useState(true);

  useEffect(() => {
    const loadTaxData = async () => {
      setTaxLoading(true);
      try {
        const [summary, deductions, calendar, documents] = await Promise.all([
          taxService.getSellerTaxSummary('seller_123'),
          taxService.getTaxDeductions('seller_123'),
          taxService.getTaxCalendar(2025),
          taxService.getTaxDocuments('seller_123')
        ]);
        setTaxSummary(summary);
        setTaxDeductions(deductions);
        setTaxCalendar(calendar);
        setTaxDocuments(documents);
      } catch (error) {
        console.error('Failed to load tax data', error);
      } finally {
        setTaxLoading(false);
      }
    };
    loadTaxData();
  }, []);
  
  const getOfferStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-success-100 text-success-700 border-success-200';
      case 'pending': return 'bg-warning-100 text-warning-700 border-warning-200';
      case 'rejected': return 'bg-error-100 text-error-700 border-error-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleAddPropertyComplete = (formData: unknown) => {
    console.log('Adding property:', formData);
    toast({
      title: 'Property Added',
      description: 'Your property has been successfully added.'
    });
    setShowAddPropertyWizard(false);
  };

  const renderQuickStats = () => {
    if (isLoading) {
      return Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ));
    }

    const activeListingsCount = myListings.filter(l => l.status === 'Active').length;
    const pendingOffersCount = offers.filter(o => o.status === 'pending').length;
    const totalViews = myListings.reduce((sum, listing) => sum + listing.views, 0);

    return (
      <>
        <EnhancedStatCard
          label="Active Listings"
          value={activeListingsCount}
          icon={Home}
          colorScheme="primary"
          trend={{ value: 1, direction: 'up', label: 'New this month' }}
        />

        <EnhancedStatCard
          label="Pending Offers"
          value={pendingOffersCount}
          icon={FileText}
          colorScheme="warning"
          trend={{ value: 2, direction: 'up', label: 'Since last week' }}
        />

        <EnhancedStatCard
          label="Total Views"
          value={totalViews.toLocaleString()}
          icon={Eye}
          colorScheme="info"
          trend={{ value: 12, direction: 'up', label: 'vs last month' }}
          sparklineData={[150, 230, 220, 300, 450, 420, 500]}
        />

        <EnhancedStatCard
          label="Upcoming Showings"
          value={showings.length}
          icon={Calendar}
          colorScheme="accent"
          trend={{ value: 0, direction: 'up', label: 'Scheduled' }}
        />
      </>
    );
  };

  const renderCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <EnhancedChartContainer
        title="Listing Views"
        description="Daily views across all your properties"
        timeRange={{
          value: '7d',
          options: [{ label: 'Last 7 Days', value: '7d' }, { label: 'Last 30 Days', value: '30d' }],
          onChange: () => {}
        }}
      >
        <AreaChart data={[
          { date: 'Mon', views: 45 },
          { date: 'Tue', views: 52 },
          { date: 'Wed', views: 38 },
          { date: 'Thu', views: 65 },
          { date: 'Fri', views: 48 },
          { date: 'Sat', views: 72 },
          { date: 'Sun', views: 60 },
        ]}>
          <defs>
            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
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
            dataKey="views" 
            stroke="var(--primary-500)" 
            fillOpacity={1} 
            fill="url(#colorViews)" 
          />
        </AreaChart>
      </EnhancedChartContainer>

      <EnhancedChartContainer
        title="Offer Activity"
        description="Offers received over time"
      >
        <BarChart data={[
          { month: 'Jan', offers: 2 },
          { month: 'Feb', offers: 1 },
          { month: 'Mar', offers: 3 },
          { month: 'Apr', offers: 4 },
          { month: 'May', offers: 2 },
          { month: 'Jun', offers: 5 },
        ]}>
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
          />
          <Tooltip 
            cursor={{ fill: '#F3F4F6' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Bar 
            dataKey="offers" 
            fill="var(--secondary-500)" 
            radius={[4, 4, 0, 0]} 
            barSize={40}
          />
        </BarChart>
      </EnhancedChartContainer>
    </div>
  );

  const renderRecentActivity = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Recent Offers</CardTitle>
          <FileText className="h-5 w-5 text-gray-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full mb-4 rounded-lg" />
            ))
          ) : offers.length > 0 ? (
            <div className="space-y-4">
              {offers.slice(0, 3).map((offer) => (
                <div key={offer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{offer.property}</p>
                      <p className="text-sm text-gray-500">${offer.amount.toLocaleString()} from {offer.buyer}</p>
                    </div>
                  </div>
                  <Badge className={getOfferStatusColor(offer.status)} variant="outline">
                    {offer.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No offers yet"
              description="Offers from potential buyers will appear here"
              action={{
                label: "View Listings",
                onClick: () => navigate('/seller-dashboard/listings')
              }}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Upcoming Showings</CardTitle>
          <Calendar className="h-5 w-5 text-gray-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full mb-4 rounded-lg" />
            ))
          ) : showings.length > 0 ? (
            <div className="space-y-4">
              {showings.map((showing) => (
                <div key={showing.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-accent-50 flex items-center justify-center text-accent-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{showing.property}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {showing.date} • {showing.time}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Agent: {showing.agent}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No showings scheduled"
              description="Property showings will be scheduled by your agent"
              action={{
                label: "View Calendar",
                onClick: () => navigate('/seller-dashboard/calendar')
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-500 mt-2 text-lg">Track your property listings and offers.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowAddPropertyWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
            <TemplateSelector
              dashboardId="seller-overview"
              currentTemplate={template}
              onTemplateChange={setTemplate}
            />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderQuickStats()}
        </div>

        {/* Analytics Charts */}
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
              <TaxDocumentUploader documents={taxDocuments} isLoading={taxLoading} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <DeductionTracker deductions={taxDeductions} isLoading={taxLoading} />
            <TaxCalendar events={taxCalendar} isLoading={taxLoading} />
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="mt-8">
          {renderRecentActivity()}
        </div>
      </div>

      {showAddPropertyWizard && (
        <AddPropertyWizard
          onComplete={handleAddPropertyComplete}
          onCancel={() => setShowAddPropertyWizard(false)}
        />
      )}
    </ErrorBoundary>
  );
}