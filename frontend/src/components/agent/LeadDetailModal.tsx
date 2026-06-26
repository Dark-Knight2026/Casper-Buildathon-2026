import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  TrendingUp,
  Target,
  Clock,
  Eye,
  MousePointer,
  Home,
  MessageSquare
} from 'lucide-react';
import type { LeadScore, PriorityLevel, LeadStatus } from '@/types/lead';
import { format } from 'date-fns';

interface LeadDetailModalProps {
  lead: LeadScore | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeadDetailModal({
  lead,
  open,
  onOpenChange
}: LeadDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!lead) return null;

  const getPriorityColor = (priority: PriorityLevel) => {
    const colors: Record<PriorityLevel, string> = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800'
    };
    return colors[priority];
  };

  const getStatusColor = (status: LeadStatus) => {
    const colors: Record<LeadStatus, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-purple-100 text-purple-800',
      qualified: 'bg-indigo-100 text-indigo-800',
      nurturing: 'bg-cyan-100 text-cyan-800',
      hot: 'bg-red-100 text-red-800',
      cold: 'bg-gray-100 text-gray-800',
      converted: 'bg-green-100 text-green-800',
      lost: 'bg-slate-100 text-slate-800'
    };
    return colors[status];
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Lead Details</DialogTitle>
          <DialogDescription>
            Complete information and scoring for this lead
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{lead.client_name}</h2>
              <div className="flex items-center space-x-2 mb-3">
                <Badge className={getPriorityColor(lead.priority_level)}>
                  {lead.priority_level.toUpperCase()} PRIORITY
                </Badge>
                <Badge className={getStatusColor(lead.lead_status)}>
                  {lead.lead_status.toUpperCase()}
                </Badge>
                {lead.tags && lead.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {lead.client_email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {lead.client_email}
                  </div>
                )}
                {lead.client_phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {lead.client_phone}
                  </div>
                )}
                {lead.lead_source && (
                  <div className="flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Source: {lead.lead_source}
                  </div>
                )}
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Overall Score</p>
              <p className={`text-5xl font-bold ${getScoreColor(lead.overall_score)}`}>
                {lead.overall_score}
              </p>
              <p className="text-xs text-gray-500 mt-1">out of 100</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Conversion Probability</p>
                <p className="text-2xl font-bold">{lead.predicted_conversion_probability}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Days Since Contact</p>
                <p className="text-2xl font-bold">{lead.days_since_last_contact}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <MessageSquare className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Total Interactions</p>
                <p className="text-2xl font-bold">{lead.total_interactions}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Home className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Showings Attended</p>
                <p className="text-2xl font-bold">{lead.showings_attended}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scores">Score Breakdown</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Budget & Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Budget Range:</span>
                    <span className="font-semibold">
                      ${lead.budget_min?.toLocaleString()} - ${lead.budget_max?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Timeline:</span>
                    <Badge variant="outline">
                      {lead.desired_timeline?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="font-semibold">
                      {format(new Date(lead.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <span className="font-semibold">
                      {format(new Date(lead.updated_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {lead.next_best_action && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-900">Next Best Action</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-blue-800">{lead.next_best_action}</p>
                  </CardContent>
                </Card>
              )}

              {lead.ai_recommendations && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-purple-900">AI Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-purple-800">{lead.ai_recommendations}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="scores" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Engagement Score', score: lead.engagement_score, weight: '25%' },
                    { label: 'Budget Alignment', score: lead.budget_alignment_score, weight: '20%' },
                    { label: 'Timeline Urgency', score: lead.timeline_urgency_score, weight: '20%' },
                    { label: 'Response Rate', score: lead.response_rate_score, weight: '20%' },
                    { label: 'Property Match', score: lead.property_match_score, weight: '15%' }
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.label}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">Weight: {item.weight}</span>
                          <span className={`font-bold ${getScoreColor(item.score)}`}>
                            {item.score}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            item.score >= 80 ? 'bg-green-500' :
                            item.score >= 60 ? 'bg-yellow-500' :
                            item.score >= 40 ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${item.score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engagement" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Engagement Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Eye className="h-5 w-5 text-blue-600" />
                        <span className="text-2xl font-bold">{lead.email_opens}</span>
                      </div>
                      <p className="text-sm text-gray-600">Email Opens</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <MousePointer className="h-5 w-5 text-green-600" />
                        <span className="text-2xl font-bold">{lead.email_clicks}</span>
                      </div>
                      <p className="text-sm text-gray-600">Email Clicks</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Home className="h-5 w-5 text-purple-600" />
                        <span className="text-2xl font-bold">{lead.property_views}</span>
                      </div>
                      <p className="text-sm text-gray-600">Property Views</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Calendar className="h-5 w-5 text-orange-600" />
                        <span className="text-2xl font-bold">{lead.showings_attended}</span>
                      </div>
                      <p className="text-sm text-gray-600">Showings Attended</p>
                    </div>
                  </div>

                  {lead.last_interaction_at && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Last Interaction</p>
                      <p className="font-semibold">
                        {format(new Date(lead.last_interaction_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button>
              Contact Lead
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}