import { useQuery } from '@tanstack/react-query';
import { Transaction, Appointment, PerformanceMetrics, MonthlyData, Insight } from '@/types/dashboard';
import { useClients } from '@/contexts/ClientContext';
import { useListings } from '@/contexts/ListingContext';

export interface ClientAnalysis {
  type: string;
  count: number;
  avgBudget?: number;
  avgValue?: number;
  conversionRate: number;
}

export interface PerformanceAnalytics {
  salesGrowth: string;
  commissionGrowth: string;
  clientRetention: number;
  retentionChange: string;
  marketShare: number;
  shareChange: string;
  efficiency: number;
  efficiencyChange: string;
}

// Data fetching functions
const fetchTransactions = async (): Promise<Transaction[]> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      id: 1,
      property: 'Historic Townhouse',
      client: 'Emily Davis',
      amount: 285000,
      status: 'Closing',
      commission: 8550,
      closingDate: '2024-01-20'
    },
    {
      id: 2,
      property: 'Suburban Home',
      client: 'The Wilson Family',
      amount: 395000,
      status: 'Completed',
      commission: 11850,
      closingDate: '2024-01-15'
    }
  ];
};

const fetchAppointments = async (): Promise<Appointment[]> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      id: 1,
      type: 'Property Showing',
      client: 'John & Sarah Smith',
      property: 'Waterfront Colonial',
      date: '2024-01-15',
      time: '10:00 AM'
    },
    {
      id: 2,
      type: 'Client Meeting',
      client: 'Michael Johnson',
      property: 'Listing Consultation',
      date: '2024-01-16',
      time: '2:00 PM'
    }
  ];
};

const fetchPerformanceAnalytics = async (): Promise<PerformanceAnalytics> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    salesGrowth: '+22.5%',
    commissionGrowth: '+18.7%',
    clientRetention: 89.3,
    retentionChange: '+4.2%',
    marketShare: 12.8,
    shareChange: '+1.5%',
    efficiency: 94.2,
    efficiencyChange: '+6.1%'
  };
};

const fetchMonthlyPerformance = async (): Promise<MonthlyData[]> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    { month: 'Aug', sales: 185000, deals: 2, clients: 8 },
    { month: 'Sep', sales: 220000, deals: 3, clients: 9 },
    { month: 'Oct', sales: 165000, deals: 2, clients: 7 },
    { month: 'Nov', sales: 285000, deals: 4, clients: 11 },
    { month: 'Dec', sales: 195000, deals: 2, clients: 8 },
    { month: 'Jan', sales: 245000, deals: 3, clients: 10 }
  ];
};

const fetchClientAnalysis = async (): Promise<ClientAnalysis[]> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    { type: 'First-time Buyers', count: 8, avgBudget: 285000, conversionRate: 75 },
    { type: 'Move-up Buyers', count: 5, avgBudget: 485000, conversionRate: 85 },
    { type: 'Sellers', count: 4, avgValue: 425000, conversionRate: 90 },
    { type: 'Investors', count: 3, avgBudget: 350000, conversionRate: 65 }
  ];
};

const fetchPerformanceInsights = async (): Promise<Insight[]> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      title: 'Peak Performance Period',
      description: 'November showed highest sales volume with 4 closed deals',
      impact: 'positive',
      recommendation: 'Analyze November strategies for replication'
    },
    {
      title: 'Client Relationship Strength',
      description: 'Client satisfaction rating increased to 4.8/5.0',
      impact: 'positive',
      recommendation: 'Continue focus on personalized service approach'
    },
    {
      title: 'Market Timing Optimization',
      description: 'Average days on market 23% below area average',
      impact: 'positive',
      recommendation: 'Share pricing strategies with team for best practices'
    }
  ];
};

export const useAgentDashboard = () => {
  const { stats: clientStats, isLoading: isClientLoading } = useClients();
  const { stats: listingStats, isLoading: isListingLoading } = useListings();

  // Use React Query for data fetching
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['agent-dashboard', 'transactions'],
    queryFn: fetchTransactions,
  });

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['agent-dashboard', 'appointments'],
    queryFn: fetchAppointments,
  });

  const { data: performanceAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['agent-dashboard', 'performance-analytics'],
    queryFn: fetchPerformanceAnalytics,
  });

  const { data: monthlyPerformance = [], isLoading: monthlyLoading } = useQuery({
    queryKey: ['agent-dashboard', 'monthly-performance'],
    queryFn: fetchMonthlyPerformance,
  });

  const { data: clientAnalysis = [], isLoading: clientAnalysisLoading } = useQuery({
    queryKey: ['agent-dashboard', 'client-analysis'],
    queryFn: fetchClientAnalysis,
  });

  const { data: performanceInsights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ['agent-dashboard', 'performance-insights'],
    queryFn: fetchPerformanceInsights,
  });

  // Compute performance metrics based on listing stats
  const performance: PerformanceMetrics | null = listingStats ? {
    totalSales: 1250000,
    totalCommission: 37500,
    activeListings: listingStats.active,
    closedDeals: 3,
    averageDaysOnMarket: Math.round(listingStats.averageDaysOnMarket),
    clientSatisfaction: 4.8
  } : null;

  const isLoading = 
    transactionsLoading || 
    appointmentsLoading || 
    analyticsLoading || 
    monthlyLoading || 
    clientAnalysisLoading || 
    insightsLoading ||
    isClientLoading || 
    isListingLoading;

  return {
    isLoading,
    transactions,
    appointments,
    performance,
    performanceAnalytics,
    monthlyPerformance,
    clientAnalysis,
    performanceInsights,
    clientStats,
    listingStats
  };
};