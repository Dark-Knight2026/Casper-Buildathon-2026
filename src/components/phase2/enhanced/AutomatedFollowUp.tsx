import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, 
  MessageSquare, 
  Clock, 
  Zap, 
  Users, 
  TrendingUp,
  Calendar,
  Phone,
  Settings,
  Play,
  Pause,
  Edit,
  Plus
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'mixed';
  status: 'active' | 'paused' | 'draft';
  trigger: string;
  totalSteps: number;
  activeLeads: number;
  completedLeads: number;
  openRate: number;
  clickRate: number;
  responseRate: number;
  createdAt: string;
  steps: CampaignStep[];
}

interface CampaignStep {
  id: string;
  stepNumber: number;
  type: 'email' | 'sms' | 'task';
  delay: number;
  delayUnit: 'minutes' | 'hours' | 'days';
  subject?: string;
  content: string;
  condition?: string;
}

export default function AutomatedFollowUp() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const [campaigns] = useState<Campaign[]>([
    {
      id: 'camp-001',
      name: 'New Lead Welcome Series',
      type: 'mixed',
      status: 'active',
      trigger: 'Lead Registration',
      totalSteps: 5,
      activeLeads: 23,
      completedLeads: 156,
      openRate: 68.5,
      clickRate: 12.3,
      responseRate: 8.7,
      createdAt: '2024-08-15T10:00:00Z',
      steps: [
        {
          id: 'step-001',
          stepNumber: 1,
          type: 'email',
          delay: 5,
          delayUnit: 'minutes',
          subject: 'Welcome! Let\'s find your dream home',
          content: 'Thank you for your interest in finding a new home. I\'m excited to help you through this journey...',
        },
        {
          id: 'step-002',
          stepNumber: 2,
          type: 'task',
          delay: 1,
          delayUnit: 'hours',
          content: 'Call lead to introduce yourself and schedule initial consultation',
        },
        {
          id: 'step-003',
          stepNumber: 3,
          type: 'email',
          delay: 1,
          delayUnit: 'days',
          subject: 'Your personalized property recommendations',
          content: 'Based on your preferences, I\'ve found some properties that might interest you...',
          condition: 'If no response to previous email'
        }
      ]
    },
    {
      id: 'camp-002',
      name: 'Property Showing Follow-up',
      type: 'email',
      status: 'active',
      trigger: 'After Property Showing',
      totalSteps: 3,
      activeLeads: 12,
      completedLeads: 89,
      openRate: 75.2,
      clickRate: 18.9,
      responseRate: 15.4,
      createdAt: '2024-08-20T14:30:00Z',
      steps: [
        {
          id: 'step-004',
          stepNumber: 1,
          type: 'email',
          delay: 2,
          delayUnit: 'hours',
          subject: 'Thank you for viewing the property today',
          content: 'I hope you enjoyed seeing the property today. Do you have any questions or would you like to schedule another viewing?',
        }
      ]
    },
    {
      id: 'camp-003',
      name: 'Dormant Lead Reactivation',
      type: 'sms',
      status: 'paused',
      trigger: 'No Activity for 30 Days',
      totalSteps: 4,
      activeLeads: 0,
      completedLeads: 34,
      openRate: 92.1,
      clickRate: 8.7,
      responseRate: 5.2,
      createdAt: '2024-07-10T09:15:00Z',
      steps: []
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'mixed': return <Zap className="h-4 w-4" />;
      case 'task': return <Clock className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const toggleCampaignStatus = (campaignId: string) => {
    alert(`Toggling campaign status for ${campaignId}`);
  };

  const createNewCampaign = () => {
    alert('Opening campaign builder...');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Automated Follow-up</h1>
        <p className="text-gray-600">Smart email and SMS campaigns that nurture leads automatically</p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.filter(c => c.status === 'active').length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Leads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.reduce((sum, c) => sum + c.activeLeads, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Open Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(campaigns.reduce((sum, c) => sum + c.openRate, 0) / campaigns.length)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Response Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(campaigns.reduce((sum, c) => sum + c.responseRate, 0) / campaigns.length)}%
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <Button
            variant={activeTab === 'campaigns' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('campaigns')}
          >
            Campaigns
          </Button>
          <Button
            variant={activeTab === 'templates' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </Button>
        </div>

        <Button onClick={createNewCampaign}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Campaigns List */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{campaign.name}</h3>
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status === 'active' ? <Play className="h-3 w-3 mr-1" /> : 
                         campaign.status === 'paused' ? <Pause className="h-3 w-3 mr-1" /> : 
                         <Edit className="h-3 w-3 mr-1" />}
                        {campaign.status.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {getTypeIcon(campaign.type)}
                        <span className="ml-1">{campaign.type.toUpperCase()}</span>
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-medium">Trigger</p>
                        <p>{campaign.trigger}</p>
                      </div>
                      <div>
                        <p className="font-medium">Steps</p>
                        <p>{campaign.totalSteps} automated steps</p>
                      </div>
                      <div>
                        <p className="font-medium">Active Leads</p>
                        <p>{campaign.activeLeads} in progress</p>
                      </div>
                      <div>
                        <p className="font-medium">Completed</p>
                        <p>{campaign.completedLeads} leads</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={campaign.status === 'active'}
                      onCheckedChange={() => toggleCampaignStatus(campaign.id)}
                    />
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-900">Open Rate</span>
                      <span className="text-lg font-bold text-blue-900">{campaign.openRate}%</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-900">Click Rate</span>
                      <span className="text-lg font-bold text-green-900">{campaign.clickRate}%</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-purple-900">Response Rate</span>
                      <span className="text-lg font-bold text-purple-900">{campaign.responseRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Campaign Steps */}
                {campaign.steps.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Campaign Flow</h4>
                    <div className="space-y-2">
                      {campaign.steps.map((step, index) => (
                        <div key={step.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {step.stepNumber}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              {getTypeIcon(step.type)}
                              <span className="font-medium text-gray-900">
                                {step.type === 'email' ? step.subject : 
                                 step.type === 'sms' ? 'SMS Message' : 'Task'}
                              </span>
                              <Badge variant="outline" size="sm">
                                {step.delay} {step.delayUnit}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{step.content}</p>
                            {step.condition && (
                              <p className="text-xs text-orange-600 mt-1">Condition: {step.condition}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <Card>
          <CardHeader>
            <CardTitle>Email & SMS Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Templates</h3>
              <p className="text-gray-600 mb-4">Create reusable templates for your automated campaigns</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Top Performing Campaigns</h4>
                  <div className="space-y-3">
                    {campaigns
                      .sort((a, b) => b.responseRate - a.responseRate)
                      .slice(0, 3)
                      .map((campaign) => (
                        <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{campaign.name}</p>
                            <p className="text-sm text-gray-600">{campaign.responseRate}% response rate</p>
                          </div>
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Recent Activity</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">234 emails sent</p>
                        <p className="text-sm text-gray-600">Last 24 hours</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">67 SMS messages</p>
                        <p className="text-sm text-gray-600">Last 24 hours</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900">12 new responses</p>
                        <p className="text-sm text-gray-600">Last 24 hours</p>
                      </div>
                    </div>
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