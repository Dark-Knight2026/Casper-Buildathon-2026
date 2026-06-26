import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Bot,
  ArrowRight,
  Activity,
  Settings,
  Sparkles
} from 'lucide-react';
import EnhancedDashboardUX from '@/components/dashboard/EnhancedDashboardUX';

export default function Dashboard() {
  const [activeView, setActiveView] = useState<'classic' | 'enhanced'>('enhanced');

  const stats = [
    {
      title: 'Total Properties',
      value: '24',
      change: '+2 this month',
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Tenants',
      value: '156',
      change: '+12 this month',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Monthly Revenue',
      value: '$89,420',
      change: '+8.2% from last month',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      title: 'Portfolio Value',
      value: '$2.4M',
      change: '+15.3% this year',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const aiAgentStatus = [
    {
      name: 'Marketing Agent',
      status: 'Active',
      activity: 'Generated 15 new leads today',
      efficiency: 95
    },
    {
      name: 'Customer Service',
      status: 'Active',
      activity: 'Handled 32 tenant inquiries',
      efficiency: 88
    },
    {
      name: 'Payment Processor',
      status: 'Active',
      activity: 'Processed $15,240 in payments',
      efficiency: 100
    },
    {
      name: 'Maintenance Coordinator',
      status: 'Active',
      activity: 'Scheduled 8 repair appointments',
      efficiency: 92
    }
  ];

  const recentActivities = [
    {
      type: 'payment',
      description: 'Rent payment received from Apartment 4B',
      amount: '$1,200',
      time: '2 hours ago',
      status: 'completed'
    },
    {
      type: 'maintenance',
      description: 'Plumbing repair scheduled for Unit 7A',
      amount: '$150',
      time: '4 hours ago',
      status: 'pending'
    },
    {
      type: 'lease',
      description: 'New lease agreement signed - Downtown Loft',
      amount: '$2,400/mo',
      time: '1 day ago',
      status: 'completed'
    },
    {
      type: 'fractional',
      description: 'Fractional share purchased - Commercial Plaza',
      amount: '$5,000',
      time: '2 days ago',
      status: 'completed'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with View Toggle */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back! Here's an overview of your property portfolio.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={activeView === 'enhanced' ? 'default' : 'outline'}
              onClick={() => setActiveView('enhanced')}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Enhanced View
            </Button>
            <Button
              variant={activeView === 'classic' ? 'default' : 'outline'}
              onClick={() => setActiveView('classic')}
            >
              Classic View
            </Button>
          </div>
        </div>

        {/* Conditional Rendering Based on View */}
        {activeView === 'enhanced' ? (
          <EnhancedDashboardUX />
        ) : (
          <>
            {/* Classic Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        {stat.title}
                      </CardTitle>
                      <div className={`p-2 rounded-md ${stat.bgColor}`}>
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <p className="text-xs text-green-600 mt-1">{stat.change}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* AI Agents Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bot className="h-5 w-5 text-blue-600" />
                    <span>AI Agents Performance</span>
                  </CardTitle>
                  <CardDescription>
                    Real-time status of your automated property management agents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiAgentStatus.map((agent, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{agent.name}</h4>
                          <Badge variant={agent.status === 'Active' ? 'default' : 'secondary'}>
                            {agent.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{agent.activity}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Progress value={agent.efficiency} className="flex-1" />
                          <span className="text-xs text-gray-500">{agent.efficiency}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Activities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <span>Recent Activities</span>
                  </CardTitle>
                  <CardDescription>
                    Latest transactions and updates across your portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-green-600">{activity.amount}</span>
                          <span className="text-xs text-gray-500">{activity.time}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {activity.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and shortcuts for efficient property management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button className="h-auto p-4 flex flex-col space-y-2 hover:shadow-md transition-all">
                    <Building2 className="h-6 w-6" />
                    <span>Add Property</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2 hover:shadow-md transition-all">
                    <Users className="h-6 w-6" />
                    <span>New Tenant</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2 hover:shadow-md transition-all">
                    <DollarSign className="h-6 w-6" />
                    <span>Record Payment</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2 hover:shadow-md transition-all">
                    <AlertCircle className="h-6 w-6" />
                    <span>Report Issue</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}