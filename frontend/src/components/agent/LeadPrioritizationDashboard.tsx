import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  Users,
  Target,
  Zap,
  Clock,
  Mail,
  Phone,
  Eye,
  Filter,
  Search,
  AlertCircle,
  CheckCircle2,
  Star
} from 'lucide-react';
import { useLeadPrioritization } from '@/hooks/useLeadPrioritization';
import LeadDetailModal from './LeadDetailModal';
import type { LeadScore, PriorityLevel, LeadStatus } from '@/types/lead';

export default function LeadPrioritizationDashboard() {
  const {
    leads,
    prioritizedLeads,
    analytics,
    loading,
    error,
    updateLeadStatus
  } = useLeadPrioritization();

  const [selectedLead, setSelectedLead] = useState<LeadScore | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');

  const getPriorityColor = (priority: PriorityLevel) => {
    const colors: Record<PriorityLevel, string> = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-gray-100 text-gray-800 border-gray-300'
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

  const handleViewDetails = (lead: LeadScore) => {
    setSelectedLead(lead);
    setDetailModalOpen(true);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.client_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || lead.priority_level === priorityFilter;
    const matchesStatus = statusFilter === 'all' || lead.lead_status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

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
            <p>Failed to load lead data</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Analytics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-2xl font-bold">{analytics?.total_leads || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical Priority</p>
                  <p className="text-2xl font-bold text-red-600">{analytics?.critical_leads || 0}</p>
                </div>
                <Zap className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Hot Leads</p>
                  <p className="text-2xl font-bold text-orange-600">{analytics?.hot_leads || 0}</p>
                </div>
                <Target className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold">{analytics?.avg_overall_score || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Days to Contact</p>
                  <p className="text-2xl font-bold">{analytics?.avg_days_to_contact || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <p className="text-3xl font-bold text-red-600">{analytics?.critical_leads || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Critical</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <p className="text-3xl font-bold text-orange-600">{analytics?.high_priority_leads || 0}</p>
                <p className="text-sm text-gray-600 mt-1">High</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                <p className="text-3xl font-bold text-yellow-600">{analytics?.medium_priority_leads || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Medium</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <p className="text-3xl font-bold text-gray-600">{analytics?.low_priority_leads || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Low</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as PriorityLevel | 'all')}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeadStatus | 'all')}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="nurturing">Nurturing</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Prioritized Leads List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-500" />
              Prioritized Leads ({filteredLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No leads match your filters</p>
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{lead.client_name}</h3>
                          <Badge className={getPriorityColor(lead.priority_level)}>
                            {lead.priority_level.toUpperCase()}
                          </Badge>
                          <Badge className={getStatusColor(lead.lead_status)}>
                            {lead.lead_status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
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
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            Last contact: {lead.days_since_last_contact} days ago
                          </div>
                          <div className="flex items-center">
                            <Target className="h-4 w-4 mr-2" />
                            Conversion: {lead.predicted_conversion_probability}%
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-600 mr-2">Overall Score:</span>
                            <span className={`text-2xl font-bold ${getScoreColor(lead.overall_score)}`}>
                              {lead.overall_score}
                            </span>
                          </div>
                          <div className="flex space-x-2 text-xs">
                            <Badge variant="outline">Engagement: {lead.engagement_score}</Badge>
                            <Badge variant="outline">Budget: {lead.budget_alignment_score}</Badge>
                            <Badge variant="outline">Timeline: {lead.timeline_urgency_score}</Badge>
                            <Badge variant="outline">Response: {lead.response_rate_score}</Badge>
                          </div>
                        </div>

                        {lead.next_best_action && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                            <div className="flex items-start">
                              <CheckCircle2 className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-blue-900">Next Best Action</p>
                                <p className="text-sm text-blue-700">{lead.next_best_action}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {lead.ai_recommendations && (
                          <div className="bg-purple-50 border border-purple-200 rounded p-3">
                            <div className="flex items-start">
                              <Zap className="h-5 w-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-purple-900">AI Insights</p>
                                <p className="text-sm text-purple-700">{lead.ai_recommendations}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(lead)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {lead.lead_status === 'cold' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateLeadStatus(lead.id, 'nurturing')}
                          >
                            Re-engage
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </>
  );
}