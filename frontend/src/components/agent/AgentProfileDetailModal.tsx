import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Award,
  TrendingUp,
  Home,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  Trophy,
  Target,
  BarChart3,
  MessageSquare,
  Globe,
  Linkedin,
  Facebook,
  Instagram,
  Twitter,
  Shield,
  BookOpen,
  Languages,
  FileText
} from 'lucide-react';
import ReviewStats from './ReviewStats';
import ReviewList from './ReviewList';
import ReviewForm from './ReviewForm';
import AgentPerformanceAnalytics from './AgentPerformanceAnalytics';
import ScheduleConsultationForm from '../messaging/ScheduleConsultationForm';
import PropertyInquiryForm from '../messaging/PropertyInquiryForm';
import { useMessaging } from '@/hooks/useMessaging';
import { useToast } from '@/hooks/use-toast';
import { AgentReview, ReviewStats as ReviewStatsType } from '@/types/review';
import { mockAgentPerformance } from '@/data/mockAgentPerformance';

interface RealEstateAgent {
  id: string;
  name: string;
  companyName: string;
  agentType: 'agent' | 'broker' | 'team_lead';
  licenseNumber: string;
  yearsExperience: number;
  serviceArea: string[];
  rating: number;
  totalReviews: number;
  activeListings: number;
  soldProperties: number;
  averageSalePrice: number;
  specialties: string[];
  description: string;
  phone: string;
  email: string;
  profileImage?: string;
  certifications: string[];
  languages: string[];
  availability: 'available' | 'busy' | 'unavailable';
  responseTime: string;
  marketExpertise: string[];
  awards: string[];
  reviews?: AgentReview[];
  reviewStats?: ReviewStatsType;
}

interface AgentProfileDetailModalProps {
  agent: RealEstateAgent | null;
  isOpen: boolean;
  onClose: () => void;
  showRevenue?: boolean;
}

interface PerformanceScore {
  overall: number;
  clientRating: number;
  experience: number;
  transactionVolume: number;
  revenue: number;
  avgSalePrice: number;
  responseTime: number;
}

interface RankingData {
  overallRank: number;
  salesVolumeRank: number;
  ratingRank: number;
  propertiesSoldRank: number;
  responseTimeRank: number;
  totalAgents: number;
  salesVolumePercentile: number;
  ratingPercentile: number;
  propertiesSoldPercentile: number;
  responseTimePercentile: number;
  insights: string[];
}

interface ReviewSubmission {
  agentId: string;
  rating: number;
  title: string;
  comment: string;
  transactionType: string;
  propertyType: string;
}

export default function AgentProfileDetailModal({ agent, isOpen, onClose, showRevenue = true }: AgentProfileDetailModalProps) {
  const { createConversation } = useMessaging();
  const { toast } = useToast();
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [showInquiryForm, setShowInquiryForm] = useState(false);

  if (!agent) return null;

  const performanceScore = calculatePerformanceScore(agent);
  const rankingData = calculateRanking(agent);
  const performanceData = mockAgentPerformance[agent.id];

  const handleReviewSubmit = (review: ReviewSubmission) => {
    console.log('Review submitted:', review);
    // In a real app, this would send to backend
  };

  const handleHelpful = (reviewId: string) => {
    console.log('Marked review as helpful:', reviewId);
    // In a real app, this would update the backend
  };

  const handleSendMessage = async () => {
    try {
      await createConversation(agent.id, agent.name);
      toast({
        title: 'Conversation started',
        description: `You can now message ${agent.name}`,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start conversation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleConsultationSuccess = () => {
    setShowConsultationForm(false);
    toast({
      title: 'Success',
      description: 'Consultation request sent successfully',
    });
  };

  const handleInquirySuccess = () => {
    setShowInquiryForm(false);
    toast({
      title: 'Success',
      description: 'Property inquiry submitted successfully',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Agent Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-start space-x-6 pb-6 border-b">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {agent.name.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{agent.name}</h2>
                  <p className="text-gray-600">{agent.companyName}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline">{agent.agentType === 'agent' ? 'Real Estate Agent' : agent.agentType === 'broker' ? 'Licensed Broker' : 'Team Leader'}</Badge>
                    <Badge variant="outline">License: {agent.licenseNumber}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1 mb-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="text-2xl font-bold">{agent.rating}</span>
                    <span className="text-gray-500">({agent.totalReviews} reviews)</span>
                  </div>
                  <Badge className={
                    agent.availability === 'available' ? 'bg-green-100 text-green-800' :
                    agent.availability === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {agent.availability === 'available' ? 'Available' : agent.availability === 'busy' ? 'Busy' : 'Unavailable'}
                  </Badge>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{agent.yearsExperience}</div>
                  <div className="text-xs text-gray-600">Years Experience</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{agent.soldProperties}</div>
                  <div className="text-xs text-gray-600">Properties Sold</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{agent.activeListings}</div>
                  <div className="text-xs text-gray-600">Active Listings</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">${Math.round(agent.averageSalePrice / 1000)}K</div>
                  <div className="text-xs text-gray-600">Avg Sale Price</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="rankings">Rankings</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{agent.description}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Target className="h-5 w-5 mr-2 text-blue-600" />
                      Specialties
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {agent.specialties.map((specialty: string, index: number) => (
                        <Badge key={index} variant="secondary">{specialty}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Home className="h-5 w-5 mr-2 text-blue-600" />
                      Market Expertise
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {agent.marketExpertise.map((expertise: string, index: number) => (
                        <Badge key={index} variant="secondary">{expertise}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Award className="h-5 w-5 mr-2 text-blue-600" />
                      Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {agent.certifications.map((cert: string, index: number) => (
                        <li key={index} className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          {cert}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Languages className="h-5 w-5 mr-2 text-blue-600" />
                      Languages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {agent.languages.map((language: string, index: number) => (
                        <Badge key={index} variant="outline">{language}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                    Service Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {agent.serviceArea.map((area: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-sm">{area}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {agent.awards && agent.awards.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                      Awards & Recognition
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {agent.awards.map((award: string, index: number) => (
                        <li key={index} className="flex items-center text-sm">
                          <Trophy className="h-4 w-4 mr-2 text-yellow-600" />
                          {award}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Score</CardTitle>
                  <CardDescription>Overall performance rating based on multiple metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-4xl font-bold text-blue-600">{performanceScore.overall}</div>
                      <div className="text-sm text-gray-600">out of 100</div>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        performanceScore.overall >= 90 ? 'bg-green-100 text-green-800' :
                        performanceScore.overall >= 75 ? 'bg-blue-100 text-blue-800' :
                        performanceScore.overall >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {performanceScore.overall >= 90 ? 'Excellent' :
                         performanceScore.overall >= 75 ? 'Above Average' :
                         performanceScore.overall >= 60 ? 'Average' : 'Needs Improvement'}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={performanceScore.overall} className="h-3" />
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sales Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Transaction Volume</span>
                        <span className="font-medium">{performanceScore.transactionVolume}/100</span>
                      </div>
                      <Progress value={performanceScore.transactionVolume} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Average Sale Price</span>
                        <span className="font-medium">{performanceScore.avgSalePrice}/100</span>
                      </div>
                      <Progress value={performanceScore.avgSalePrice} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Client Satisfaction</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Client Rating</span>
                        <span className="font-medium">{performanceScore.clientRating}/100</span>
                      </div>
                      <Progress value={performanceScore.clientRating} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Response Time</span>
                        <span className="font-medium">{performanceScore.responseTime}/100</span>
                      </div>
                      <Progress value={performanceScore.responseTime} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Experience Level</span>
                        <span className="font-medium">{performanceScore.experience}/100</span>
                      </div>
                      <Progress value={performanceScore.experience} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Key Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`grid ${showRevenue ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
                    {showRevenue && (
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold">${(agent.averageSalePrice * agent.soldProperties / 1000000).toFixed(1)}M</div>
                        <div className="text-xs text-gray-600">Total Sales Volume</div>
                      </div>
                    )}
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{Math.round((agent.soldProperties / agent.yearsExperience))}</div>
                      <div className="text-xs text-gray-600">Avg Sales/Year</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{agent.responseTime}</div>
                      <div className="text-xs text-gray-600">Response Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              {performanceData ? (
                <AgentPerformanceAnalytics
                  agentId={agent.id}
                  agentName={agent.name}
                  metrics={performanceData.metrics}
                  monthlyData={performanceData.monthlyData}
                  propertyTypes={performanceData.propertyTypes}
                  yearsExperience={agent.yearsExperience}
                  totalReviews={agent.totalReviews}
                />
              ) : (
                <Card>
                  <CardContent className="text-center py-12 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Performance analytics data not available for this agent.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Rankings Tab */}
            <TabsContent value="rankings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Market Rankings</CardTitle>
                  <CardDescription>Performance rankings compared to other agents in the marketplace</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center space-x-3">
                        <Trophy className="h-8 w-8 text-yellow-600" />
                        <div>
                          <div className="font-semibold">Overall Rank</div>
                          <div className="text-sm text-gray-600">Based on all performance metrics</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-yellow-600">#{rankingData.overallRank}</div>
                        <div className="text-sm text-gray-600">of {rankingData.totalAgents} agents</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                            <span className="font-medium">Sales Volume</span>
                          </div>
                          <Badge variant="outline">#{rankingData.salesVolumeRank}</Badge>
                        </div>
                        <div className="text-sm text-gray-600">Top {rankingData.salesVolumePercentile}%</div>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Star className="h-5 w-5 text-green-600" />
                            <span className="font-medium">Client Rating</span>
                          </div>
                          <Badge variant="outline">#{rankingData.ratingRank}</Badge>
                        </div>
                        <div className="text-sm text-gray-600">Top {rankingData.ratingPercentile}%</div>
                      </div>

                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Home className="h-5 w-5 text-purple-600" />
                            <span className="font-medium">Properties Sold</span>
                          </div>
                          <Badge variant="outline">#{rankingData.propertiesSoldRank}</Badge>
                        </div>
                        <div className="text-sm text-gray-600">Top {rankingData.propertiesSoldPercentile}%</div>
                      </div>

                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-orange-600" />
                            <span className="font-medium">Response Time</span>
                          </div>
                          <Badge variant="outline">#{rankingData.responseTimeRank}</Badge>
                        </div>
                        <div className="text-sm text-gray-600">Top {rankingData.responseTimePercentile}%</div>
                      </div>
                    </div>

                    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg">Ranking Insights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          {rankingData.insights.map((insight: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="h-4 w-4 mr-2 text-blue-600 mt-0.5 flex-shrink-0" />
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-6">
              {agent.reviewStats && <ReviewStats stats={agent.reviewStats} />}
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {agent.reviews && agent.reviews.length > 0 ? (
                    <ReviewList reviews={agent.reviews} onHelpful={handleHelpful} />
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12 text-gray-500">
                        No reviews yet. Be the first to review this agent!
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                <div>
                  <ReviewForm 
                    agentId={agent.id} 
                    agentName={agent.name}
                    onSubmit={handleReviewSubmit}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-600">Phone</div>
                      <div className="font-medium">{agent.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-600">Email</div>
                      <div className="font-medium">{agent.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-600">Response Time</div>
                      <div className="font-medium">{agent.responseTime}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Connect with {agent.name.split(' ')[0]} to discuss your real estate needs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleSendMessage}
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Send Message
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setShowConsultationForm(!showConsultationForm)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowInquiryForm(!showInquiryForm)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Inquire
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Now
                    </Button>
                    <Button variant="outline">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Consultation Form */}
              {showConsultationForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>Schedule Consultation</CardTitle>
                    <CardDescription>Book a meeting with {agent.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScheduleConsultationForm
                      agentId={agent.id}
                      agentName={agent.name}
                      onSuccess={handleConsultationSuccess}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Property Inquiry Form */}
              {showInquiryForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>Property Inquiry</CardTitle>
                    <CardDescription>Tell {agent.name} about your property needs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PropertyInquiryForm
                      agentId={agent.id}
                      agentName={agent.name}
                      onSuccess={handleInquirySuccess}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function calculatePerformanceScore(agent: RealEstateAgent): PerformanceScore {
  const ratingScore = (agent.rating / 5) * 100;
  const experienceScore = Math.min((agent.yearsExperience / 20) * 100, 100);
  const volumeScore = Math.min((agent.soldProperties / 500) * 100, 100);
  const revenueScore = Math.min((agent.averageSalePrice / 1000000) * 100, 100);
  
  const responseTimeScore = agent.responseTime.includes('30') ? 100 :
                           agent.responseTime.includes('1 hour') ? 90 :
                           agent.responseTime.includes('2 hour') ? 75 :
                           agent.responseTime.includes('3 hour') ? 60 : 50;

  return {
    overall: Math.round((ratingScore * 0.3 + experienceScore * 0.2 + volumeScore * 0.25 + revenueScore * 0.15 + responseTimeScore * 0.1)),
    clientRating: Math.round(ratingScore),
    experience: Math.round(experienceScore),
    transactionVolume: Math.round(volumeScore),
    revenue: Math.round(revenueScore),
    avgSalePrice: Math.round(revenueScore),
    responseTime: Math.round(responseTimeScore)
  };
}

function calculateRanking(agent: RealEstateAgent): RankingData {
  const totalAgents = 150; // Mock total
  const performanceScore = calculatePerformanceScore(agent);
  
  const overallRank = Math.max(1, Math.ceil((100 - performanceScore.overall) / 100 * totalAgents));
  const salesVolumeRank = Math.max(1, Math.ceil((500 - agent.soldProperties) / 500 * totalAgents));
  const ratingRank = Math.max(1, Math.ceil((5 - agent.rating) / 5 * totalAgents));
  const propertiesSoldRank = salesVolumeRank;
  const responseTimeRank = agent.responseTime.includes('30') ? 5 :
                          agent.responseTime.includes('1 hour') ? 15 :
                          agent.responseTime.includes('2 hour') ? 35 : 50;

  const insights = [];
  if (overallRank <= 10) insights.push(`Top 10 agent in the marketplace - exceptional performance across all metrics`);
  if (agent.rating >= 4.8) insights.push(`Highly rated by clients with ${agent.totalReviews} verified reviews`);
  if (agent.soldProperties >= 200) insights.push(`Extensive track record with ${agent.soldProperties} successful transactions`);
  if (agent.yearsExperience >= 10) insights.push(`${agent.yearsExperience} years of market expertise and local knowledge`);
  if (agent.responseTime.includes('hour')) insights.push(`Fast response time - typically responds within ${agent.responseTime}`);

  return {
    overallRank,
    salesVolumeRank,
    ratingRank,
    propertiesSoldRank,
    responseTimeRank,
    totalAgents,
    salesVolumePercentile: Math.round((1 - salesVolumeRank / totalAgents) * 100),
    ratingPercentile: Math.round((1 - ratingRank / totalAgents) * 100),
    propertiesSoldPercentile: Math.round((1 - propertiesSoldRank / totalAgents) * 100),
    responseTimePercentile: Math.round((1 - responseTimeRank / totalAgents) * 100),
    insights
  };
}