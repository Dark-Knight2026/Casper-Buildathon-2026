import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart3, PieChart, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { useAgentDashboard } from '@/hooks/useAgentDashboard';
import ClientStats from '@/components/client/ClientStats';
import ListingStats from '@/components/listing/ListingStats';

export default function AgentPerformance() {
  const {
    performanceAnalytics,
    monthlyPerformance,
    clientAnalysis,
    performanceInsights
  } = useAgentDashboard();

  const getChangeIcon = (change: string) => {
    if (change.startsWith('+')) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (change.startsWith('-')) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'neutral': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Performance Analytics</h1>
      
      {/* Enhanced Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sales Growth</p>
                <p className="text-2xl font-bold text-gray-900">{performanceAnalytics?.salesGrowth}</p>
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commission Growth</p>
                <p className="text-2xl font-bold text-gray-900">{performanceAnalytics?.commissionGrowth}</p>
              </div>
              <div className="flex items-center">
                {performanceAnalytics && getChangeIcon(performanceAnalytics.commissionGrowth)}
                <span className="text-sm text-green-600 ml-1">{performanceAnalytics?.commissionGrowth}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client Retention</p>
                <p className="text-2xl font-bold text-gray-900">{performanceAnalytics?.clientRetention}%</p>
              </div>
              <div className="flex items-center">
                {performanceAnalytics && getChangeIcon(performanceAnalytics.retentionChange)}
                <span className="text-sm text-green-600 ml-1">{performanceAnalytics?.retentionChange}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Efficiency Score</p>
                <p className="text-2xl font-bold text-gray-900">{performanceAnalytics?.efficiency}%</p>
              </div>
              <div className="flex items-center">
                {performanceAnalytics && getChangeIcon(performanceAnalytics.efficiencyChange)}
                <span className="text-sm text-green-600 ml-1">{performanceAnalytics?.efficiencyChange}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Performance Integration */}
      <ClientStats showDetailed={true} />

      {/* Listing Performance Integration */}
      <ListingStats showDetailed={true} />

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Monthly Sales Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyPerformance.map((month) => (
                <div key={month.month} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{month.month}</span>
                    <span className="text-muted-foreground">${month.sales!.toLocaleString()} • {month.deals} deals</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-600 h-3 rounded-full" 
                      style={{ width: `${(month.sales! / 300000) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Client Portfolio Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientAnalysis.map((segment, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{segment.type}</span>
                    <Badge variant="outline">{segment.count} clients</Badge>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Avg: ${(segment.avgBudget || segment.avgValue)?.toLocaleString()}</span>
                    <span>Conversion: {segment.conversionRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Performance Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceInsights.map((insight, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{insight.title}</h3>
                  <Badge 
                    variant="outline" 
                    className={getImpactColor(insight.impact)}
                  >
                    {insight.impact}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-2">{insight.description}</p>
                <p className="text-sm font-medium text-blue-600">
                  💡 {insight.recommendation}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}