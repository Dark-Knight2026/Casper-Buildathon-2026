import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClients } from '@/contexts/ClientContext';
import { 
  Users, 
  UserCheck, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Target,
  Star,
  Activity
} from 'lucide-react';

interface ClientStatsProps {
  showDetailed?: boolean;
}

export default function ClientStats({ showDetailed = false }: ClientStatsProps) {
  const { stats } = useClients();

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.total,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Clients',
      value: stats.active,
      icon: UserCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Pending Clients',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Closed Deals',
      value: stats.closed,
      icon: CheckCircle,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    }
  ];

  const detailedStats = [
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Avg Lead Score',
      value: stats.averageLeadScore.toFixed(0),
      icon: Star,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showDetailed && (
        <>
          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {detailedStats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Client Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Clients by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="capitalize">{type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{count}</span>
                        <span className="text-sm text-gray-500">
                          ({stats.total > 0 ? ((count / stats.total) * 100).toFixed(0) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Clients by Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.byPriority).map(([priority, count]) => {
                    const colors = {
                      urgent: 'bg-red-500',
                      high: 'bg-orange-500',
                      medium: 'bg-yellow-500',
                      low: 'bg-green-500'
                    };
                    return (
                      <div key={priority} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${colors[priority as keyof typeof colors]}`}></div>
                          <span className="capitalize">{priority}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{count}</span>
                          <span className="text-sm text-gray-500">
                            ({stats.total > 0 ? ((count / stats.total) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}