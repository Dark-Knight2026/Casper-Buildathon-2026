import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart3, Globe, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { useBrokerDashboard } from '@/hooks/useBrokerDashboard';
import AgentStats from '@/components/broker/AgentStats';
import ClientStats from '@/components/client/ClientStats';

export default function BrokerAnalytics() {
  const { 
    performanceAnalytics, 
    monthlyPerformance, 
    competitorAnalysis, 
    businessInsights 
  } = useBrokerDashboard();

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
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics & Insights</h1>
      
      {/* Enhanced Performance Metrics */}
      {performanceAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Growth</p>
                  <p className="text-2xl font-bold text-gray-900">{performanceAnalytics.monthlyGrowth}</p>
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
                  <p className="text-sm font-medium text-gray-600">Quarterly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">${performanceAnalytics.quarterlyRevenue.toLocaleString()}</p>
                </div>
                <div className="flex items-center">
                  {getChangeIcon(performanceAnalytics.revenueChange)}
                  <span className="text-sm text-green-600 ml-1">{performanceAnalytics.revenueChange}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Agent Productivity</p>
                  <p className="text-2xl font-bold text-gray-900">{performanceAnalytics.agentProductivity}%</p>
                </div>
                <div className="flex items-center">
                  {getChangeIcon(performanceAnalytics.productivityChange)}
                  <span className="text-sm text-green-600 ml-1">{performanceAnalytics.productivityChange}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Market Penetration</p>
                  <p className="text-2xl font-bold text-gray-900">{performanceAnalytics.marketPenetration}%</p>
                </div>
                <div className="flex items-center">
                  {getChangeIcon(performanceAnalytics.penetrationChange)}
                  <span className="text-sm text-green-600 ml-1">{performanceAnalytics.penetrationChange}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Agent and Client Performance */}
      <AgentStats showDetailed={true} />
      <ClientStats showDetailed={true} />

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Monthly Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyPerformance.map((month) => (
                <div key={month.month} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{month.month}</span>
                    <span className="text-gray-600">${month.revenue!.toLocaleString()} • {month.deals} deals</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full" 
                      style={{ width: `${(month.revenue! / 300000) * 100}%` }}
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
              <Globe className="h-5 w-5 mr-2" />
              Market Competition Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {competitorAnalysis.map((competitor, index) => (
                <div key={index} className={`p-3 rounded-lg ${competitor.company === 'Your Brokerage' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{competitor.company}</span>
                    <Badge variant={competitor.company === 'Your Brokerage' ? 'default' : 'outline'}>
                      {competitor.marketShare}% share
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{competitor.deals} deals</span>
                    <span>Avg: ${competitor.avgPrice.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Business Intelligence & Strategic Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {businessInsights.map((insight, index) => (
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
                <p className="text-gray-600 mb-2">{insight.description}</p>
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