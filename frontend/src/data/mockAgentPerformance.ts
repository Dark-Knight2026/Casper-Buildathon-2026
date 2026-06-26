export interface PerformanceMetrics {
  totalSales: number;
  averageSalePrice: number;
  averageDaysOnMarket: number;
  listToSaleRatio: number;
  clientSatisfaction: number;
  responseRate: number;
  closingRate: number;
  repeatClientRate: number;
}

export interface MonthlyData {
  month: string;
  sales: number;
  revenue: number;
  listings: number;
}

export interface PropertyTypeData {
  type: string;
  count: number;
  percentage: number;
  avgPrice: number;
}

export const mockAgentPerformance: Record<string, {
  metrics: PerformanceMetrics;
  monthlyData: MonthlyData[];
  propertyTypes: PropertyTypeData[];
}> = {
  '1': {
    metrics: {
      totalSales: 187,
      averageSalePrice: 485000,
      averageDaysOnMarket: 32,
      listToSaleRatio: 0.978,
      clientSatisfaction: 0.96,
      responseRate: 0.95,
      closingRate: 0.78,
      repeatClientRate: 0.34,
    },
    monthlyData: [
      { month: 'Jan', sales: 14, revenue: 6790000, listings: 18 },
      { month: 'Feb', sales: 16, revenue: 7760000, listings: 20 },
      { month: 'Mar', sales: 18, revenue: 8730000, listings: 22 },
      { month: 'Apr', sales: 15, revenue: 7275000, listings: 19 },
      { month: 'May', sales: 17, revenue: 8245000, listings: 21 },
      { month: 'Jun', sales: 19, revenue: 9215000, listings: 23 },
      { month: 'Jul', sales: 16, revenue: 7760000, listings: 20 },
      { month: 'Aug', sales: 15, revenue: 7275000, listings: 19 },
      { month: 'Sep', sales: 17, revenue: 8245000, listings: 21 },
      { month: 'Oct', sales: 18, revenue: 8730000, listings: 22 },
      { month: 'Nov', sales: 14, revenue: 6790000, listings: 18 },
      { month: 'Dec', sales: 8, revenue: 3880000, listings: 12 },
    ],
    propertyTypes: [
      { type: 'Single Family Home', count: 89, percentage: 47.6, avgPrice: 525000 },
      { type: 'Luxury Estate', count: 42, percentage: 22.5, avgPrice: 850000 },
      { type: 'Waterfront Condo', count: 35, percentage: 18.7, avgPrice: 395000 },
      { type: 'Townhouse', count: 21, percentage: 11.2, avgPrice: 285000 },
    ],
  },
  '2': {
    metrics: {
      totalSales: 423,
      averageSalePrice: 650000,
      averageDaysOnMarket: 28,
      listToSaleRatio: 0.982,
      clientSatisfaction: 0.94,
      responseRate: 0.92,
      closingRate: 0.82,
      repeatClientRate: 0.41,
    },
    monthlyData: [
      { month: 'Jan', sales: 32, revenue: 20800000, listings: 40 },
      { month: 'Feb', sales: 35, revenue: 22750000, listings: 43 },
      { month: 'Mar', sales: 38, revenue: 24700000, listings: 46 },
      { month: 'Apr', sales: 36, revenue: 23400000, listings: 44 },
      { month: 'May', sales: 40, revenue: 26000000, listings: 48 },
      { month: 'Jun', sales: 42, revenue: 27300000, listings: 50 },
      { month: 'Jul', sales: 38, revenue: 24700000, listings: 46 },
      { month: 'Aug', sales: 35, revenue: 22750000, listings: 43 },
      { month: 'Sep', sales: 37, revenue: 24050000, listings: 45 },
      { month: 'Oct', sales: 39, revenue: 25350000, listings: 47 },
      { month: 'Nov', sales: 33, revenue: 21450000, listings: 41 },
      { month: 'Dec', sales: 18, revenue: 11700000, listings: 25 },
    ],
    propertyTypes: [
      { type: 'Commercial Building', count: 156, percentage: 36.9, avgPrice: 1250000 },
      { type: 'Multi-Family Investment', count: 128, percentage: 30.3, avgPrice: 875000 },
      { type: 'Residential', count: 89, percentage: 21.0, avgPrice: 425000 },
      { type: 'Mixed-Use', count: 50, percentage: 11.8, avgPrice: 950000 },
    ],
  },
  '3': {
    metrics: {
      totalSales: 134,
      averageSalePrice: 325000,
      averageDaysOnMarket: 35,
      listToSaleRatio: 0.972,
      clientSatisfaction: 0.93,
      responseRate: 0.94,
      closingRate: 0.74,
      repeatClientRate: 0.28,
    },
    monthlyData: [
      { month: 'Jan', sales: 10, revenue: 3250000, listings: 14 },
      { month: 'Feb', sales: 11, revenue: 3575000, listings: 15 },
      { month: 'Mar', sales: 13, revenue: 4225000, listings: 17 },
      { month: 'Apr', sales: 12, revenue: 3900000, listings: 16 },
      { month: 'May', sales: 14, revenue: 4550000, listings: 18 },
      { month: 'Jun', sales: 15, revenue: 4875000, listings: 19 },
      { month: 'Jul', sales: 13, revenue: 4225000, listings: 17 },
      { month: 'Aug', sales: 11, revenue: 3575000, listings: 15 },
      { month: 'Sep', sales: 12, revenue: 3900000, listings: 16 },
      { month: 'Oct', sales: 13, revenue: 4225000, listings: 17 },
      { month: 'Nov', sales: 8, revenue: 2600000, listings: 12 },
      { month: 'Dec', sales: 2, revenue: 650000, listings: 5 },
    ],
    propertyTypes: [
      { type: 'New Construction', count: 48, percentage: 35.8, avgPrice: 385000 },
      { type: 'Military Housing', count: 42, percentage: 31.3, avgPrice: 295000 },
      { type: 'Condo', count: 28, percentage: 20.9, avgPrice: 265000 },
      { type: 'Townhouse', count: 16, percentage: 11.9, avgPrice: 315000 },
    ],
  },
  '4': {
    metrics: {
      totalSales: 298,
      averageSalePrice: 425000,
      averageDaysOnMarket: 30,
      listToSaleRatio: 0.985,
      clientSatisfaction: 0.97,
      responseRate: 0.98,
      closingRate: 0.85,
      repeatClientRate: 0.38,
    },
    monthlyData: [
      { month: 'Jan', sales: 23, revenue: 9775000, listings: 28 },
      { month: 'Feb', sales: 25, revenue: 10625000, listings: 30 },
      { month: 'Mar', sales: 28, revenue: 11900000, listings: 33 },
      { month: 'Apr', sales: 26, revenue: 11050000, listings: 31 },
      { month: 'May', sales: 29, revenue: 12325000, listings: 34 },
      { month: 'Jun', sales: 31, revenue: 13175000, listings: 36 },
      { month: 'Jul', sales: 27, revenue: 11475000, listings: 32 },
      { month: 'Aug', sales: 24, revenue: 10200000, listings: 29 },
      { month: 'Sep', sales: 26, revenue: 11050000, listings: 31 },
      { month: 'Oct', sales: 28, revenue: 11900000, listings: 33 },
      { month: 'Nov', sales: 22, revenue: 9350000, listings: 27 },
      { month: 'Dec', sales: 9, revenue: 3825000, listings: 14 },
    ],
    propertyTypes: [
      { type: 'Luxury Home', count: 125, percentage: 41.9, avgPrice: 685000 },
      { type: 'Estate', count: 89, percentage: 29.9, avgPrice: 1150000 },
      { type: 'Single Family', count: 58, percentage: 19.5, avgPrice: 425000 },
      { type: 'Waterfront', count: 26, percentage: 8.7, avgPrice: 895000 },
    ],
  },
  '5': {
    metrics: {
      totalSales: 203,
      averageSalePrice: 375000,
      averageDaysOnMarket: 38,
      listToSaleRatio: 0.968,
      clientSatisfaction: 0.91,
      responseRate: 0.90,
      closingRate: 0.72,
      repeatClientRate: 0.32,
    },
    monthlyData: [
      { month: 'Jan', sales: 16, revenue: 6000000, listings: 22 },
      { month: 'Feb', sales: 17, revenue: 6375000, listings: 23 },
      { month: 'Mar', sales: 19, revenue: 7125000, listings: 25 },
      { month: 'Apr', sales: 18, revenue: 6750000, listings: 24 },
      { month: 'May', sales: 20, revenue: 7500000, listings: 26 },
      { month: 'Jun', sales: 21, revenue: 7875000, listings: 27 },
      { month: 'Jul', sales: 18, revenue: 6750000, listings: 24 },
      { month: 'Aug', sales: 16, revenue: 6000000, listings: 22 },
      { month: 'Sep', sales: 18, revenue: 6750000, listings: 24 },
      { month: 'Oct', sales: 19, revenue: 7125000, listings: 25 },
      { month: 'Nov', sales: 15, revenue: 5625000, listings: 21 },
      { month: 'Dec', sales: 6, revenue: 2250000, listings: 10 },
    ],
    propertyTypes: [
      { type: 'Investment Property', count: 89, percentage: 43.8, avgPrice: 425000 },
      { type: 'Rental Property', count: 67, percentage: 33.0, avgPrice: 315000 },
      { type: 'Duplex', count: 32, percentage: 15.8, avgPrice: 385000 },
      { type: 'Multi-Family', count: 15, percentage: 7.4, avgPrice: 595000 },
    ],
  },
  '6': {
    metrics: {
      totalSales: 89,
      averageSalePrice: 295000,
      averageDaysOnMarket: 40,
      listToSaleRatio: 0.965,
      clientSatisfaction: 0.95,
      responseRate: 0.96,
      closingRate: 0.76,
      repeatClientRate: 0.30,
    },
    monthlyData: [
      { month: 'Jan', sales: 7, revenue: 2065000, listings: 10 },
      { month: 'Feb', sales: 8, revenue: 2360000, listings: 11 },
      { month: 'Mar', sales: 9, revenue: 2655000, listings: 12 },
      { month: 'Apr', sales: 8, revenue: 2360000, listings: 11 },
      { month: 'May', sales: 10, revenue: 2950000, listings: 13 },
      { month: 'Jun', sales: 11, revenue: 3245000, listings: 14 },
      { month: 'Jul', sales: 9, revenue: 2655000, listings: 12 },
      { month: 'Aug', sales: 7, revenue: 2065000, listings: 10 },
      { month: 'Sep', sales: 8, revenue: 2360000, listings: 11 },
      { month: 'Oct', sales: 9, revenue: 2655000, listings: 12 },
      { month: 'Nov', sales: 6, revenue: 1770000, listings: 9 },
      { month: 'Dec', sales: 2, revenue: 590000, listings: 4 },
    ],
    propertyTypes: [
      { type: 'Starter Home', count: 42, percentage: 47.2, avgPrice: 265000 },
      { type: 'Affordable Housing', count: 28, percentage: 31.5, avgPrice: 245000 },
      { type: 'Condo', count: 14, percentage: 15.7, avgPrice: 285000 },
      { type: 'Townhouse', count: 5, percentage: 5.6, avgPrice: 315000 },
    ],
  },
};