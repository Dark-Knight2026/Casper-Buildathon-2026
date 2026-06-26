import { Property } from '@/types/property';

export interface MarketTrend {
  metric: string;
  value: number;
  change: number; // percentage change
  trend: 'up' | 'down' | 'stable';
  description: string;
}

export interface PriceHistory {
  date: string;
  avgPrice: number;
  medianPrice: number;
  volume: number;
}

export interface NeighborhoodInsight {
  neighborhood: string;
  avgPrice: number;
  priceChange: number;
  inventory: number;
  daysOnMarket: number;
  hotness: 'hot' | 'warm' | 'cool';
}

/**
 * Calculate market trends from property data
 */
export function calculateMarketTrends(properties: Property[]): MarketTrend[] {
  const trends: MarketTrend[] = [];

  if (!properties || properties.length === 0) {
    return trends;
  }

  // Average price trend
  const avgPrice = properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length;
  trends.push({
    metric: 'Average Price',
    value: avgPrice,
    change: 5.2, // Mock data - would be calculated from historical data
    trend: 'up',
    description: 'Market prices trending upward'
  });

  // Inventory levels
  const availableCount = properties.filter(p => p.available).length;
  trends.push({
    metric: 'Available Properties',
    value: availableCount,
    change: -3.1,
    trend: 'down',
    description: 'Limited inventory, competitive market'
  });

  // Days on market
  const avgDaysOnMarket = 28; // Mock data
  trends.push({
    metric: 'Avg Days on Market',
    value: avgDaysOnMarket,
    change: -12.5,
    trend: 'down',
    description: 'Properties selling faster'
  });

  // Price per sqft
  const avgPricePerSqft =
    properties.reduce((sum, p) => sum + (p.price || 0) / (p.sqft || 1), 0) / properties.length;
  trends.push({
    metric: 'Price per Sqft',
    value: avgPricePerSqft,
    change: 4.8,
    trend: 'up',
    description: 'Value appreciation continuing'
  });

  return trends;
}

/**
 * Generate price history data (mock implementation)
 */
export function generatePriceHistory(months: number = 12): PriceHistory[] {
  const history: PriceHistory[] = [];
  const basePrice = 3000;
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const trend = 1 + (Math.random() * 0.1 - 0.05); // ±5% variation
    const seasonalFactor = 1 + Math.sin((date.getMonth() / 12) * Math.PI * 2) * 0.05;
    
    history.push({
      date: date.toISOString().split('T')[0],
      avgPrice: Math.round(basePrice * trend * seasonalFactor),
      medianPrice: Math.round(basePrice * 0.95 * trend * seasonalFactor),
      volume: Math.floor(50 + Math.random() * 30)
    });
  }

  return history;
}

/**
 * Analyze neighborhood insights
 */
export function analyzeNeighborhoods(properties: Property[]): NeighborhoodInsight[] {
  if (!properties || properties.length === 0) {
    return [];
  }

  // Group properties by neighborhood (extracted from address)
  const neighborhoodMap = new Map<string, Property[]>();
  
  properties.forEach(property => {
    if (property.address) {
      const neighborhood = extractNeighborhood(property.address);
      if (!neighborhoodMap.has(neighborhood)) {
        neighborhoodMap.set(neighborhood, []);
      }
      neighborhoodMap.get(neighborhood)!.push(property);
    }
  });

  const insights: NeighborhoodInsight[] = [];

  neighborhoodMap.forEach((props, neighborhood) => {
    const avgPrice = props.reduce((sum, p) => sum + (p.price || 0), 0) / props.length;
    const priceChange = (Math.random() - 0.4) * 15; // Mock: -6% to +9%
    const daysOnMarket = Math.floor(20 + Math.random() * 30);
    
    let hotness: 'hot' | 'warm' | 'cool' = 'warm';
    if (priceChange > 5 && daysOnMarket < 25) hotness = 'hot';
    else if (priceChange < 0 || daysOnMarket > 40) hotness = 'cool';

    insights.push({
      neighborhood,
      avgPrice,
      priceChange,
      inventory: props.length,
      daysOnMarket,
      hotness
    });
  });

  return insights.sort((a, b) => b.priceChange - a.priceChange);
}

/**
 * Extract neighborhood from address
 */
function extractNeighborhood(address: string): string {
  if (!address) return 'Unknown';
  const parts = address.split(',');
  return parts[1]?.trim() || 'Unknown';
}

/**
 * Calculate market competitiveness score
 */
export function calculateMarketCompetitiveness(
  properties: Property[]
): { score: number; level: string; description: string } {
  if (!properties) {
    return { score: 0, level: 'Unknown', description: 'No data available' };
  }

  const availableCount = properties.filter(p => p.available).length;
  const avgDaysOnMarket = 28; // Mock
  const priceGrowth = 5.2; // Mock

  let score = 0;
  
  // Low inventory increases competitiveness
  if (availableCount < 50) score += 30;
  else if (availableCount < 100) score += 20;
  else score += 10;

  // Fast sales increase competitiveness
  if (avgDaysOnMarket < 20) score += 30;
  else if (avgDaysOnMarket < 35) score += 20;
  else score += 10;

  // Price growth indicates demand
  if (priceGrowth > 5) score += 30;
  else if (priceGrowth > 2) score += 20;
  else score += 10;

  // Add some randomness for realism
  score += Math.floor(Math.random() * 10);

  let level = 'Moderate';
  let description = 'Balanced market conditions';

  if (score >= 75) {
    level = 'Very High';
    description = 'Highly competitive - act fast on opportunities';
  } else if (score >= 60) {
    level = 'High';
    description = 'Competitive market - be prepared to move quickly';
  } else if (score >= 40) {
    level = 'Moderate';
    description = 'Balanced market - good opportunities available';
  } else {
    level = 'Low';
    description = 'Buyer-friendly market - take your time';
  }

  return { score, level, description };
}

/**
 * Generate investment insights
 */
export function generateInvestmentInsights(property: Property): {
  appreciationPotential: number;
  rentalYield: number;
  marketDemand: number;
  overallScore: number;
} {
  // Mock calculations - in production, would use real market data
  const appreciationPotential = 65 + Math.random() * 30; // 65-95%
  const rentalYield = 4 + Math.random() * 3; // 4-7%
  const marketDemand = 60 + Math.random() * 35; // 60-95%
  const overallScore = (appreciationPotential + marketDemand) / 2;

  return {
    appreciationPotential: Math.round(appreciationPotential),
    rentalYield: Math.round(rentalYield * 10) / 10,
    marketDemand: Math.round(marketDemand),
    overallScore: Math.round(overallScore)
  };
}