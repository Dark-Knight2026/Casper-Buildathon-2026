import { useQuery } from '@tanstack/react-query';
import { Listing, Offer, Showing, PerformanceMetrics, MarketAnalytics, Insight } from '@/types/dashboard';

export interface MonthlyActivityData {
  month: string;
  views: number;
  inquiries: number;
  showings: number;
}

export interface PriceAnalysis {
  listPrice: number;
  marketValue: number;
  pricePerSqft: number;
  comparablesSold: Array<{
    address: string;
    price: number;
    sqft: number;
    daysOnMarket: number;
  }>;
}

// Data fetching functions
const fetchMyListings = async (): Promise<Listing[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      id: 1,
      title: 'Charming Suburban Home',
      address: '890 Maple Lane, Chesapeake, VA',
      price: 395000,
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: 1950,
      image: '/api/placeholder/300/200',
      status: 'Active',
      daysOnMarket: 15,
      views: 124,
      inquiries: 8
    },
    {
      id: 2,
      title: 'Historic Townhouse',
      address: '456 Heritage Street, Portsmouth, VA',
      price: 285000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1650,
      image: '/api/placeholder/300/200',
      status: 'Pending',
      daysOnMarket: 18,
      views: 89,
      inquiries: 12
    }
  ];
};

const fetchOffers = async (): Promise<Offer[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      id: 1,
      property: 'Charming Suburban Home',
      buyer: 'John & Jane Smith',
      amount: 385000,
      status: 'pending',
      date: '2024-01-12',
      contingencies: ['Inspection', 'Financing']
    },
    {
      id: 2,
      property: 'Historic Townhouse',
      buyer: 'Robert Johnson',
      amount: 280000,
      status: 'accepted',
      date: '2024-01-10',
      contingencies: ['Inspection']
    }
  ];
};

const fetchShowings = async (): Promise<Showing[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      id: 1,
      property: 'Charming Suburban Home',
      date: '2024-01-15',
      time: '2:00 PM',
      agent: 'Sarah Johnson',
      buyers: 'The Wilson Family'
    },
    {
      id: 2,
      property: 'Historic Townhouse',
      date: '2024-01-16',
      time: '11:00 AM',
      agent: 'Mike Davis',
      buyers: 'First-time Buyers'
    }
  ];
};

const fetchMarketAnalytics = async (): Promise<MarketAnalytics> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    averagePrice: 425000,
    priceChange: '+5.2%',
    daysOnMarket: 18,
    competitiveListings: 24,
    marketTrend: 'up',
    seasonalFactor: 'high',
    demandScore: 8.5
  };
};

const fetchPerformanceMetrics = async (): Promise<PerformanceMetrics> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    totalViews: 213,
    viewsChange: '+15%',
    inquiryRate: 9.4,
    inquiryChange: '+2.1%',
    conversionRate: 12.5,
    conversionChange: '-1.2%',
    averageTimeOnMarket: 16.5,
    timeChange: '-3 days'
  };
};

const fetchMonthlyData = async (): Promise<MonthlyActivityData[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    { month: 'Aug', views: 45, inquiries: 8, showings: 5 },
    { month: 'Sep', views: 52, inquiries: 12, showings: 7 },
    { month: 'Oct', views: 38, inquiries: 6, showings: 4 },
    { month: 'Nov', views: 41, inquiries: 9, showings: 6 },
    { month: 'Dec', views: 37, inquiries: 7, showings: 3 },
    { month: 'Jan', views: 48, inquiries: 11, showings: 8 }
  ];
};

const fetchPriceAnalysis = async (): Promise<PriceAnalysis> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    listPrice: 395000,
    marketValue: 385000,
    pricePerSqft: 203,
    comparablesSold: [
      { address: '892 Maple Lane', price: 405000, sqft: 2100, daysOnMarket: 12 },
      { address: '888 Oak Street', price: 375000, sqft: 1850, daysOnMarket: 22 },
      { address: '901 Pine Avenue', price: 420000, sqft: 2200, daysOnMarket: 8 }
    ]
  };
};

const fetchMarketInsights = async (): Promise<Insight[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      title: 'Peak Showing Season',
      description: 'Spring market activity is 25% higher than winter',
      impact: 'positive',
      recommendation: 'Schedule more showings in March-May'
    },
    {
      title: 'Price Positioning',
      description: 'Your listing is priced 2.6% above market average',
      impact: 'neutral',
      recommendation: 'Consider minor price adjustment to increase activity'
    },
    {
      title: 'Competition Analysis',
      description: '3 similar properties listed in your area this month',
      impact: 'negative',
      recommendation: 'Enhance staging and marketing to stand out'
    }
  ];
};

export const useSellerDashboard = () => {
  const { data: myListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['seller-dashboard', 'listings'],
    queryFn: fetchMyListings,
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['seller-dashboard', 'offers'],
    queryFn: fetchOffers,
  });

  const { data: showings = [], isLoading: showingsLoading } = useQuery({
    queryKey: ['seller-dashboard', 'showings'],
    queryFn: fetchShowings,
  });

  const { data: marketAnalytics, isLoading: marketLoading } = useQuery({
    queryKey: ['seller-dashboard', 'market-analytics'],
    queryFn: fetchMarketAnalytics,
  });

  const { data: performanceMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['seller-dashboard', 'performance-metrics'],
    queryFn: fetchPerformanceMetrics,
  });

  const { data: monthlyData = [], isLoading: monthlyLoading } = useQuery({
    queryKey: ['seller-dashboard', 'monthly-data'],
    queryFn: fetchMonthlyData,
  });

  const { data: priceAnalysis, isLoading: priceLoading } = useQuery({
    queryKey: ['seller-dashboard', 'price-analysis'],
    queryFn: fetchPriceAnalysis,
  });

  const { data: marketInsights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ['seller-dashboard', 'market-insights'],
    queryFn: fetchMarketInsights,
  });

  const isLoading = 
    listingsLoading || 
    offersLoading || 
    showingsLoading || 
    marketLoading || 
    metricsLoading || 
    monthlyLoading || 
    priceLoading || 
    insightsLoading;

  return {
    isLoading,
    myListings,
    offers,
    showings,
    marketAnalytics: marketAnalytics || null,
    performanceMetrics: performanceMetrics || null,
    monthlyData,
    priceAnalysis: priceAnalysis || null,
    marketInsights
  };
};