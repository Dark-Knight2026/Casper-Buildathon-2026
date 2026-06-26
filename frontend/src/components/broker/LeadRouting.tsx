import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LeadRoutingRule } from '@/types/broker';
import { 
  Route, 
  Plus, 
  Settings, 
  Users,
  Target,
  Clock,
  BarChart3,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function LeadRouting() {
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);

  // Mock lead routing rules
  const routingRules: LeadRoutingRule[] = [
    {
      id: 'rule-1',
      segmentId: 'downtown-sfh-500k-1m',
      method: 'performance_weight',
      agentIds: ['agent-1', 'agent-2', 'agent-3'],
      caps: {
        daily: 5,
        weekly: 25,
        monthly: 100
      },
      isActive: true
    },
    {
      id: 'rule-2',
      segmentId: 'north-condo-1m-3m',
      method: 'round_robin',
      agentIds: ['agent-2', 'agent-4'],
      caps: {
        daily: 3,
        weekly: 15
      },
      isActive: true
    },
    {
      id: 'rule-3',
      segmentId: 'luxury-sfh-3m+',
      method: 'availability',
      agentIds: ['agent-1', 'agent-3'],
      caps: {
        daily: 2,
        weekly: 10
      },
      isActive: false
    }
  ];

  // Mock agent performance data
  const agentPerformance = [
    { agentId: 'agent-1', name: 'Emily Rodriguez', aqiScore: 92.3, leadsThisWeek: 18, conversionRate: 24.5 },
    { agentId: 'agent-2', name: 'Michael Chen', aqiScore: 87.9, leadsThisWeek: 15, conversionRate: 21.2 },
    { agentId: 'agent-3', name: 'Sarah Williams', aqiScore: 84.1, leadsThisWeek: 12, conversionRate: 19.8 },
    { agentId: 'agent-4', name: 'David Park', aqiScore: 79.6, leadsThisWeek: 10, conversionRate: 18.5 }
  ];

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'performance_weight': return 'bg-green-100 text-green-800 border-green-200';
      case 'round_robin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'availability': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMethodDescription = (method: string) => {
    switch (method) {
      case 'performance_weight': return 'Leads distributed based on AQI scores';
      case 'round_robin': return 'Leads distributed equally in rotation';
      case 'availability': return 'Leads go to available agents first';
      default: return 'Unknown method';
    }
  };

  const getSegmentName = (segmentId: string) => {
    switch (segmentId) {
      case 'downtown-sfh-500k-1m': return 'Downtown SFH $500K-$1M';
      case 'north-condo-1m-3m': return 'North Condo $1M-$3M';
      case 'luxury-sfh-3m+': return 'Luxury SFH $3M+';
      default: return segmentId;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Routing</h2>
          <p className="text-gray-600">Configure automated lead distribution rules</p>
        </div>
        <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Lead Routing Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Segment</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="downtown-sfh-500k-1m">Downtown SFH $500K-$1M</SelectItem>
                    <SelectItem value="north-condo-1m-3m">North Condo $1M-$3M</SelectItem>
                    <SelectItem value="luxury-sfh-3m+">Luxury SFH $3M+</SelectItem>
                    <SelectItem value="commercial">Commercial Properties</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Routing Method</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance_weight">Performance Weighted</SelectItem>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="availability">Availability Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assigned Agents</Label>
                <div className="grid grid-cols-2 gap-2">
                  {agentPerformance.map((agent) => (
                    <div key={agent.agentId} className="flex items-center space-x-2">
                      <input type="checkbox" id={agent.agentId} className="rounded" />
                      <label htmlFor={agent.agentId} className="text-sm">{agent.name}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Daily Cap</Label>
                  <Input type="number" placeholder="5" />
                </div>
                <div className="space-y-2">
                  <Label>Weekly Cap</Label>
                  <Input type="number" placeholder="25" />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Cap</Label>
                  <Input type="number" placeholder="100" />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="active" />
                <Label htmlFor="active">Activate rule immediately</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateRuleOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
                  Create Rule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Active Routing Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {routingRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-orange-400 rounded-full flex items-center justify-center">
                    <Route className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{getSegmentName(rule.segmentId)}</p>
                    <p className="text-sm text-gray-600">{getMethodDescription(rule.method)}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span>{rule.agentIds.length} agents assigned</span>
                      <span>Daily: {rule.caps.daily || 'No limit'}</span>
                      <span>Weekly: {rule.caps.weekly || 'No limit'}</span>
                      <span>Monthly: {rule.caps.monthly || 'No limit'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={`${getMethodColor(rule.method)} border`}>
                    {rule.method.replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center">
                    {rule.isActive ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance & Lead Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agentPerformance.map((agent) => (
              <div key={agent.agentId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{agent.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>AQI: {agent.aqiScore}</span>
                      <span>Leads this week: {agent.leadsThisWeek}</span>
                      <span>Conversion: {agent.conversionRate}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      Weight: {Math.round(agent.aqiScore / 10)}x
                    </div>
                    <div className="text-xs text-gray-500">
                      Performance multiplier
                    </div>
                  </div>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full" 
                      style={{ width: `${Math.min(agent.leadsThisWeek * 4, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fairness & Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Fairness Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Lead Distribution Variance:</span>
                <span className="font-medium text-green-600">Low (12%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Performance Correlation:</span>
                <span className="font-medium text-blue-600">High (0.87)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cap Violations:</span>
                <span className="font-medium text-green-600">0 this week</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Agent Satisfaction:</span>
                <span className="font-medium text-green-600">High (4.2/5)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Weekly Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Leads Routed:</span>
                <span className="font-medium">156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average Response Time:</span>
                <span className="font-medium">4.2 minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Conversion Rate:</span>
                <span className="font-medium text-green-600">21.8%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Rule Efficiency:</span>
                <span className="font-medium text-blue-600">94.3%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}