import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AgentProfile } from '@/types/seller';
import { 
  Users, 
  Star, 
  Award, 
  MessageSquare, 
  Phone, 
  Mail,
  Search,
  Plus,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';

export default function AgentInteraction() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [isRequestAgentOpen, setIsRequestAgentOpen] = useState(false);

  // Mock agent profiles
  const agents: AgentProfile[] = [
    {
      id: 'agent-1',
      name: 'Emily Rodriguez',
      email: 'emily@realty.com',
      phone: '(555) 123-4567',
      licenseNumber: 'RE123456',
      brokerage: 'Premium Realty Group',
      aqiScore: 92.3,
      specialties: ['Luxury Homes', 'First-Time Buyers', 'Investment Properties'],
      yearsExperience: 8,
      dealsCompleted: 156,
      averageDaysToClose: 28,
      clientRating: 4.9,
      commissionRate: 2.5,
      profilePhoto: '/agents/emily.jpg',
      bio: 'Experienced luxury home specialist with a track record of exceeding client expectations. Fluent in English and Spanish.'
    },
    {
      id: 'agent-2',
      name: 'Michael Chen',
      email: 'michael@realty.com',
      phone: '(555) 234-5678',
      licenseNumber: 'RE234567',
      brokerage: 'Metro Real Estate',
      aqiScore: 87.9,
      specialties: ['Condos', 'Downtown Properties', 'Tech Professionals'],
      yearsExperience: 6,
      dealsCompleted: 98,
      averageDaysToClose: 32,
      clientRating: 4.7,
      commissionRate: 2.75,
      bio: 'Specializing in urban properties and working with tech industry professionals. Expert in market analysis and negotiation.'
    },
    {
      id: 'agent-3',
      name: 'Sarah Williams',
      email: 'sarah@realty.com',
      phone: '(555) 345-6789',
      licenseNumber: 'RE345678',
      brokerage: 'Coastal Properties',
      aqiScore: 84.1,
      specialties: ['Waterfront', 'Vacation Homes', 'Relocation'],
      yearsExperience: 12,
      dealsCompleted: 203,
      averageDaysToClose: 35,
      clientRating: 4.8,
      commissionRate: 3.0,
      bio: 'Waterfront and vacation home expert with extensive knowledge of coastal markets and relocation services.'
    }
  ];

  // Mock current agent assignments
  const currentAssignments = [
    {
      propertyId: 'prop-1',
      propertyAddress: '123 Main St, Downtown',
      agentId: 'agent-1',
      agentName: 'Emily Rodriguez',
      assignedDate: new Date('2024-08-15'),
      commissionRate: 2.5,
      status: 'active'
    }
  ];

  const getAQIColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.brokerage.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'all' || 
                            agent.specialties.some(s => s.toLowerCase().includes(selectedSpecialty.toLowerCase()));
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Interaction</h2>
          <p className="text-gray-600">Find, evaluate, and manage agent relationships</p>
        </div>
        <Dialog open={isRequestAgentOpen} onOpenChange={setIsRequestAgentOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Request Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Agent Representation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Property</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prop-1">123 Main St, Downtown</SelectItem>
                    <SelectItem value="prop-2">456 Oak Ave, North District</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred Agent (Optional)</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent or leave blank for recommendations" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} - AQI {agent.aqiScore}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Special Requirements</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  rows={3}
                  placeholder="Any specific needs or preferences..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsRequestAgentOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Send Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Agent Assignments */}
      {currentAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Agent Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentAssignments.map((assignment, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{assignment.agentName}</p>
                      <p className="text-sm text-gray-600">{assignment.propertyAddress}</p>
                      <p className="text-xs text-gray-500">
                        Assigned {assignment.assignedDate.toLocaleDateString()} • {assignment.commissionRate}% commission
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search agents or brokerages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            <SelectItem value="luxury">Luxury Homes</SelectItem>
            <SelectItem value="condo">Condos</SelectItem>
            <SelectItem value="waterfront">Waterfront</SelectItem>
            <SelectItem value="investment">Investment Properties</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agent Profiles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {agent.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <p className="text-sm text-gray-600">{agent.brokerage}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={`${agent.aqiScore >= 90 ? 'bg-green-100 text-green-800' : 
                                        agent.aqiScore >= 80 ? 'bg-blue-100 text-blue-800' : 
                                        'bg-yellow-100 text-yellow-800'} border text-xs`}>
                        AQI {agent.aqiScore}
                      </Badge>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        <span className="text-xs text-gray-600">{agent.clientRating}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {agent.commissionRate}%
                  </div>
                  <div className="text-xs text-gray-500">Commission</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-700">{agent.bio}</p>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{agent.yearsExperience}</div>
                    <div className="text-xs text-gray-500">Years Exp.</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{agent.dealsCompleted}</div>
                    <div className="text-xs text-gray-500">Deals</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{agent.averageDaysToClose}</div>
                    <div className="text-xs text-gray-500">Avg Days</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Specialties:</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.specialties.map((specialty, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Message
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Request
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Commission Negotiation */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Agreement Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Standard Rate</h4>
                <Badge variant="outline">2.5%</Badge>
              </div>
              <p className="text-sm text-gray-600">Traditional commission structure with full service</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Performance Based</h4>
                <Badge variant="outline">2.0-3.0%</Badge>
              </div>
              <p className="text-sm text-gray-600">Variable rate based on sale price and timeline</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Flat Fee</h4>
                <Badge variant="outline">$15K</Badge>
              </div>
              <p className="text-sm text-gray-600">Fixed fee regardless of sale price</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}