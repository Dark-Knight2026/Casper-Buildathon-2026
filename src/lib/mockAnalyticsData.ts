import { ConfigurationAnalytics, ConfigurationPerformance } from '@/types/dealHealth';

/**
 * Generate mock analytics data for configuration performance tracking
 */
export function generateMockAnalytics(): ConfigurationAnalytics {
  const configurations: ConfigurationPerformance[] = [
    {
      configurationId: 'residential',
      configurationName: 'Residential Properties',
      totalDealsUsed: 145,
      successfulClosings: 132,
      failedDeals: 13,
      averageHealthScore: 78,
      accuracyRate: 92,
      falsePositives: 8,
      falseNegatives: 5,
      averageDaysToClose: 38,
      propertyTypeBreakdown: [
        { propertyType: 'residential', count: 145, successRate: 91 }
      ],
      lastUsed: new Date('2024-01-08')
    },
    {
      configurationId: 'commercial',
      configurationName: 'Commercial Properties',
      totalDealsUsed: 42,
      successfulClosings: 38,
      failedDeals: 4,
      averageHealthScore: 82,
      accuracyRate: 90,
      falsePositives: 3,
      falseNegatives: 1,
      averageDaysToClose: 67,
      propertyTypeBreakdown: [
        { propertyType: 'commercial', count: 42, successRate: 90 }
      ],
      lastUsed: new Date('2024-01-09')
    },
    {
      configurationId: 'luxury',
      configurationName: 'Luxury Residential',
      totalDealsUsed: 28,
      successfulClosings: 26,
      failedDeals: 2,
      averageHealthScore: 85,
      accuracyRate: 93,
      falsePositives: 1,
      falseNegatives: 1,
      averageDaysToClose: 52,
      propertyTypeBreakdown: [
        { propertyType: 'luxury', count: 28, successRate: 93 }
      ],
      lastUsed: new Date('2024-01-10')
    },
    {
      configurationId: 'multi-family',
      configurationName: 'Multi-Family Properties',
      totalDealsUsed: 35,
      successfulClosings: 31,
      failedDeals: 4,
      averageHealthScore: 80,
      accuracyRate: 89,
      falsePositives: 2,
      falseNegatives: 2,
      averageDaysToClose: 58,
      propertyTypeBreakdown: [
        { propertyType: 'multi-family', count: 35, successRate: 89 }
      ],
      lastUsed: new Date('2024-01-07')
    },
    {
      configurationId: 'default',
      configurationName: 'Standard Scoring',
      totalDealsUsed: 198,
      successfulClosings: 175,
      failedDeals: 23,
      averageHealthScore: 76,
      accuracyRate: 88,
      falsePositives: 15,
      falseNegatives: 8,
      averageDaysToClose: 42,
      propertyTypeBreakdown: [
        { propertyType: 'residential', count: 120, successRate: 87 },
        { propertyType: 'commercial', count: 35, successRate: 89 },
        { propertyType: 'multi-family', count: 25, successRate: 88 },
        { propertyType: 'luxury', count: 18, successRate: 94 }
      ],
      lastUsed: new Date('2024-01-10')
    },
    {
      configurationId: 'fast-track',
      configurationName: 'Fast-Track Scoring',
      totalDealsUsed: 87,
      successfulClosings: 79,
      failedDeals: 8,
      averageHealthScore: 81,
      accuracyRate: 91,
      falsePositives: 5,
      falseNegatives: 3,
      averageDaysToClose: 28,
      propertyTypeBreakdown: [
        { propertyType: 'residential', count: 87, successRate: 91 }
      ],
      lastUsed: new Date('2024-01-09')
    },
    {
      configurationId: 'land',
      configurationName: 'Land & Development',
      totalDealsUsed: 15,
      successfulClosings: 13,
      failedDeals: 2,
      averageHealthScore: 77,
      accuracyRate: 87,
      falsePositives: 1,
      falseNegatives: 1,
      averageDaysToClose: 95,
      propertyTypeBreakdown: [
        { propertyType: 'land', count: 15, successRate: 87 }
      ],
      lastUsed: new Date('2024-01-05')
    }
  ];

  // Find best overall configuration
  const bestOverall = configurations.reduce((best, current) => 
    current.accuracyRate > best.accuracyRate ? current : best
  );

  // Calculate best by property type
  const propertyTypeMap = new Map<string, { config: ConfigurationPerformance; successRate: number }>();
  
  configurations.forEach(config => {
    config.propertyTypeBreakdown.forEach(pt => {
      const existing = propertyTypeMap.get(pt.propertyType);
      if (!existing || pt.successRate > existing.successRate) {
        propertyTypeMap.set(pt.propertyType, { config, successRate: pt.successRate });
      }
    });
  });

  const bestByPropertyType = Array.from(propertyTypeMap.entries()).map(([propertyType, data]) => ({
    propertyType,
    configurationId: data.config.configurationId,
    configurationName: data.config.configurationName,
    successRate: data.successRate
  }));

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (bestOverall.configurationId === 'luxury') {
    recommendations.push('Luxury Residential configuration shows highest accuracy (93%). Consider using it for high-value properties over $1M.');
  }
  
  if (bestOverall.configurationId === 'residential') {
    recommendations.push('Residential Properties configuration performs best overall with 92% accuracy across 145 deals. Recommended as default for standard transactions.');
  }

  const commercialConfig = configurations.find(c => c.configurationId === 'commercial');
  if (commercialConfig && commercialConfig.averageDaysToClose > 60) {
    recommendations.push('Commercial deals average 67 days to close. Consider extending alert thresholds for commercial properties to reduce false positives.');
  }

  const fastTrackConfig = configurations.find(c => c.configurationId === 'fast-track');
  if (fastTrackConfig && fastTrackConfig.averageDaysToClose < 30) {
    recommendations.push('Fast-Track configuration achieves 28-day average closing time with 91% accuracy. Ideal for competitive markets requiring quick turnarounds.');
  }

  const standardConfig = configurations.find(c => c.configurationId === 'default');
  if (standardConfig && standardConfig.falsePositives > 10) {
    recommendations.push('Standard Scoring shows 15 false positives. Consider using property-specific configurations to improve prediction accuracy.');
  }

  recommendations.push('Property-specific configurations consistently outperform general configurations by 3-5% in accuracy. Recommend switching to property-type templates when possible.');

  return {
    configurations,
    bestOverallConfiguration: bestOverall.configurationId,
    bestByPropertyType,
    recommendations
  };
}