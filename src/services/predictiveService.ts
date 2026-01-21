export interface FinancialDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  projectedRevenue?: number;
  projectedExpenses?: number;
  isProjection: boolean;
}

export interface OccupancyPrediction {
  propertyId: string;
  propertyName: string;
  currentOccupancy: number;
  predictedOccupancy: number;
  vacancyRisk: 'low' | 'medium' | 'high';
  riskScore: number; // 0-100
  factors: string[];
}

export interface MarketForecast {
  zipCode: string;
  currentValue: number;
  projectedValue: number; // 12-month projection
  growthRate: number; // percentage
  confidenceInterval: [number, number]; // [low, high]
  trend: 'up' | 'down' | 'stable';
}

export interface BudgetRecommendation {
  category: string;
  currentAllocation: number;
  recommendedAllocation: number;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

const MOCK_FINANCIAL_DATA: FinancialDataPoint[] = [
  { month: 'Jan', revenue: 45000, expenses: 28000, isProjection: false },
  { month: 'Feb', revenue: 46500, expenses: 27500, isProjection: false },
  { month: 'Mar', revenue: 48000, expenses: 29000, isProjection: false },
  { month: 'Apr', revenue: 47500, expenses: 28500, isProjection: false },
  { month: 'May', revenue: 49000, expenses: 28000, isProjection: false },
  { month: 'Jun', revenue: 51000, expenses: 31000, isProjection: false },
  { month: 'Jul', revenue: 52500, expenses: 30500, isProjection: false },
  { month: 'Aug', revenue: 53000, expenses: 30000, isProjection: false },
  // Projections
  { month: 'Sep', revenue: 54000, expenses: 31000, projectedRevenue: 54000, projectedExpenses: 31000, isProjection: true },
  { month: 'Oct', revenue: 55500, expenses: 31500, projectedRevenue: 55500, projectedExpenses: 31500, isProjection: true },
  { month: 'Nov', revenue: 56000, expenses: 32000, projectedRevenue: 56000, projectedExpenses: 32000, isProjection: true },
  { month: 'Dec', revenue: 58000, expenses: 34000, projectedRevenue: 58000, projectedExpenses: 34000, isProjection: true },
];

export const predictiveService = {
  getFinancialForecast: async (timeframe: '6m' | '12m' | '24m' = '12m'): Promise<FinancialDataPoint[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return MOCK_FINANCIAL_DATA;
  },

  getOccupancyPrediction: async (propertyId: string): Promise<OccupancyPrediction> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      propertyId,
      propertyName: 'Sunset Apartments',
      currentOccupancy: 92,
      predictedOccupancy: 88,
      vacancyRisk: 'medium',
      riskScore: 45,
      factors: ['Lease expirations in Q4', 'Local market saturation'],
    };
  },

  getMarketForecast: async (zipCode: string): Promise<MarketForecast> => {
    await new Promise(resolve => setTimeout(resolve, 700));
    return {
      zipCode,
      currentValue: 450000,
      projectedValue: 472500,
      growthRate: 5.0,
      confidenceInterval: [460000, 485000],
      trend: 'up',
    };
  },

  getSmartBudget: async (): Promise<BudgetRecommendation[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      {
        category: 'Maintenance',
        currentAllocation: 5000,
        recommendedAllocation: 6500,
        reason: 'Predicted HVAC failures in older units based on age',
        impact: 'high',
      },
      {
        category: 'Marketing',
        currentAllocation: 2000,
        recommendedAllocation: 2500,
        reason: 'Increased competition expected in Q4',
        impact: 'medium',
      },
      {
        category: 'Utilities',
        currentAllocation: 3000,
        recommendedAllocation: 2800,
        reason: 'Energy efficiency upgrades showing results',
        impact: 'low',
      },
    ];
  }
};