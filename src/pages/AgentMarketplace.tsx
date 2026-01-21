import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import AgentProfileDetailModal from '@/components/agent/AgentProfileDetailModal';
import AgentComparisonTool from '@/components/agent/AgentComparisonTool';
import FavoriteButton from '@/components/agent/FavoriteButton';
import AddToShortlistButton from '@/components/agent/AddToShortlistButton';
import { mockRealEstateAgents, RealEstateAgent } from '@/data/mockAgents';
import { 
  Briefcase, 
  Search, 
  Star, 
  MapPin, 
  Phone, 
  Mail,
  Users,
  Trophy,
  Clock,
  ArrowUpDown,
  BarChart3,
  Grid,
  List,
  GitCompare,
} from 'lucide-react';

export default function AgentMarketplace() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentType, setSelectedAgentType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [selectedAgent, setSelectedAgent] = useState<RealEstateAgent | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [agentsToCompare, setAgentsToCompare] = useState<RealEstateAgent[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  const agentTypeLabels = {
    agent: 'Real Estate Agent',
    broker: 'Licensed Broker',
    team_lead: 'Team Leader'
  };

  const filteredAgents = mockRealEstateAgents.filter(agent => {
    const matchesSearch = searchQuery === '' || 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.specialties.some(specialty => specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
      agent.marketExpertise.some(expertise => expertise.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesAgentType = selectedAgentType === 'all' || agent.agentType === selectedAgentType;
    
    const matchesLocation = selectedLocation === 'all' || 
      agent.serviceArea.includes(selectedLocation);
    
    const matchesSpecialty = selectedSpecialty === 'all' ||
      agent.specialties.some(specialty => specialty.toLowerCase().includes(selectedSpecialty.toLowerCase())) ||
      agent.marketExpertise.some(expertise => expertise.toLowerCase().includes(selectedSpecialty.toLowerCase()));
    
    return matchesSearch && matchesAgentType && matchesLocation && matchesSpecialty;
  });

  // Sort agents
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'experience':
        return b.yearsExperience - a.yearsExperience;
      case 'sold':
        return b.soldProperties - a.soldProperties;
      case 'price':
        return b.averageSalePrice - a.averageSalePrice;
      default:
        return 0;
    }
  });

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'available': return 'Available';
      case 'busy': return 'Busy';
      case 'unavailable': return 'Unavailable';
      default: return 'Unknown';
    }
  };

  const getAgentTypeIcon = (agentType: string) => {
    switch (agentType) {
      case 'broker': return Trophy;
      case 'team_lead': return Users;
      default: return Briefcase;
    }
  };

  const calculatePerformanceScore = (agent: RealEstateAgent) => {
    const ratingScore = (agent.rating / 5) * 100;
    const experienceScore = Math.min((agent.yearsExperience / 20) * 100, 100);
    const volumeScore = Math.min((agent.soldProperties / 500) * 100, 100);
    return Math.round((ratingScore * 0.4 + experienceScore * 0.3 + volumeScore * 0.3));
  };

  const handleViewProfile = (agent: RealEstateAgent) => {
    setSelectedAgent(agent);
    setIsProfileModalOpen(true);
  };

  const handleToggleComparisonMode = () => {
    setIsComparisonMode(!isComparisonMode);
    if (isComparisonMode) {
      setAgentsToCompare([]);
    }
  };

  const handleToggleAgentForComparison = (agent: RealEstateAgent, checked: boolean) => {
    if (checked) {
      if (agentsToCompare.length < 4) {
        setAgentsToCompare([...agentsToCompare, agent]);
      }
    } else {
      setAgentsToCompare(agentsToCompare.filter(a => a.id !== agent.id));
    }
  };

  const handleStartComparison = () => {
    if (agentsToCompare.length >= 2) {
      setIsComparisonModalOpen(true);
    }
  };

  const isAgentSelected = (agentId: string) => {
    return agentsToCompare.some(a => a.id === agentId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Briefcase className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Agent Marketplace</h1>
            </div>
            <Button
              variant={isComparisonMode ? 'default' : 'outline'}
              onClick={handleToggleComparisonMode}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              {isComparisonMode ? 'Exit Comparison' : 'Compare Agents'}
            </Button>
          </div>
          <p className="text-gray-600">
            Connect with top-rated real estate professionals. Browse agent profiles, compare rankings, read verified reviews, and find the perfect match for your needs.
          </p>
        </div>

        {/* Comparison Mode Banner */}
        {isComparisonMode && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitCompare className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Comparison Mode Active
                    </p>
                    <p className="text-sm text-blue-700">
                      Select 2-4 agents to compare ({agentsToCompare.length} selected)
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleStartComparison}
                  disabled={agentsToCompare.length < 2}
                >
                  Compare Selected ({agentsToCompare.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, company, or specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={selectedAgentType} onValueChange={setSelectedAgentType}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Agent Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="agent">Real Estate Agent</SelectItem>
                    <SelectItem value="broker">Licensed Broker</SelectItem>
                    <SelectItem value="team_lead">Team Leader</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    <SelectItem value="Virginia Beach">Virginia Beach</SelectItem>
                    <SelectItem value="Norfolk">Norfolk</SelectItem>
                    <SelectItem value="Chesapeake">Chesapeake</SelectItem>
                    <SelectItem value="Portsmouth">Portsmouth</SelectItem>
                    <SelectItem value="Hampton">Hampton</SelectItem>
                    <SelectItem value="Suffolk">Suffolk</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    <SelectItem value="first-time">First-Time Buyers</SelectItem>
                    <SelectItem value="luxury">Luxury Homes</SelectItem>
                    <SelectItem value="investment">Investment Properties</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="military">Military Relocation</SelectItem>
                    <SelectItem value="waterfront">Waterfront Properties</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="experience">Most Experience</SelectItem>
                    <SelectItem value="sold">Most Sales</SelectItem>
                    <SelectItem value="price">Highest Avg Price</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Found {sortedAgents.length} real estate professional{sortedAgents.length !== 1 ? 's' : ''}
            {selectedAgentType !== 'all' && ` (${agentTypeLabels[selectedAgentType as keyof typeof agentTypeLabels]})`}
            {selectedLocation !== 'all' && ` in ${selectedLocation}`}
            {selectedSpecialty !== 'all' && ` specializing in ${selectedSpecialty}`}
          </p>
        </div>

        {/* Agents Grid/List */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
          {sortedAgents.map((agent) => {
            const AgentIcon = getAgentTypeIcon(agent.agentType);
            const performanceScore = calculatePerformanceScore(agent);
            const isSelected = isAgentSelected(agent.id);
            
            return (
              <Card 
                key={agent.id} 
                className={`hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {isComparisonMode && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleToggleAgentForComparison(agent, checked as boolean)}
                          disabled={!isSelected && agentsToCompare.length >= 4}
                        />
                      )}
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <AgentIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <CardDescription>{agent.companyName}</CardDescription>
                        <Badge variant="outline" className="mt-1">
                          {agentTypeLabels[agent.agentType]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isComparisonMode && (
                        <FavoriteButton 
                          agentId={agent.id}
                          agentName={agent.name}
                          variant="icon-only"
                          size="icon"
                        />
                      )}
                      <Badge className={getAvailabilityColor(agent.availability)}>
                        {getAvailabilityText(agent.availability)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Rating and Experience */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="ml-1 font-medium">{agent.rating}</span>
                          <span className="text-gray-500 text-sm ml-1">({agent.totalReviews})</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {agent.yearsExperience} years exp.
                      </div>
                    </div>

                    {/* Performance Score */}
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">Performance Score</span>
                        </div>
                        <Badge variant="secondary" className="font-bold">{performanceScore}/100</Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${performanceScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {agent.description}
                    </p>

                    {/* Specialties */}
                    <div>
                      <div className="flex flex-wrap gap-1">
                        {agent.specialties.slice(0, 3).map((specialty, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                        {agent.specialties.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{agent.specialties.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Service Area */}
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{agent.serviceArea.join(', ')}</span>
                    </div>

                    {/* Key Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t text-center">
                      <div>
                        <div className="font-semibold text-blue-600">{agent.activeListings}</div>
                        <div className="text-xs text-gray-500">Active</div>
                      </div>
                      <div>
                        <div className="font-semibold text-green-600">{agent.soldProperties}</div>
                        <div className="text-xs text-gray-500">Sold</div>
                      </div>
                      <div>
                        <div className="font-semibold text-purple-600">${Math.round(agent.averageSalePrice / 1000)}K</div>
                        <div className="text-xs text-gray-500">Avg Sale</div>
                      </div>
                    </div>

                    {/* Response Time */}
                    <div className="flex items-center justify-center text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Responds {agent.responseTime}</span>
                    </div>

                    {/* Action Buttons */}
                    {!isComparisonMode && (
                      <div className="flex flex-col gap-2 pt-3">
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => handleViewProfile(agent)}
                        >
                          View Profile
                        </Button>
                        <div className="flex gap-2">
                          <AddToShortlistButton
                            agentId={agent.id}
                            agentName={agent.name}
                            variant="outline"
                            size="sm"
                          />
                          <Button variant="outline" size="sm" className="flex-1">
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* No Results */}
        {sortedAgents.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search criteria or browse all available agents.
            </p>
            <Button 
              onClick={() => {
                setSearchQuery('');
                setSelectedAgentType('all');
                setSelectedLocation('all');
                setSelectedSpecialty('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Agent CTA */}
        <Card className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-8 text-center">
            <Briefcase className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Are you a licensed real estate professional?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Join our marketplace and connect with buyers, sellers, and investors who need your expertise. 
              Create your professional profile and grow your business today.
            </p>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Join as Real Estate Professional
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Agent Profile Detail Modal */}
      <AgentProfileDetailModal
        agent={selectedAgent}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        showRevenue={false}
      />

      {/* Agent Comparison Modal */}
      <Dialog open={isComparisonModalOpen} onOpenChange={setIsComparisonModalOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agent Comparison</DialogTitle>
          </DialogHeader>
          <AgentComparisonTool
            availableAgents={mockRealEstateAgents}
            preselectedAgents={agentsToCompare}
            onClose={() => setIsComparisonModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}