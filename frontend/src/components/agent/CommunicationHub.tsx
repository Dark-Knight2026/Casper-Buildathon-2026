import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail,
  MessageSquare,
  Phone,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  MousePointer,
  Reply,
  TrendingUp,
  Users,
  Zap,
  RefreshCw,
  Plus,
  Play,
  Pause,
  Square,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { useCommunicationHub } from '@/hooks/useCommunicationHub';
import TemplateLibrary from './TemplateLibrary';
import CommunicationHistory from './CommunicationHistory';
import FollowUpSequences from './FollowUpSequences';
import { format } from 'date-fns';

export default function CommunicationHub() {
  const {
    templates,
    communications,
    sequences,
    enrollments,
    analytics,
    loading,
    error,
    refreshData
  } = useCommunicationHub();

  const [activeTab, setActiveTab] = useState('overview');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <Send className="h-4 w-4 text-blue-600" />;
      case 'opened':
        return <Eye className="h-4 w-4 text-green-600" />;
      case 'clicked':
        return <MousePointer className="h-4 w-4 text-purple-600" />;
      case 'replied':
        return <Reply className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Send className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      case 'opened':
        return 'bg-green-100 text-green-800';
      case 'clicked':
        return 'bg-purple-100 text-purple-800';
      case 'replied':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'scheduled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
            <p>Failed to load communication data</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Communication Hub</h2>
          <p className="text-gray-600">Automated client communication and follow-up management</p>
        </div>
        <Button variant="outline" onClick={refreshData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sent</p>
                <p className="text-2xl font-bold">{analytics?.total_sent || 0}</p>
              </div>
              <Send className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivery Rate</p>
                <p className="text-2xl font-bold">{analytics?.delivery_rate.toFixed(1)}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Rate</p>
                <p className="text-2xl font-bold">{analytics?.open_rate.toFixed(1)}%</p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Response Rate</p>
                <p className="text-2xl font-bold">{analytics?.response_rate.toFixed(1)}%</p>
              </div>
              <Reply className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">{analytics?.avg_response_time_hours?.toFixed(1)}h</p>
              </div>
              <Clock className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Mail className="h-5 w-5 mr-2 text-blue-600" />
              Email Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sent</span>
              <span className="font-semibold">{analytics?.by_type.email.sent || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Delivery Rate</span>
              <span className="font-semibold text-green-600">{analytics?.by_type.email.delivery_rate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Open Rate</span>
              <span className="font-semibold text-purple-600">{analytics?.by_type.email.open_rate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Response Rate</span>
              <span className="font-semibold text-orange-600">{analytics?.by_type.email.response_rate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
              SMS Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sent</span>
              <span className="font-semibold">{analytics?.by_type.sms.sent || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Delivery Rate</span>
              <span className="font-semibold text-green-600">{analytics?.by_type.sms.delivery_rate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Open Rate</span>
              <span className="font-semibold text-purple-600">{analytics?.by_type.sms.open_rate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Response Rate</span>
              <span className="font-semibold text-orange-600">{analytics?.by_type.sms.response_rate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
              Top Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics?.top_templates.slice(0, 3).map((template, index) => (
              <div key={template.template_id} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium truncate">{template.template_name}</span>
                  <Badge variant="outline">{template.usage_count}</Badge>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {template.response_rate}% response rate
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Active Sequences */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-500" />
              Active Follow-Up Sequences ({enrollments.filter(e => e.status === 'active').length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {enrollments.filter(e => e.status === 'active').slice(0, 5).map((enrollment) => (
              <div key={enrollment.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">{enrollment.client_name}</h4>
                    <p className="text-sm text-gray-600">{enrollment.sequence_name}</p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Active
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">
                    Step {enrollment.current_step} of {enrollment.total_steps}
                  </span>
                  <span className="text-gray-600">
                    {enrollment.response_received ? (
                      <span className="flex items-center text-green-600">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Response received
                      </span>
                    ) : (
                      'No response yet'
                    )}
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-600 h-2 rounded-full" 
                    style={{ width: `${(enrollment.current_step / enrollment.total_steps) * 100}%` }}
                  ></div>
                </div>

                {enrollment.next_action_at && (
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    Next action: {format(new Date(enrollment.next_action_at), 'MMM d, yyyy h:mm a')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Communications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Communications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {communications.slice(0, 5).map((comm) => (
              <div key={comm.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(comm.type)}
                    <div>
                      <h4 className="font-semibold">{comm.client_name}</h4>
                      {comm.subject && (
                        <p className="text-sm text-gray-600">{comm.subject}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(comm.status)}>
                      {getStatusIcon(comm.status)}
                      <span className="ml-1">{comm.status}</span>
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{comm.body}</p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {comm.sent_at && `Sent: ${format(new Date(comm.sent_at), 'MMM d, h:mm a')}`}
                  </span>
                  {comm.replied_at && (
                    <span className="flex items-center text-green-600">
                      <Reply className="h-3 w-3 mr-1" />
                      Replied: {format(new Date(comm.replied_at), 'MMM d, h:mm a')}
                    </span>
                  )}
                </div>

                {comm.reply_content && (
                  <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                    <p className="text-gray-700">"{comm.reply_content}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Mail className="h-4 w-4 mr-2" />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="sequences">
            <Zap className="h-4 w-4 mr-2" />
            Sequences ({sequences.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <CommunicationHistory communications={communications} />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplateLibrary templates={templates} />
        </TabsContent>

        <TabsContent value="sequences" className="mt-6">
          <FollowUpSequences sequences={sequences} enrollments={enrollments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}