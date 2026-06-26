import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  FileText, 
  BarChart3, 
  Building, 
  DollarSign,
  TrendingUp,
  Shield,
  Award
} from 'lucide-react';

export default function EnhancedBrokerOffers() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const brokerageStats = {
    totalAgents: 24,
    activeTransactions: 89,
    monthlyRevenue: 2850000,
    pendingOffers: 156,
    closedDeals: 234,
    complianceScore: 98
  };

  const topAgents = [
    {
      id: 1,
      name: 'Emily Rodriguez',
      deals: 24,
      revenue: 485000,
      performance: 'excellent'
    },
    {
      id: 2,
      name: 'Michael Smith',
      deals: 18,
      revenue: 320000,
      performance: 'good'
    },
    {
      id: 3,
      name: 'Lisa Johnson',
      deals: 15,
      revenue: 245000,
      performance: 'good'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Broker Features</h1>
          <p className="text-gray-600 mt-1">
            Advanced brokerage management - team oversight, transaction monitoring, and performance analytics
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Brokerage Overview</TabsTrigger>
            <TabsTrigger value="agents">Agent Performance</TabsTrigger>
            <TabsTrigger value="transactions">Transaction Monitor</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Center</TabsTrigger>
            <TabsTrigger value="analytics">Market Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Agents</p>
                      <p className="text-2xl font-bold text-red-600">{brokerageStats.totalAgents}</p>
                    </div>
                    <Users className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Transactions</p>
                      <p className="text-2xl font-bold text-blue-600">{brokerageStats.activeTransactions}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${(brokerageStats.monthlyRevenue / 1000000).toFixed(1)}M
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                      <p className="text-2xl font-bold text-purple-600">{brokerageStats.complianceScore}%</p>
                    </div>
                    <Shield className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topAgents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-pink-400 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {agent.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{agent.name}</p>
                            <p className="text-sm text-gray-600">{agent.deals} deals • ${(agent.revenue / 1000).toFixed(0)}K revenue</p>
                          </div>
                        </div>
                        <Badge className={
                          agent.performance === 'excellent' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }>
                          {agent.performance}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Brokerage Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pending Offers</span>
                      <span className="font-medium">{brokerageStats.pendingOffers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Closed Deals (YTD)</span>
                      <span className="font-medium">{brokerageStats.closedDeals}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Average Deal Size</span>
                      <span className="font-medium">$685K</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Commission Rate</span>
                      <span className="font-medium">2.8%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="agents">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Agent Performance Management</h3>
                <p className="text-gray-600">Comprehensive agent performance tracking, goals, and development tools</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Transaction Monitoring</h3>
                <p className="text-gray-600">Real-time oversight of all brokerage transactions and deal pipeline</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance">
            <Card>
              <CardContent className="p-6 text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Compliance Management</h3>
                <p className="text-gray-600">Regulatory compliance tracking, training, and audit management</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Market Analytics</h3>
                <p className="text-gray-600">Advanced market analysis, trends, and competitive intelligence</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}