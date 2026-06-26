import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Users,
  DollarSign,
  Clock,
  Star,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  FileText
} from 'lucide-react';
import { AgentPerformanceMetrics, BenchmarkComparison } from '@/types/agentPerformance';
import { AgentBenchmarkCalculator } from '@/lib/agentBenchmarkCalculator';

export default function AgentBenchmarkDashboard() {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'all' | 'top' | 'needs_coaching'>('all');

  // Mock agent performance data
  const agentPerformanceData: AgentPerformanceMetrics[] = [
    {
      agentId: '1',
      agentName: 'Emily Rodriguez',
      period: 'quarter',
      metrics: {
        transactionVolume: 18,
        totalRevenue: 540000,
        averageDealSize: 30000,
        conversionRate: 35,
        averageDaysToClose: 38,
        clientSatisfactionScore: 4.7,
        listingToSaleRatio: 92,
        repeatClientRate: 25,
        referralRate: 40
      },
      trends: {
        volumeChange: 15,
        revenueChange: 20,
        conversionChange: 8,
        satisfactionChange: 5
      }
    },
    {
      agentId: '2',
      agentName: 'Michael Smith',
      period: 'quarter',
      metrics: {
        transactionVolume: 14,
        totalRevenue: 420000,
        averageDealSize: 30000,
        conversionRate: 30,
        averageDaysToClose: 42,
        clientSatisfactionScore: 4.5,
        listingToSaleRatio: 88,
        repeatClientRate: 20,
        referralRate: 35
      },
      trends: {
        volumeChange: 8,
        revenueChange: 12,
        conversionChange: 5,
        satisfactionChange: 3
      }
    },
    {
      agentId: '3',
      agentName: 'Lisa Johnson',
      period: 'quarter',
      metrics: {
        transactionVolume: 10,
        totalRevenue: 300000,
        averageDealSize: 30000,
        conversionRate: 22,
        averageDaysToClose: 52,
        clientSatisfactionScore: 4.1,
        listingToSaleRatio: 78,
        repeatClientRate: 15,
        referralRate: 25
      },
      trends: {
        volumeChange: -5,
        revenueChange: -3,
        conversionChange: -2,
        satisfactionChange: -1
      }
    },
    {
      agentId: '4',
      agentName: 'David Chen',
      period: 'quarter',
      metrics: {
        transactionVolume: 16,
        totalRevenue: 480000,
        averageDealSize: 30000,
        conversionRate: 32,
        averageDaysToClose: 40,
        clientSatisfactionScore: 4.6,
        listingToSaleRatio: 90,
        repeatClientRate: 22,
        referralRate: 38
      },
      trends: {
        volumeChange: 12,
        revenueChange: 15,
        conversionChange: 6,
        satisfactionChange: 4
      }
    },
    {
      agentId: '5',
      agentName: 'Sarah Williams',
      period: 'quarter',
      metrics: {
        transactionVolume: 8,
        totalRevenue: 240000,
        averageDealSize: 30000,
        conversionRate: 18,
        averageDaysToClose: 58,
        clientSatisfactionScore: 3.9,
        listingToSaleRatio: 72,
        repeatClientRate: 12,
        referralRate: 20
      },
      trends: {
        volumeChange: -8,
        revenueChange: -10,
        conversionChange: -5,
        satisfactionChange: -3
      }
    }
  ];

  const teamBenchmarks = AgentBenchmarkCalculator.generateTeamBenchmarks(agentPerformanceData.length);
  const benchmarkComparisons = agentPerformanceData.map(agent =>
    AgentBenchmarkCalculator.calculateBenchmark(agent, teamBenchmarks)
  );

  // Filter agents based on selected view
  const filteredComparisons = benchmarkComparisons.filter(comparison => {
    if (selectedView === 'top') {
      return comparison.percentile >= 70;
    } else if (selectedView === 'needs_coaching') {
      return comparison.coachingRecommendations.some(rec => rec.priority === 'high');
    }
    return true;
  }).sort((a, b) => b.overallScore - a.overallScore);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'above_average': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'average': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'below_average': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'needs_improvement': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Performance Benchmarking</h2>
          <p className="text-sm text-gray-600 mt-1">Comparative analytics and personalized coaching recommendations</p>
        </div>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Agents</p>
                <p className="text-2xl font-bold text-gray-900">{teamBenchmarks.totalAgents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Volume</p>
                <p className="text-2xl font-bold text-gray-900">{teamBenchmarks.averages.transactionVolume}</p>
                <p className="text-xs text-gray-500">deals/quarter</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${(teamBenchmarks.averages.revenue / 1000).toFixed(0)}K</p>
                <p className="text-xs text-gray-500">per quarter</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Satisfaction</p>
                <p className="text-2xl font-bold text-gray-900">{teamBenchmarks.averages.clientSatisfaction.toFixed(1)}</p>
                <p className="text-xs text-gray-500">out of 5.0</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Filters */}
      <div className="flex gap-2">
        <Button
          variant={selectedView === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedView('all')}
        >
          All Agents
        </Button>
        <Button
          variant={selectedView === 'top' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedView('top')}
        >
          <Award className="h-4 w-4 mr-1" />
          Top Performers
        </Button>
        <Button
          variant={selectedView === 'needs_coaching' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedView('needs_coaching')}
        >
          <Target className="h-4 w-4 mr-1" />
          Needs Coaching
        </Button>
      </div>

      {/* Agent Benchmark Cards */}
      <div className="space-y-4">
        {filteredComparisons.map((comparison, index) => {
          const agent = agentPerformanceData.find(a => a.agentId === comparison.agentId)!;
          const isExpanded = expandedAgent === comparison.agentId;

          return (
            <Card key={comparison.agentId} className="border-2">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold text-lg">
                      #{comparison.rank}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{comparison.agentName}</h3>
                        {comparison.percentile >= 90 && (
                          <Award className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Percentile:</span>
                          <span>{comparison.percentile}th</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Volume:</span>
                          <span>{agent.metrics.transactionVolume} deals</span>
                          {getTrendIcon(agent.trends.volumeChange)}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Revenue:</span>
                          <span>${(agent.metrics.totalRevenue / 1000).toFixed(0)}K</span>
                          {getTrendIcon(agent.trends.revenueChange)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-gray-600">Performance Score</p>
                    <p className={`text-3xl font-bold ${getScoreColor(comparison.overallScore)}`}>
                      {comparison.overallScore}
                    </p>
                    <p className="text-xs text-gray-500">out of 100</p>
                  </div>
                </div>

                {/* Key Metrics Comparison */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">Conversion Rate</span>
                      <Badge className={getStatusColor(comparison.comparisons.conversionRate.status)} variant="outline">
                        {comparison.comparisons.conversionRate.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">{agent.metrics.conversionRate}%</span>
                      <span className="text-xs text-gray-500">vs {teamBenchmarks.averages.conversionRate}% avg</span>
                    </div>
                    <Progress value={comparison.comparisons.conversionRate.percentileRank} className="h-1.5 mt-1" />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">Days to Close</span>
                      <Badge className={getStatusColor(comparison.comparisons.daysToClose.status)} variant="outline">
                        {comparison.comparisons.daysToClose.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">{agent.metrics.averageDaysToClose}</span>
                      <span className="text-xs text-gray-500">vs {teamBenchmarks.averages.daysToClose} avg</span>
                    </div>
                    <Progress value={comparison.comparisons.daysToClose.percentileRank} className="h-1.5 mt-1" />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">Client Satisfaction</span>
                      <Badge className={getStatusColor(comparison.comparisons.clientSatisfaction.status)} variant="outline">
                        {comparison.comparisons.clientSatisfaction.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">{agent.metrics.clientSatisfactionScore.toFixed(1)}</span>
                      <span className="text-xs text-gray-500">vs {teamBenchmarks.averages.clientSatisfaction.toFixed(1)} avg</span>
                    </div>
                    <Progress value={comparison.comparisons.clientSatisfaction.percentileRank} className="h-1.5 mt-1" />
                  </div>
                </div>

                {/* Strengths & Improvement Areas Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-semibold text-green-900 mb-2">💪 Key Strengths</p>
                    <ul className="text-xs text-green-800 space-y-1">
                      {comparison.strengths.slice(0, 2).map((strength, idx) => (
                        <li key={idx}>• {strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm font-semibold text-orange-900 mb-2">🎯 Growth Opportunities</p>
                    <ul className="text-xs text-orange-800 space-y-1">
                      {comparison.improvementAreas.slice(0, 2).map((area, idx) => (
                        <li key={idx}>• {area}</li>
                      ))}
                      {comparison.improvementAreas.length === 0 && (
                        <li>• Maintain current performance levels</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Coaching Recommendations Badge */}
                {comparison.coachingRecommendations.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-blue-900">
                      {comparison.coachingRecommendations.length} personalized coaching recommendation(s) available
                    </p>
                  </div>
                )}

                {/* Expand/Collapse Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedAgent(isExpanded ? null : comparison.agentId)}
                  className="w-full"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Detailed Analysis
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show Detailed Analysis & Coaching Plan
                    </>
                  )}
                </Button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-6">
                    {/* Detailed Metrics Comparison */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Detailed Performance Comparison
                      </h4>
                      <Tabs defaultValue="metrics" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="metrics">All Metrics</TabsTrigger>
                          <TabsTrigger value="trends">Trends</TabsTrigger>
                        </TabsList>
                        <TabsContent value="metrics" className="space-y-3 mt-4">
                          {Object.entries(comparison.comparisons).map(([key, detail]) => (
                            <div key={key} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <Badge className={getStatusColor(detail.status)} variant="outline">
                                  {detail.percentileRank}th percentile
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <p className="text-gray-600">Your Value</p>
                                  <p className="font-semibold">{detail.agentValue.toFixed(1)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Team Avg</p>
                                  <p className="font-semibold">{detail.teamAverage.toFixed(1)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Top Performer</p>
                                  <p className="font-semibold">{detail.topPerformerValue.toFixed(1)}</p>
                                </div>
                              </div>
                              <Progress value={detail.percentileRank} className="h-2 mt-2" />
                            </div>
                          ))}
                        </TabsContent>
                        <TabsContent value="trends" className="space-y-3 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Volume Trend</span>
                                {getTrendIcon(agent.trends.volumeChange)}
                              </div>
                              <p className="text-2xl font-bold mt-1">{agent.trends.volumeChange > 0 ? '+' : ''}{agent.trends.volumeChange}%</p>
                              <p className="text-xs text-gray-600">vs previous quarter</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Revenue Trend</span>
                                {getTrendIcon(agent.trends.revenueChange)}
                              </div>
                              <p className="text-2xl font-bold mt-1">{agent.trends.revenueChange > 0 ? '+' : ''}{agent.trends.revenueChange}%</p>
                              <p className="text-xs text-gray-600">vs previous quarter</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Conversion Trend</span>
                                {getTrendIcon(agent.trends.conversionChange)}
                              </div>
                              <p className="text-2xl font-bold mt-1">{agent.trends.conversionChange > 0 ? '+' : ''}{agent.trends.conversionChange}%</p>
                              <p className="text-xs text-gray-600">vs previous quarter</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Satisfaction Trend</span>
                                {getTrendIcon(agent.trends.satisfactionChange)}
                              </div>
                              <p className="text-2xl font-bold mt-1">{agent.trends.satisfactionChange > 0 ? '+' : ''}{agent.trends.satisfactionChange}%</p>
                              <p className="text-xs text-gray-600">vs previous quarter</p>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* Coaching Recommendations */}
                    {comparison.coachingRecommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center">
                          <Lightbulb className="h-4 w-4 mr-2" />
                          Personalized Coaching Plan
                        </h4>
                        <div className="space-y-3">
                          {comparison.coachingRecommendations.map((rec) => (
                            <div key={rec.id} className="p-4 border rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-semibold">{rec.title}</h5>
                                    <Badge className={getPriorityColor(rec.priority)}>
                                      {rec.priority} priority
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                                  <p className="text-sm font-medium text-blue-600 mb-3">
                                    💡 {rec.expectedImpact}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Suggested Actions:</p>
                                <ul className="text-sm text-gray-700 space-y-1">
                                  {rec.suggestedActions.map((action, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="text-blue-600 mt-1">•</span>
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                                <p className="text-xs text-gray-500 mt-2">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  Estimated timeframe: {rec.estimatedTimeframe}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="default">
                        Schedule Coaching Session
                      </Button>
                      <Button size="sm" variant="outline">
                        View Full History
                      </Button>
                      <Button size="sm" variant="outline">
                        Export Report
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredComparisons.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No agents match the selected filter</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}