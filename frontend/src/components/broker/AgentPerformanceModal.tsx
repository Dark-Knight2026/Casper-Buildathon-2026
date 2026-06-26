import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Agent } from '@/types/agent';
import { useAgent } from '@/contexts/AgentContext';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Award, 
  Users,
  Home,
  Calendar,
  Star,
  Download,
  Share2,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

interface AgentPerformanceModalProps {
  agent: Agent;
  trigger?: React.ReactNode;
}

export default function AgentPerformanceModal({ agent, trigger }: AgentPerformanceModalProps) {
  const { getAgentPerformanceReport } = useAgent();
  const [open, setOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  const performanceReport = getAgentPerformanceReport(agent.id, selectedPeriod);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getChangeIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getPerformanceColor = (value: number, threshold: { good: number; excellent: number }) => {
    if (value >= threshold.excellent) return 'text-green-600';
    if (value >= threshold.good) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRankingColor = (rank: number, total: number) => {
    const percentile = (total - rank + 1) / total;
    if (percentile >= 0.8) return 'bg-green-100 text-green-800';
    if (percentile >= 0.6) return 'bg-blue-100 text-blue-800';
    if (percentile >= 0.4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (!performanceReport) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Performance Report - {agent.name}
            </div>
            <div className="flex items-center space-x-2">
              <Select value={selectedPeriod} onValueChange={(value: 'monthly' | 'quarterly' | 'yearly') => setSelectedPeriod(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sales Volume</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(performanceReport.metrics.salesVolume)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
                <div className="mt-2 flex items-center">
                  {getChangeIcon(performanceReport.metrics.salesVolume, performanceReport.metrics.salesVolume * 0.9)}
                  <span className="text-sm text-green-600 ml-1">+12.5%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {performanceReport.metrics.transactionCount}
                    </p>
                  </div>
                  <Home className="h-8 w-8 text-blue-500" />
                </div>
                <div className="mt-2 flex items-center">
                  {getChangeIcon(performanceReport.metrics.transactionCount, performanceReport.metrics.transactionCount - 2)}
                  <span className="text-sm text-green-600 ml-1">+8.3%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Transaction</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(performanceReport.metrics.averageTransactionValue)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
                <div className="mt-2 flex items-center">
                  {getChangeIcon(performanceReport.metrics.averageTransactionValue, performanceReport.metrics.averageTransactionValue * 0.95)}
                  <span className="text-sm text-green-600 ml-1">+5.2%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Commission Earned</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(performanceReport.metrics.commissionEarned)}
                    </p>
                  </div>
                  <Award className="h-8 w-8 text-orange-500" />
                </div>
                <div className="mt-2 flex items-center">
                  {getChangeIcon(performanceReport.metrics.commissionEarned, performanceReport.metrics.commissionEarned * 0.88)}
                  <span className="text-sm text-green-600 ml-1">+13.6%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Goal Achievement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Sales Volume Goal</span>
                    <span className="text-sm font-bold">
                      {formatPercentage(performanceReport.goals.achievement)}
                    </span>
                  </div>
                  <Progress value={performanceReport.goals.achievement} className="h-3" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{formatCurrency(performanceReport.metrics.salesVolume)}</span>
                    <span>{formatCurrency(performanceReport.goals.salesVolumeGoal)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Transaction Goal</span>
                    <span className="text-sm font-bold">
                      {formatPercentage((performanceReport.metrics.transactionCount / performanceReport.goals.transactionGoal) * 100)}
                    </span>
                  </div>
                  <Progress 
                    value={(performanceReport.metrics.transactionCount / performanceReport.goals.transactionGoal) * 100} 
                    className="h-3" 
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{performanceReport.metrics.transactionCount} deals</span>
                    <span>{performanceReport.goals.transactionGoal} deals</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getPerformanceColor(performanceReport.goals.achievement, { good: 80, excellent: 100 })}`}>
                      {performanceReport.goals.achievement >= 100 ? 'Goal Exceeded!' : 
                       performanceReport.goals.achievement >= 80 ? 'On Track' : 'Below Target'}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Overall Performance Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Performance Rankings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Sales Volume Rank</p>
                    <p className="text-sm text-gray-600">Out of {performanceReport.rankings.totalAgents} agents</p>
                  </div>
                  <Badge className={getRankingColor(performanceReport.rankings.salesVolumeRank, performanceReport.rankings.totalAgents)}>
                    #{performanceReport.rankings.salesVolumeRank}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Transaction Count Rank</p>
                    <p className="text-sm text-gray-600">Out of {performanceReport.rankings.totalAgents} agents</p>
                  </div>
                  <Badge className={getRankingColor(performanceReport.rankings.transactionCountRank, performanceReport.rankings.totalAgents)}>
                    #{performanceReport.rankings.transactionCountRank}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Client Satisfaction Rank</p>
                    <p className="text-sm text-gray-600">Out of {performanceReport.rankings.totalAgents} agents</p>
                  </div>
                  <Badge className={getRankingColor(performanceReport.rankings.clientSatisfactionRank, performanceReport.rankings.totalAgents)}>
                    #{performanceReport.rankings.clientSatisfactionRank}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="h-5 w-5 mr-2" />
                  Listing Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {performanceReport.metrics.listingsCreated}
                    </div>
                    <div className="text-sm text-gray-600">Listings Created</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {performanceReport.metrics.listingsSold}
                    </div>
                    <div className="text-sm text-gray-600">Listings Sold</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Listing Success Rate</span>
                    <span className="text-sm font-medium">
                      {formatPercentage((performanceReport.metrics.listingsSold / Math.max(performanceReport.metrics.listingsCreated, 1)) * 100)}
                    </span>
                  </div>
                  <Progress 
                    value={(performanceReport.metrics.listingsSold / Math.max(performanceReport.metrics.listingsCreated, 1)) * 100} 
                    className="h-2" 
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Average Days on Market</span>
                    <span className="font-medium">{performanceReport.metrics.averageDaysOnMarket} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Client Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {performanceReport.metrics.clientAcquisition}
                    </div>
                    <div className="text-sm text-gray-600">New Clients</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {performanceReport.metrics.clientRetention}%
                    </div>
                    <div className="text-sm text-gray-600">Retention Rate</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Client Satisfaction</span>
                    <span className="text-sm font-medium">
                      {agent.performance.clientSatisfactionScore.toFixed(1)}/5.0
                    </span>
                  </div>
                  <Progress 
                    value={(agent.performance.clientSatisfactionScore / 5) * 100} 
                    className="h-2" 
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Active Clients</span>
                    <span className="font-medium">{agent.assignedClients.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Performance Insights & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-green-600">Strengths</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Consistently exceeds sales volume targets</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>High client satisfaction ratings (4.8/5.0)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Strong conversion rate at {agent.performance.conversionRate}%</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Properties sell faster than market average</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-blue-600">Growth Opportunities</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">→</span>
                      <span>Focus on luxury market segment expansion</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">→</span>
                      <span>Increase social media marketing presence</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">→</span>
                      <span>Consider team expansion for higher volume</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">→</span>
                      <span>Implement CRM automation for lead nurturing</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share Report
            </Button>
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}