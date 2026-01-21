export interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  period: 'month' | 'quarter' | 'year';
  metrics: {
    transactionVolume: number;
    totalRevenue: number;
    averageDealSize: number;
    conversionRate: number; // leads to closings
    averageDaysToClose: number;
    clientSatisfactionScore: number;
    listingToSaleRatio: number;
    repeatClientRate: number;
    referralRate: number;
  };
  trends: {
    volumeChange: number; // percentage
    revenueChange: number;
    conversionChange: number;
    satisfactionChange: number;
  };
}

export interface BenchmarkComparison {
  agentId: string;
  agentName: string;
  overallScore: number; // 0-100 composite score
  rank: number;
  percentile: number;
  comparisons: {
    transactionVolume: BenchmarkDetail;
    revenue: BenchmarkDetail;
    conversionRate: BenchmarkDetail;
    daysToClose: BenchmarkDetail;
    clientSatisfaction: BenchmarkDetail;
    listingToSale: BenchmarkDetail;
  };
  strengths: string[];
  improvementAreas: string[];
  coachingRecommendations: CoachingRecommendation[];
}

export interface BenchmarkDetail {
  agentValue: number;
  teamAverage: number;
  topPerformerValue: number;
  percentileRank: number;
  status: 'excellent' | 'above_average' | 'average' | 'below_average' | 'needs_improvement';
  gap: number; // difference from team average
}

export interface CoachingRecommendation {
  id: string;
  category: 'skills' | 'process' | 'technology' | 'marketing' | 'client_relations';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  suggestedActions: string[];
  estimatedTimeframe: string;
}

export interface TeamBenchmarks {
  totalAgents: number;
  period: string;
  averages: {
    transactionVolume: number;
    revenue: number;
    conversionRate: number;
    daysToClose: number;
    clientSatisfaction: number;
    listingToSale: number;
  };
  topPerformers: {
    transactionVolume: number;
    revenue: number;
    conversionRate: number;
    daysToClose: number;
    clientSatisfaction: number;
    listingToSale: number;
  };
  distribution: {
    excellent: number; // count of agents
    aboveAverage: number;
    average: number;
    belowAverage: number;
    needsImprovement: number;
  };
}

export interface PerformanceTrend {
  agentId: string;
  period: string;
  metrics: {
    volume: number;
    revenue: number;
    conversion: number;
    satisfaction: number;
  };
}