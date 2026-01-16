import { 
  AgentPerformanceMetrics, 
  BenchmarkComparison, 
  BenchmarkDetail,
  CoachingRecommendation,
  TeamBenchmarks 
} from '@/types/agentPerformance';

export class AgentBenchmarkCalculator {
  /**
   * Calculate comprehensive benchmark comparison for an agent
   */
  static calculateBenchmark(
    agent: AgentPerformanceMetrics,
    teamBenchmarks: TeamBenchmarks
  ): BenchmarkComparison {
    const comparisons = {
      transactionVolume: this.calculateBenchmarkDetail(
        agent.metrics.transactionVolume,
        teamBenchmarks.averages.transactionVolume,
        teamBenchmarks.topPerformers.transactionVolume,
        'higher_is_better'
      ),
      revenue: this.calculateBenchmarkDetail(
        agent.metrics.totalRevenue,
        teamBenchmarks.averages.revenue,
        teamBenchmarks.topPerformers.revenue,
        'higher_is_better'
      ),
      conversionRate: this.calculateBenchmarkDetail(
        agent.metrics.conversionRate,
        teamBenchmarks.averages.conversionRate,
        teamBenchmarks.topPerformers.conversionRate,
        'higher_is_better'
      ),
      daysToClose: this.calculateBenchmarkDetail(
        agent.metrics.averageDaysToClose,
        teamBenchmarks.averages.daysToClose,
        teamBenchmarks.topPerformers.daysToClose,
        'lower_is_better'
      ),
      clientSatisfaction: this.calculateBenchmarkDetail(
        agent.metrics.clientSatisfactionScore,
        teamBenchmarks.averages.clientSatisfaction,
        teamBenchmarks.topPerformers.clientSatisfaction,
        'higher_is_better'
      ),
      listingToSale: this.calculateBenchmarkDetail(
        agent.metrics.listingToSaleRatio,
        teamBenchmarks.averages.listingToSale,
        teamBenchmarks.topPerformers.listingToSale,
        'higher_is_better'
      )
    };

    const overallScore = this.calculateOverallScore(comparisons);
    const rank = this.calculateRank(overallScore, teamBenchmarks);
    const percentile = this.calculatePercentile(rank, teamBenchmarks.totalAgents);
    
    const strengths = this.identifyStrengths(comparisons);
    const improvementAreas = this.identifyImprovementAreas(comparisons);
    const coachingRecommendations = this.generateCoachingRecommendations(
      agent,
      comparisons,
      improvementAreas
    );

    return {
      agentId: agent.agentId,
      agentName: agent.agentName,
      overallScore,
      rank,
      percentile,
      comparisons,
      strengths,
      improvementAreas,
      coachingRecommendations
    };
  }

  private static calculateBenchmarkDetail(
    agentValue: number,
    teamAverage: number,
    topPerformerValue: number,
    direction: 'higher_is_better' | 'lower_is_better'
  ): BenchmarkDetail {
    const gap = agentValue - teamAverage;
    const gapPercentage = teamAverage !== 0 ? (gap / teamAverage) * 100 : 0;

    // Calculate percentile rank (0-100)
    let percentileRank: number;
    if (direction === 'higher_is_better') {
      percentileRank = Math.min(100, Math.max(0, 50 + gapPercentage / 2));
    } else {
      percentileRank = Math.min(100, Math.max(0, 50 - gapPercentage / 2));
    }

    // Determine status
    let status: 'excellent' | 'above_average' | 'average' | 'below_average' | 'needs_improvement';
    if (percentileRank >= 90) {
      status = 'excellent';
    } else if (percentileRank >= 70) {
      status = 'above_average';
    } else if (percentileRank >= 40) {
      status = 'average';
    } else if (percentileRank >= 20) {
      status = 'below_average';
    } else {
      status = 'needs_improvement';
    }

    return {
      agentValue,
      teamAverage,
      topPerformerValue,
      percentileRank,
      status,
      gap
    };
  }

  private static calculateOverallScore(comparisons: {
    transactionVolume: BenchmarkDetail;
    revenue: BenchmarkDetail;
    conversionRate: BenchmarkDetail;
    daysToClose: BenchmarkDetail;
    clientSatisfaction: BenchmarkDetail;
    listingToSale: BenchmarkDetail;
  }): number {
    // Weighted composite score
    const weights = {
      transactionVolume: 0.20,
      revenue: 0.25,
      conversionRate: 0.20,
      daysToClose: 0.10,
      clientSatisfaction: 0.15,
      listingToSale: 0.10
    };

    const score = 
      comparisons.transactionVolume.percentileRank * weights.transactionVolume +
      comparisons.revenue.percentileRank * weights.revenue +
      comparisons.conversionRate.percentileRank * weights.conversionRate +
      comparisons.daysToClose.percentileRank * weights.daysToClose +
      comparisons.clientSatisfaction.percentileRank * weights.clientSatisfaction +
      comparisons.listingToSale.percentileRank * weights.listingToSale;

    return Math.round(score);
  }

  private static calculateRank(overallScore: number, teamBenchmarks: TeamBenchmarks): number {
    // Estimate rank based on score and team size
    const totalAgents = teamBenchmarks.totalAgents;
    const estimatedRank = Math.ceil((100 - overallScore) / 100 * totalAgents);
    return Math.max(1, Math.min(totalAgents, estimatedRank));
  }

  private static calculatePercentile(rank: number, totalAgents: number): number {
    return Math.round((1 - (rank - 1) / totalAgents) * 100);
  }

  private static identifyStrengths(comparisons: {
    transactionVolume: BenchmarkDetail;
    revenue: BenchmarkDetail;
    conversionRate: BenchmarkDetail;
    daysToClose: BenchmarkDetail;
    clientSatisfaction: BenchmarkDetail;
    listingToSale: BenchmarkDetail;
  }): string[] {
    const strengths: string[] = [];

    if (comparisons.transactionVolume.status === 'excellent' || comparisons.transactionVolume.status === 'above_average') {
      strengths.push('High transaction volume - consistently closes deals');
    }

    if (comparisons.revenue.status === 'excellent' || comparisons.revenue.status === 'above_average') {
      strengths.push('Strong revenue generation - targets higher-value properties');
    }

    if (comparisons.conversionRate.status === 'excellent' || comparisons.conversionRate.status === 'above_average') {
      strengths.push('Excellent lead conversion - effective at closing prospects');
    }

    if (comparisons.daysToClose.status === 'excellent' || comparisons.daysToClose.status === 'above_average') {
      strengths.push('Fast transaction processing - efficient deal management');
    }

    if (comparisons.clientSatisfaction.status === 'excellent' || comparisons.clientSatisfaction.status === 'above_average') {
      strengths.push('High client satisfaction - builds strong relationships');
    }

    if (comparisons.listingToSale.status === 'excellent' || comparisons.listingToSale.status === 'above_average') {
      strengths.push('Strong listing performance - effective property marketing');
    }

    return strengths.length > 0 ? strengths : ['Consistent performer across all metrics'];
  }

  private static identifyImprovementAreas(comparisons: {
    transactionVolume: BenchmarkDetail;
    revenue: BenchmarkDetail;
    conversionRate: BenchmarkDetail;
    daysToClose: BenchmarkDetail;
    clientSatisfaction: BenchmarkDetail;
    listingToSale: BenchmarkDetail;
  }): string[] {
    const areas: string[] = [];

    if (comparisons.conversionRate.status === 'below_average' || comparisons.conversionRate.status === 'needs_improvement') {
      areas.push('Lead conversion rate');
    }

    if (comparisons.transactionVolume.status === 'below_average' || comparisons.transactionVolume.status === 'needs_improvement') {
      areas.push('Transaction volume');
    }

    if (comparisons.clientSatisfaction.status === 'below_average' || comparisons.clientSatisfaction.status === 'needs_improvement') {
      areas.push('Client satisfaction');
    }

    if (comparisons.daysToClose.status === 'below_average' || comparisons.daysToClose.status === 'needs_improvement') {
      areas.push('Transaction speed');
    }

    if (comparisons.listingToSale.status === 'below_average' || comparisons.listingToSale.status === 'needs_improvement') {
      areas.push('Listing-to-sale ratio');
    }

    if (comparisons.revenue.status === 'below_average' || comparisons.revenue.status === 'needs_improvement') {
      areas.push('Revenue per transaction');
    }

    return areas;
  }

  private static generateCoachingRecommendations(
    agent: AgentPerformanceMetrics,
    comparisons: {
      transactionVolume: BenchmarkDetail;
      revenue: BenchmarkDetail;
      conversionRate: BenchmarkDetail;
      daysToClose: BenchmarkDetail;
      clientSatisfaction: BenchmarkDetail;
      listingToSale: BenchmarkDetail;
    },
    improvementAreas: string[]
  ): CoachingRecommendation[] {
    const recommendations: CoachingRecommendation[] = [];

    // Conversion rate improvement
    if (comparisons.conversionRate.status === 'below_average' || comparisons.conversionRate.status === 'needs_improvement') {
      recommendations.push({
        id: `${agent.agentId}-conversion`,
        category: 'skills',
        priority: 'high',
        title: 'Improve Lead Conversion Rate',
        description: `Current conversion rate is ${comparisons.conversionRate.gap.toFixed(1)}% below team average. Focus on qualification and follow-up processes.`,
        expectedImpact: `Increasing conversion by 5% could add ${Math.round(agent.metrics.transactionVolume * 0.05)} deals annually`,
        suggestedActions: [
          'Implement structured lead qualification framework',
          'Improve follow-up cadence with automated reminders',
          'Shadow top performers during client consultations',
          'Attend negotiation skills workshop'
        ],
        estimatedTimeframe: '3-6 months'
      });
    }

    // Client satisfaction improvement
    if (comparisons.clientSatisfaction.status === 'below_average' || comparisons.clientSatisfaction.status === 'needs_improvement') {
      recommendations.push({
        id: `${agent.agentId}-satisfaction`,
        category: 'client_relations',
        priority: 'high',
        title: 'Enhance Client Experience',
        description: `Client satisfaction score is ${comparisons.clientSatisfaction.gap.toFixed(1)} points below team average. Focus on communication and responsiveness.`,
        expectedImpact: 'Higher satisfaction leads to more referrals and repeat business',
        suggestedActions: [
          'Implement weekly client check-in schedule',
          'Use CRM to track all client interactions',
          'Request feedback at transaction milestones',
          'Develop personalized closing gift strategy'
        ],
        estimatedTimeframe: '2-4 months'
      });
    }

    // Transaction speed improvement
    if (comparisons.daysToClose.status === 'below_average' || comparisons.daysToClose.status === 'needs_improvement') {
      recommendations.push({
        id: `${agent.agentId}-speed`,
        category: 'process',
        priority: 'medium',
        title: 'Accelerate Transaction Processing',
        description: `Average days to close is ${Math.abs(comparisons.daysToClose.gap).toFixed(0)} days longer than team average. Streamline documentation and coordination.`,
        expectedImpact: 'Faster closings allow for higher annual volume',
        suggestedActions: [
          'Create transaction checklist templates',
          'Schedule regular coordination calls with all parties',
          'Use digital document management tools',
          'Build relationships with preferred lenders and title companies'
        ],
        estimatedTimeframe: '1-3 months'
      });
    }

    // Listing performance improvement
    if (comparisons.listingToSale.status === 'below_average' || comparisons.listingToSale.status === 'needs_improvement') {
      recommendations.push({
        id: `${agent.agentId}-listing`,
        category: 'marketing',
        priority: 'medium',
        title: 'Improve Listing Performance',
        description: `Listing-to-sale ratio is ${comparisons.listingToSale.gap.toFixed(1)}% below team average. Focus on pricing strategy and marketing.`,
        expectedImpact: 'Better listing performance increases seller satisfaction and referrals',
        suggestedActions: [
          'Conduct comparative market analysis training',
          'Enhance property photography and staging',
          'Increase digital marketing presence',
          'Host more open houses and broker tours'
        ],
        estimatedTimeframe: '2-4 months'
      });
    }

    // Revenue optimization
    if (comparisons.revenue.status === 'below_average' || comparisons.revenue.status === 'needs_improvement') {
      recommendations.push({
        id: `${agent.agentId}-revenue`,
        category: 'skills',
        priority: 'medium',
        title: 'Increase Average Deal Size',
        description: `Revenue per transaction is below team average. Target higher-value properties and clients.`,
        expectedImpact: `Increasing average deal size by 10% could add $${Math.round(agent.metrics.totalRevenue * 0.1).toLocaleString()} in annual revenue`,
        suggestedActions: [
          'Focus prospecting on higher-value neighborhoods',
          'Develop luxury market expertise',
          'Build relationships with high-net-worth clients',
          'Partner with financial advisors and wealth managers'
        ],
        estimatedTimeframe: '6-12 months'
      });
    }

    // Volume improvement
    if (comparisons.transactionVolume.status === 'below_average' || comparisons.transactionVolume.status === 'needs_improvement') {
      recommendations.push({
        id: `${agent.agentId}-volume`,
        category: 'process',
        priority: 'high',
        title: 'Increase Transaction Volume',
        description: `Transaction volume is ${Math.abs(comparisons.transactionVolume.gap).toFixed(0)} deals below team average. Focus on lead generation and time management.`,
        expectedImpact: 'Higher volume directly increases annual revenue',
        suggestedActions: [
          'Implement lead generation system (sphere, online, referrals)',
          'Delegate administrative tasks to support staff',
          'Use transaction coordinator for closings',
          'Set and track monthly activity goals'
        ],
        estimatedTimeframe: '3-6 months'
      });
    }

    // Sort by priority and return top 5
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return recommendations
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 5);
  }

  /**
   * Generate mock team benchmarks for demonstration
   */
  static generateTeamBenchmarks(totalAgents: number): TeamBenchmarks {
    return {
      totalAgents,
      period: 'Q4 2024',
      averages: {
        transactionVolume: 12,
        revenue: 360000,
        conversionRate: 28,
        daysToClose: 45,
        clientSatisfaction: 4.3,
        listingToSale: 85
      },
      topPerformers: {
        transactionVolume: 24,
        revenue: 720000,
        conversionRate: 42,
        daysToClose: 32,
        clientSatisfaction: 4.8,
        listingToSale: 95
      },
      distribution: {
        excellent: Math.round(totalAgents * 0.15),
        aboveAverage: Math.round(totalAgents * 0.25),
        average: Math.round(totalAgents * 0.35),
        belowAverage: Math.round(totalAgents * 0.15),
        needsImprovement: Math.round(totalAgents * 0.10)
      }
    };
  }
}