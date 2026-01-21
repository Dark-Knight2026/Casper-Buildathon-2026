import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, 
  MessageSquare, 
  CreditCard, 
  Wrench, 
  TrendingUp,
  Users,
  Activity,
  Settings,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

export default function AIAgents() {
  const [agents, setAgents] = useState([
    {
      id: 1,
      name: 'Marketing Agent',
      type: 'Marketing',
      status: 'Active',
      enabled: true,
      efficiency: 95,
      description: 'Automated property marketing and lead generation',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      activities: [
        'Generated 15 new leads today',
        'Posted 3 property listings on social media',
        'Sent 24 follow-up emails to prospects',
        'Updated property descriptions for SEO'
      ],
      metrics: {
        leadsGenerated: 142,
        conversionRate: 18,
        responseTime: '2.3 minutes',
        satisfaction: 4.7
      }
    },
    {
      id: 2,
      name: 'Customer Service',
      type: 'Support',
      status: 'Active',
      enabled: true,
      efficiency: 88,
      description: 'Handle tenant inquiries and support requests',
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      activities: [
        'Handled 32 tenant inquiries',
        'Resolved 8 maintenance requests',
        'Processed 12 lease-related questions',
        'Escalated 2 complex issues to human staff'
      ],
      metrics: {
        ticketsResolved: 256,
        avgResponseTime: '45 seconds',
        satisfactionScore: 4.5,
        escalationRate: 8
      }
    },
    {
      id: 3,
      name: 'Payment Processor',
      type: 'Financial',
      status: 'Active',
      enabled: true,
      efficiency: 100,
      description: 'Automated rent collection and payment processing',
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      activities: [
        'Processed $15,240 in payments',
        'Sent 18 payment reminders',
        'Updated 5 tenant payment statuses',
        'Generated monthly payment reports'
      ],
      metrics: {
        paymentsProcessed: 89,
        collectionRate: 96,
        avgProcessingTime: '12 seconds',
        errorRate: 0.1
      }
    },
    {
      id: 4,
      name: 'Maintenance Coordinator',
      type: 'Operations',
      status: 'Active',
      enabled: true,
      efficiency: 92,
      description: 'Schedule and coordinate property maintenance',
      icon: Wrench,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      activities: [
        'Scheduled 8 repair appointments',
        'Coordinated with 5 service providers',
        'Sent 12 maintenance reminders',
        'Updated 6 work order statuses'
      ],
      metrics: {
        workOrdersManaged: 134,
        avgResponseTime: '3.2 hours',
        completionRate: 94,
        tenantSatisfaction: 4.3
      }
    }
  ]);

  const toggleAgent = (agentId: number) => {
    setAgents(agents.map(agent => 
      agent.id === agentId 
        ? { ...agent, enabled: !agent.enabled, status: agent.enabled ? 'Paused' : 'Active' }
        : agent
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'Error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Agents</h1>
        <p className="text-gray-600 mt-2">Monitor and manage your intelligent property management assistants</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {agents.map((agent) => {
              const Icon = agent.icon;
              return (
                <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg ${agent.bgColor}`}>
                        <Icon className={`h-6 w-6 ${agent.color}`} />
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(agent.status)}
                        <Badge variant={agent.status === 'Active' ? 'default' : 'secondary'}>
                          {agent.status}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <CardDescription>{agent.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Efficiency</span>
                        <span className="font-medium">{agent.efficiency}%</span>
                      </div>
                      <Progress value={agent.efficiency} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Enable Agent</span>
                      <Switch 
                        checked={agent.enabled}
                        onCheckedChange={() => toggleAgent(agent.id)}
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                      <Button size="sm" variant="outline">
                        <Activity className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {agents.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <agent.icon className={`h-5 w-5 ${agent.color}`} />
                    <span>{agent.name} Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(agent.metrics).map(([key, value]) => (
                      <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="space-y-6">
            {agents.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <agent.icon className={`h-5 w-5 ${agent.color}`} />
                    <span>{agent.name} Recent Activities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {agent.activities.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{activity}</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {Math.floor(Math.random() * 24)} hours ago
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            {agents.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <agent.icon className={`h-5 w-5 ${agent.color}`} />
                      <span>{agent.name} Configuration</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                      <Button size="sm" variant="outline">
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                      <Button size="sm" variant="outline">
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restart
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Auto-start on system boot</p>
                        <p className="text-sm text-gray-600">Agent will automatically start when the system boots</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Send notifications</p>
                        <p className="text-sm text-gray-600">Receive alerts for important agent activities</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Learning mode</p>
                        <p className="text-sm text-gray-600">Allow agent to learn from interactions and improve</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="pt-4 border-t">
                      <Button variant="destructive" size="sm">
                        Reset Agent
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}