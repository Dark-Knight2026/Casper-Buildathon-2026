import { useQuery } from '@tanstack/react-query';
import { useClients } from '@/contexts/ClientContext';
import { useAgent } from '@/contexts/AgentContext';
import { Transaction, MonthlyData, MarketAnalytics, Insight } from '@/types/dashboard';

export interface CompetitorData {
  company: string;
  marketShare: number;
  deals: number;
  avgPrice: number;
}

export interface OfficeMetrics {
  totalAgents: number;
  activeListings: number;
  monthlyRevenue: number;
  totalSales: number;
  averageCommission: number;
  marketShare: number;
  clientSatisfaction: number;
  averageDaysOnMarket: number;
}

export interface PerformanceAnalytics {
  monthlyGrowth: string;
  quarterlyRevenue: number;
  revenueChange: string;
  agentProductivity: number;
  productivityChange: string;
  marketPenetration: number;
  penetrationChange: string;
}

// Data fetching functions
const fetchRecentTransactions = async (): Promise<Transaction[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      id: 1,
      property: 'Luxury Waterfront Estate',
      agent: 'Jennifer Wilson',
      amount: 1250000,
      commission: 37500,
      status: 'Closed',
      date: '2024-01-12'
    },
    {
      id: 2,
      property: 'Downtown Penthouse',
      agent: 'Sarah Johnson',
      amount: 875000,
      commission: 26250,
      status: 'Pending',
      date: '2024-01-11'
    },
    {
      id: 3,
      property: 'Historic Colonial',
      agent: 'Mike Davis',
      amount: 650000,
      commission: 19500,
      status: 'Closed',
      date: '2024-01-10'
    }
  ];
};

const fetchMarketData = async (): Promise<MarketAnalytics> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    averagePrice: 485000,
    priceChange: '+3.2%',
    inventory: 156,
    inventoryChange: '-8.5%',
    daysOnMarket: 22,
    marketChange: '-12%',
    competitiveListings: 12,
    marketTrend: 'up',
    seasonalFactor: 'high',
    demandScore: 8.5
  };
};

const fetchPerformanceAnalytics = async (): Promise<PerformanceAnalytics> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    monthlyGrowth: '+12.5%',
    quarterlyRevenue: 825000,
    revenueChange: '+18.3%',
    agentProductivity: 87.5,
    productivityChange: '+5.2%',
    marketPenetration: 23.8,
    penetrationChange: '+2.1%'
  };
};

const fetchMonthlyPerformance = async (): Promise<MonthlyData[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    { month: 'Aug', revenue: 245000, deals: 18, agents: 14 },
    { month: 'Sep', revenue: 267000, deals: 22, agents: 15 },
    { month: 'Oct', revenue: 198000, deals: 16, agents: 15 },
    { month: 'Nov', revenue: 289000, deals: 25, agents: 15 },
    { month: 'Dec', revenue: 234000, deals: 19, agents: 15 },
    { month: 'Jan', revenue: 285000, deals: 24, agents: 15 }
  ];
};

const fetchCompetitorAnalysis = async (): Promise<CompetitorData[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    { company: 'Metro Realty', marketShare: 28.5, deals: 145, avgPrice: 495000 },
    { company: 'Your Brokerage', marketShare: 18.5, deals: 98, avgPrice: 485000 },
    { company: 'Coastal Properties', marketShare: 15.2, deals: 82, avgPrice: 475000 },
    { company: 'Prime Real Estate', marketShare: 12.8, deals: 68, avgPrice: 465000 }
  ];
};

const fetchBusinessInsights = async (): Promise<Insight[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      title: 'Agent Performance Optimization',
      description: 'Top 20% of agents generate 60% of revenue',
      impact: 'positive',
      recommendation: 'Implement mentorship program for underperforming agents'
    },
    {
      title: 'Market Expansion Opportunity',
      description: 'Luxury market segment showing 25% growth',
      impact: 'positive',
      recommendation: 'Recruit specialized luxury property agents'
    },
    {
      title: 'Technology Investment ROI',
      description: 'CRM system increased agent efficiency by 15%',
      impact: 'positive',
      recommendation: 'Expand digital tools and training programs'
    }
  ];
};

export const useBrokerDashboard = () => {
  const { stats: clientStats } = useClients();
  const { agentStats, isLoading: isAgentLoading } = useAgent();

  const { data: recentTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['broker-dashboard', 'transactions'],
    queryFn: fetchRecentTransactions,
  });

  const { data: marketData, isLoading: marketLoading } = useQuery({
    queryKey: ['broker-dashboard', 'market-data'],
    queryFn: fetchMarketData,
  });

  const { data: performanceAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['broker-dashboard', 'performance-analytics'],
    queryFn: fetchPerformanceAnalytics,
  });

  const { data: monthlyPerformance = [], isLoading: monthlyLoading } = useQuery({
    queryKey: ['broker-dashboard', 'monthly-performance'],
    queryFn: fetchMonthlyPerformance,
  });

  const { data: competitorAnalysis = [], isLoading: competitorLoading } = useQuery({
    queryKey: ['broker-dashboard', 'competitor-analysis'],
    queryFn: fetchCompetitorAnalysis,
  });

  const { data: businessInsights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ['broker-dashboard', 'business-insights'],
    queryFn: fetchBusinessInsights,
  });

  // Compute office metrics based on agent stats
  const officeMetrics: OfficeMetrics | null = agentStats ? {
    totalAgents: agentStats.totalAgents,
    activeListings: 45,
    monthlyRevenue: 285000,
    totalSales: agentStats.totalSalesVolume,
    averageCommission: 262500,
    marketShare: 18.5,
    clientSatisfaction: agentStats.averagePerformanceScore,
    averageDaysOnMarket: 22
  } : null;

  const isLoading = 
    transactionsLoading || 
    marketLoading || 
    analyticsLoading || 
    monthlyLoading || 
    competitorLoading || 
    insightsLoading ||
    isAgentLoading;

  return {
    isLoading,
    officeMetrics,
    recentTransactions,
    marketData: marketData || null,
    performanceAnalytics: performanceAnalytics || null,
    monthlyPerformance,
    competitorAnalysis,
    businessInsights,
    clientStats
  };
};