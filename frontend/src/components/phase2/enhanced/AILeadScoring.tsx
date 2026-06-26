import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Star, 
  Users, 
  DollarSign,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  Filter,
  Zap
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  budget: number;
  propertyType: string;
  location: string;
  aiScore: number;
  conversionProbability: number;
  timeToClose: number;
  engagementLevel: 'high' | 'medium' | 'low';
  behaviorScore: number;
  financialScore: number;
  urgencyScore: number;
  lastActivity: string;
  interactions: number;
  pageViews: number;
  propertyViews: number;
  emailOpens: number;
  clickThroughs: number;
  scoringFactors: ScoringFactor[];
}

interface ScoringFactor {
  factor: string;
  weight: number;
  score: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export default function AILeadScoring() {
  const [sortBy, setSortBy] = useState('aiScore');
  const [filterBy, setFilterBy] = useState('all');

  const [leads] = useState<Lead[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '(555) 987-6543',
      source: 'Website',
      budget: 1200000,
      propertyType: 'Luxury Condo',
      location: 'Santa Monica',
      aiScore: 92,
      conversionProbability: 85,
      timeToClose: 21,
      engagementLevel: 'high',
      behaviorScore: 88,
      financialScore: 95,
      urgencyScore: 90,
      lastActivity: '2024-09-01T14:30:00Z',
      interactions: 15,
      pageViews: 45,
      propertyViews: 12,
      emailOpens: 8,
      clickThroughs: 6,
      scoringFactors: [
        { factor: 'Budget Qualification', weight: 25, score: 95, impact: 'positive', description: 'Pre-approved for requested amount' },
        { factor: 'Engagement Level', weight: 20, score: 88, impact: 'positive', description: 'High interaction with listings' },
        { factor: 'Timeline Urgency', weight: 15, score: 90, impact: 'positive', description: 'Looking to buy within 30 days' },
        { factor: 'Location Match', weight: 15, score: 85, impact: 'positive', description: 'Properties available in preferred area' },
        { factor: 'Communication Response', weight: 25, score: 92, impact: 'positive', description: 'Responds quickly to messages' }
      ]
    },
    {
      id: '2',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      source: 'Referral',
      budget: 800000,
      propertyType: 'Single Family',
      location: 'Beverly Hills',
      aiScore: 78,
      conversionProbability: 72,
      timeToClose: 35,
      engagementLevel: 'medium',
      behaviorScore: 75,
      financialScore: 80,
      urgencyScore: 65,
      lastActivity: '2024-08-31T10:15:00Z',
      interactions: 8,
      pageViews: 22,
      propertyViews: 6,
      emailOpens: 4,
      clickThroughs: 3,
      scoringFactors: [
        { factor: 'Budget Qualification', weight: 25, score: 80, impact: 'positive', description: 'Good financial standing' },
        { factor: 'Engagement Level', weight: 20, score: 75, impact: 'positive', description: 'Moderate interaction level' },
        { factor: 'Timeline Urgency', weight: 15, score: 65, impact: 'neutral', description: 'Flexible timeline' },
        { factor: 'Location Match', weight: 15, score: 85, impact: 'positive', description: 'Good inventory match' },
        { factor: 'Communication Response', weight: 25, score: 70, impact: 'neutral', description: 'Average response time' }
      ]
    },
    {
      id: '3',
      name: 'Mike Davis',
      email: 'mike.davis@email.com',
      phone: '(555) 456-7890',
      source: 'Social Media',
      budget: 600000,
      propertyType: 'Townhouse',
      location: 'Pasadena',
      aiScore: 45,
      conversionProbability: 35,
      timeToClose: 90,
      engagementLevel: 'low',
      behaviorScore: 40,
      financialScore: 55,
      urgencyScore: 30,
      lastActivity: '2024-08-28T16:45:00Z',
      interactions: 3,
      pageViews: 8,
      propertyViews: 2,
      emailOpens: 1,
      clickThroughs: 0,
      scoringFactors: [
        { factor: 'Budget Qualification', weight: 25, score: 55, impact: 'neutral', description: 'Needs financing pre-approval' },
        { factor: 'Engagement Level', weight: 20, score: 40, impact: 'negative', description: 'Low interaction with content' },
        { factor: 'Timeline Urgency', weight: 15, score: 30, impact: 'negative', description: 'No immediate timeline' },
        { factor: 'Location Match', weight: 15, score: 60, impact: 'neutral', description: 'Limited inventory in area' },
        { factor: 'Communication Response', weight: 25, score: 35, impact: 'negative', description: 'Slow to respond' }
      ]
    }
  ]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default: return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    switch (sortBy) {
      case 'aiScore': return b.aiScore - a.aiScore;
      case 'conversionProbability': return b.conversionProbability - a.conversionProbability;
      case 'timeToClose': return a.timeToClose - b.timeToClose;
      case 'budget': return b.budget - a.budget;
      default: return b.aiScore - a.aiScore;
    }
  });

  const filteredLeads = sortedLeads.filter(lead => {
    if (filterBy === 'all') return true;
    if (filterBy === 'hot') return lead.aiScore >= 80;
    if (filterBy === 'warm') return lead.aiScore >= 60 && lead.aiScore < 80;
    if (filterBy === 'cold') return lead.aiScore < 60;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Lead Scoring</h1>
        <p className="text-gray-600">Intelligent lead prioritization powered by machine learning</p>
      </div>

      {/* AI Insights Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hot Leads</p>
                <p className="text-2xl font-bold text-green-600">
                  {leads.filter(l => l.aiScore >= 80).length}
                </p>
              </div>
              <Brain className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Conversion</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(leads.reduce((sum, l) => sum + l.conversionProbability, 0) / leads.length)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Close Time</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(leads.reduce((sum, l) => sum + l.timeToClose, 0) / leads.length)} days
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${(leads.reduce((sum, l) => sum + l.budget, 0) / 1000000).toFixed(1)}M
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Sorting */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter leads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              <SelectItem value="hot">Hot (80+)</SelectItem>
              <SelectItem value="warm">Warm (60-79)</SelectItem>
              <SelectItem value="cold">Cold (&lt;60)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aiScore">AI Score</SelectItem>
              <SelectItem value="conversionProbability">Conversion Probability</SelectItem>
              <SelectItem value="timeToClose">Time to Close</SelectItem>
              <SelectItem value="budget">Budget</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button>
          <Zap className="h-4 w-4 mr-2" />
          Retrain AI Model
        </Button>
      </div>

      {/* Lead Cards */}
      <div className="space-y-6">
        {filteredLeads.map((lead) => (
          <Card key={lead.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{lead.name}</h3>
                    <Badge className={getScoreColor(lead.aiScore)} size="lg">
                      <Brain className="h-4 w-4 mr-1" />
                      AI Score: {lead.aiScore}
                    </Badge>
                    <Badge className={getEngagementColor(lead.engagementLevel)}>
                      {lead.engagementLevel.toUpperCase()} ENGAGEMENT
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="font-medium">Contact Info</p>
                      <p>{lead.email}</p>
                      <p>{lead.phone}</p>
                    </div>
                    <div>
                      <p className="font-medium">Budget & Type</p>
                      <p>${lead.budget.toLocaleString()}</p>
                      <p>{lead.propertyType}</p>
                    </div>
                    <div>
                      <p className="font-medium">Location & Source</p>
                      <p>{lead.location}</p>
                      <p>{lead.source}</p>
                    </div>
                    <div>
                      <p className="font-medium">Predicted Outcome</p>
                      <p>{lead.conversionProbability}% conversion</p>
                      <p>{lead.timeToClose} days to close</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button size="sm">Contact Now</Button>
                </div>
              </div>

              {/* AI Scoring Breakdown */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">AI Scoring Breakdown</h4>
                
                {/* Score Components */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-blue-900">Behavior Score</span>
                      <span className="text-lg font-bold text-blue-900">{lead.behaviorScore}</span>
                    </div>
                    <Progress value={lead.behaviorScore} className="h-2" />
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-green-900">Financial Score</span>
                      <span className="text-lg font-bold text-green-900">{lead.financialScore}</span>
                    </div>
                    <Progress value={lead.financialScore} className="h-2" />
                  </div>
                  
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-orange-900">Urgency Score</span>
                      <span className="text-lg font-bold text-orange-900">{lead.urgencyScore}</span>
                    </div>
                    <Progress value={lead.urgencyScore} className="h-2" />
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{lead.interactions}</p>
                    <p className="text-xs text-gray-600">Interactions</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{lead.pageViews}</p>
                    <p className="text-xs text-gray-600">Page Views</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{lead.propertyViews}</p>
                    <p className="text-xs text-gray-600">Properties</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{lead.emailOpens}</p>
                    <p className="text-xs text-gray-600">Email Opens</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{lead.clickThroughs}</p>
                    <p className="text-xs text-gray-600">Click-throughs</p>
                  </div>
                </div>

                {/* Scoring Factors */}
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-900">Key Scoring Factors</h5>
                  {lead.scoringFactors.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getImpactIcon(factor.impact)}
                        <div>
                          <p className="font-medium text-gray-900">{factor.factor}</p>
                          <p className="text-sm text-gray-600">{factor.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{factor.score}/100</p>
                        <p className="text-xs text-gray-600">Weight: {factor.weight}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Model Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>AI Model Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Model Performance</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span className="font-medium">87.3%</span>
                </div>
                <div className="flex justify-between">
                  <span>Precision:</span>
                  <span className="font-medium">84.1%</span>
                </div>
                <div className="flex justify-between">
                  <span>Recall:</span>
                  <span className="font-medium">89.7%</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Training Data</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total Records:</span>
                  <span className="font-medium">15,847</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="font-medium">2 days ago</span>
                </div>
                <div className="flex justify-between">
                  <span>Features:</span>
                  <span className="font-medium">47 variables</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Next Actions</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  View Model Details
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  Export Predictions
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  Schedule Retraining
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}