import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Camera, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Eye,
  Download,
  Star,
  MessageSquare,
  Image,
  Video
} from 'lucide-react';

export default function MarketingQA() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock marketing quality data
  const marketingData = [
    {
      id: 'listing-1',
      agentId: 'agent-1',
      agentName: 'Emily Rodriguez',
      propertyAddress: '123 Main St, Downtown',
      photos: 12,
      videos: 2,
      description: 'Complete',
      responseTime: '2.3 min',
      qualityScore: 95,
      status: 'approved',
      issues: [],
      createdAt: new Date('2024-09-01'),
      lastUpdated: new Date('2024-09-02')
    },
    {
      id: 'listing-2',
      agentId: 'agent-2',
      agentName: 'Michael Chen',
      propertyAddress: '456 Oak Ave, North District',
      photos: 8,
      videos: 0,
      description: 'Incomplete',
      responseTime: '5.7 min',
      qualityScore: 72,
      status: 'needs_review',
      issues: ['Missing virtual tour', 'Description too short'],
      createdAt: new Date('2024-08-30'),
      lastUpdated: new Date('2024-09-01')
    },
    {
      id: 'listing-3',
      agentId: 'agent-3',
      agentName: 'Sarah Williams',
      propertyAddress: '789 Pine Rd, Luxury District',
      photos: 15,
      videos: 3,
      description: 'Complete',
      responseTime: '1.8 min',
      qualityScore: 88,
      status: 'approved',
      issues: [],
      createdAt: new Date('2024-08-28'),
      lastUpdated: new Date('2024-08-29')
    },
    {
      id: 'listing-4',
      agentId: 'agent-4',
      agentName: 'David Park',
      propertyAddress: '321 Elm St, South District',
      photos: 5,
      videos: 0,
      description: 'Poor',
      responseTime: '12.4 min',
      qualityScore: 45,
      status: 'rejected',
      issues: ['Low quality photos', 'Missing floor plan', 'No property highlights'],
      createdAt: new Date('2024-08-25'),
      lastUpdated: new Date('2024-08-26')
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'needs_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'needs_review': return Clock;
      case 'rejected': return AlertTriangle;
      default: return Clock;
    }
  };

  const filteredData = marketingData.filter(item => {
    const matchesSearch = item.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.agentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const approvedCount = marketingData.filter(item => item.status === 'approved').length;
  const needsReviewCount = marketingData.filter(item => item.status === 'needs_review').length;
  const rejectedCount = marketingData.filter(item => item.status === 'rejected').length;
  const averageQuality = marketingData.reduce((sum, item) => sum + item.qualityScore, 0) / marketingData.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marketing Quality Assurance</h2>
          <p className="text-gray-600">Monitor listing quality and brand compliance</p>
        </div>
        <Button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Ready to publish</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Needs Review</p>
                <p className="text-2xl font-bold text-yellow-600">{needsReviewCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Pending approval</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Needs improvement</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Quality</p>
                <p className="text-2xl font-bold text-blue-600">{averageQuality.toFixed(0)}</p>
              </div>
              <Star className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Quality score</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search listings or agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Marketing Quality List */}
      <Card>
        <CardHeader>
          <CardTitle>Listing Quality Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredData.map((item) => {
              const StatusIcon = getStatusIcon(item.status);
              
              return (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{item.propertyAddress}</p>
                      <p className="text-sm text-gray-600">Agent: {item.agentName}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span className="flex items-center">
                          <Image className="h-3 w-3 mr-1" />
                          {item.photos} photos
                        </span>
                        <span className="flex items-center">
                          <Video className="h-3 w-3 mr-1" />
                          {item.videos} videos
                        </span>
                        <span className="flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Response: {item.responseTime}
                        </span>
                      </div>
                      {item.issues.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-red-600 font-medium">Issues:</p>
                          <ul className="text-xs text-red-600 list-disc list-inside">
                            {item.issues.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getQualityColor(item.qualityScore)}`}>
                        {item.qualityScore}
                      </div>
                      <div className="text-xs text-gray-500">Quality Score</div>
                    </div>
                    <Badge className={`${getStatusColor(item.status)} border flex items-center`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {item.status.replace('_', ' ')}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Brand Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Guidelines & Standards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Photo Requirements</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Minimum 8 high-resolution photos
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Professional lighting and composition
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Include exterior, kitchen, and main living areas
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  No personal items or clutter visible
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Response Time SLAs</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Initial inquiry response: &lt; 5 minutes
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Follow-up communications: &lt; 2 hours
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Showing requests: &lt; 1 hour
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Document requests: &lt; 24 hours
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}