import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAgent } from '@/contexts/AgentContext';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Award, 
  Star,
  Target,
  Activity,
  UserPlus
} from 'lucide-react';

interface AgentStatsProps {
  showDetailed?: boolean;
}

export default function AgentStats({ showDetailed = false }: AgentStatsProps) {
  const { agentStats, agents } = useAgent();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 4.5) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 4.0) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (score >= 3.5) return { label: 'Average', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  const performanceLevel = getPerformanceLevel(agentStats.averagePerformanceScore);

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Agents</p>
                <p className="text-2xl font-bold text-gray-900">{agentStats.totalAgents}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {agentStats.activeAgents} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sales Volume</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(agentStats.totalSalesVolume)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {agentStats.totalTransactions} transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Performance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {agentStats.averagePerformanceScore.toFixed(1)}
                </p>
                <Badge className={performanceLevel.color} variant="secondary">
                  {performanceLevel.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserPlus className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">{agentStats.newAgentsThisMonth}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {((agentStats.newAgentsThisMonth / agentStats.totalAgents) * 100).toFixed(1)}% growth
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performer Card */}
      {agentStats.topPerformer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{agentStats.topPerformer.name}</h3>
                  <p className="text-gray-600">{agentStats.topPerformer.email}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="text-sm font-medium">
                        {agentStats.topPerformer.performance.clientSatisfactionScore.toFixed(1)}
                      </span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {agentStats.topPerformer.role.replace('-', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(agentStats.topPerformer.performance.totalVolume)}
                </p>
                <p className="text-sm text-gray-600">Total Sales Volume</p>
                <p className="text-xs text-gray-500 mt-1">
                  {agentStats.topPerformer.performance.totalSales} transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Stats */}
      {showDetailed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Agent Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span>Active Agents</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{agentStats.activeAgents}</span>
                    <Badge className="bg-green-100 text-green-800">
                      {((agentStats.activeAgents / agentStats.totalAgents) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                    <span>Pending Agents</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {agents.filter(a => a.status === 'pending').length}
                    </span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {((agents.filter(a => a.status === 'pending').length / agentStats.totalAgents) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                    <span>Inactive Agents</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {agents.filter(a => a.status === 'inactive').length}
                    </span>
                    <Badge className="bg-gray-100 text-gray-800">
                      {((agents.filter(a => a.status === 'inactive').length / agentStats.totalAgents) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Role Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <span>Team Leads</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {agents.filter(a => a.role === 'team-lead').length}
                    </span>
                    <Badge className="bg-purple-100 text-purple-800">
                      {((agents.filter(a => a.role === 'team-lead').length / agentStats.totalAgents) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span>Senior Agents</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {agents.filter(a => a.role === 'senior-agent').length}
                    </span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {((agents.filter(a => a.role === 'senior-agent').length / agentStats.totalAgents) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                    <span>Agents</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {agents.filter(a => a.role === 'agent').length}
                    </span>
                    <Badge className="bg-gray-100 text-gray-800">
                      {((agents.filter(a => a.role === 'agent').length / agentStats.totalAgents) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}