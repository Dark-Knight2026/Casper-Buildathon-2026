import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Agent } from '@/types/agent';
import { useAgent } from '@/contexts/AgentContext';
import AgentProfileEditModal from './AgentProfileEditModal';
import AgentActivityFeed from './AgentActivityFeed';
import AgentDocumentManager from './AgentDocumentManager';
import AgentPerformanceModal from './AgentPerformanceModal';
import AgentClientManagementModal from './AgentClientManagementModal';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Award, 
  Star, 
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  Home,
  Target,
  Globe,
  GraduationCap,
  Languages,
  Edit,
  MessageSquare,
  FileText,
  Activity,
  BarChart3,
  Settings,
  RefreshCw
} from 'lucide-react';

interface AgentProfileModalProps {
  agent: Agent;
  trigger?: React.ReactNode;
}

export default function AgentProfileModal({ agent, trigger }: AgentProfileModalProps) {
  const { getAgentPerformanceReport, refreshStats } = useAgent();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  const performanceReport = getAgentPerformanceReport(agent.id, 'monthly');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshStats();
      // Simulate data refresh
      setTimeout(() => setRefreshing(false), 1000);
    } catch (error) {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: Agent['role']) => {
    switch (role) {
      case 'team-lead': return 'bg-purple-100 text-purple-800';
      case 'senior-agent': return 'bg-blue-100 text-blue-800';
      case 'agent': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <User className="h-4 w-4 mr-2" />
            View Profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Agent Profile - {agent.name || 'Unknown Agent'}
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge className={getStatusColor(agent.status)}>
                {agent.status}
              </Badge>
              <Badge className={getRoleColor(agent.role)}>
                {agent.role?.replace('-', ' ') || 'agent'}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{agent.email || 'No email'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium">{agent.phone || 'No phone'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Award className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">License Number</p>
                        <p className="font-medium">{agent.licenseNumber || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Join Date</p>
                        <p className="font-medium">{formatDate(agent.joinDate)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {agent.address && (
                    <div className="pt-4 border-t">
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="font-medium">
                            {agent.address.street}<br />
                            {agent.address.city}, {agent.address.state} {agent.address.zipCode}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {agent.performance?.clientSatisfactionScore?.toFixed(1) || '0.0'}
                    </div>
                    <div className="text-sm text-gray-600">Client Satisfaction</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(agent.performance?.totalVolume || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Sales Volume</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {agent.performance?.totalSales || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Sales</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Specialties and Territory */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Specialties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(agent.specialties || []).map((specialty) => (
                      <Badge key={specialty} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                    {(!agent.specialties || agent.specialties.length === 0) && (
                      <p className="text-gray-500">No specialties defined</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Territory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(agent.territory || []).map((area) => (
                      <Badge key={area} variant="outline">
                        {area}
                      </Badge>
                    ))}
                    {(!agent.territory || agent.territory.length === 0) && (
                      <p className="text-gray-500">No territory assigned</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Commission Structure */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Commission Structure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {agent.commissionStructure?.splitPercentage || 0}%
                    </div>
                    <div className="text-sm text-gray-600">Commission Split</div>
                  </div>
                  {agent.commissionStructure?.capAmount && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(agent.commissionStructure.capAmount)}
                      </div>
                      <div className="text-sm text-gray-600">Cap Amount</div>
                    </div>
                  )}
                  {agent.commissionStructure?.bonusStructure && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">
                        {agent.commissionStructure.bonusStructure}
                      </div>
                      <div className="text-sm text-gray-600">Bonus Structure</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 mt-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Sales</p>
                      <p className="text-2xl font-bold text-gray-900">{agent.performance?.totalSales || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Sales Volume</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(agent.performance?.totalVolume || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Home className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Listings</p>
                      <p className="text-2xl font-bold text-gray-900">{agent.performance?.activeListings || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Assigned Clients</p>
                      <p className="text-2xl font-bold text-gray-900">{(agent.assignedClients || []).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Conversion Rate</span>
                      <span className="text-sm font-medium">{agent.performance?.conversionRate || 0}%</span>
                    </div>
                    <Progress value={agent.performance?.conversionRate || 0} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Client Satisfaction</span>
                      <span className="text-sm font-medium">{agent.performance?.clientSatisfactionScore || 0}/5.0</span>
                    </div>
                    <Progress value={((agent.performance?.clientSatisfactionScore || 0) / 5) * 100} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Days on Market</span>
                      <span className="text-sm font-medium">{agent.performance?.averageDaysOnMarket || 0} days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Goals Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Monthly Goal</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(agent.performance?.monthlyGoal || 0)}
                      </span>
                    </div>
                    <Progress 
                      value={((agent.performance?.totalVolume || 0) / 12 / Math.max(agent.performance?.monthlyGoal || 1, 1)) * 100} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Yearly Goal</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(agent.performance?.yearlyGoal || 0)}
                      </span>
                    </div>
                    <Progress 
                      value={((agent.performance?.totalVolume || 0) / Math.max(agent.performance?.yearlyGoal || 1, 1)) * 100} 
                      className="h-2" 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Assigned Clients ({(agent.assignedClients || []).length})
                  </div>
                  <AgentClientManagementModal 
                    agent={agent}
                    trigger={
                      <Button size="sm">
                        Manage Clients
                      </Button>
                    }
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(agent.assignedClients || []).length > 0 ? (
                  <div className="space-y-4">
                    {agent.assignedClients.map((clientId) => (
                      <div key={clientId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Client {clientId}</p>
                          <p className="text-sm text-gray-600">Active client</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                          <Button size="sm" variant="outline">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No clients assigned yet</p>
                    <AgentClientManagementModal 
                      agent={agent}
                      trigger={
                        <Button className="mt-4">Assign Clients</Button>
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professional" className="space-y-6 mt-6">
            {/* Education and Certifications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(agent.education || []).map((edu, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium">{edu}</p>
                      </div>
                    ))}
                    {(!agent.education || agent.education.length === 0) && (
                      <p className="text-gray-500">No education information</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(agent.certifications || []).map((cert) => (
                      <Badge key={cert} variant="secondary">
                        {cert}
                      </Badge>
                    ))}
                    {(!agent.certifications || agent.certifications.length === 0) && (
                      <p className="text-gray-500">No certifications</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Languages and Social Media */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Languages className="h-5 w-5 mr-2" />
                    Languages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(agent.languages || ['English']).map((language) => (
                      <Badge key={language} variant="outline">
                        {language}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    Social Media & Marketing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {agent.socialMedia?.website && (
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a href={agent.socialMedia.website} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline">
                        Website
                      </a>
                    </div>
                  )}
                  {agent.socialMedia?.linkedin && (
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a href={agent.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline">
                        LinkedIn
                      </a>
                    </div>
                  )}
                  {agent.socialMedia?.facebook && (
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a href={agent.socialMedia.facebook} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline">
                        Facebook
                      </a>
                    </div>
                  )}
                  {(!agent.socialMedia || Object.keys(agent.socialMedia).length === 0) && (
                    <p className="text-gray-500">No social media profiles</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Experience */}
            <Card>
              <CardHeader>
                <CardTitle>Professional Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {agent.experience || 0} Years
                  </div>
                  <div className="text-gray-600">Real Estate Experience</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <AgentDocumentManager agent={agent} />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <AgentActivityFeed agent={agent} />
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <AgentProfileEditModal 
            agent={agent}
            onSave={() => handleRefresh()}
            trigger={
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            }
          />
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
          <AgentPerformanceModal 
            agent={agent}
            trigger={
              <Button>
                <BarChart3 className="h-4 w-4 mr-2" />
                Performance Report
              </Button>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}