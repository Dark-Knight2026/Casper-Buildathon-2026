import { useState } from 'react';
import { Heart, FolderOpen, Trash2, Download, Share2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFavorites } from '@/hooks/useFavorites';
import ShortlistManager from '@/components/agent/ShortlistManager';
import FavoriteButton from '@/components/agent/FavoriteButton';
import AddToShortlistButton from '@/components/agent/AddToShortlistButton';
import AgentProfileDetailModal from '@/components/agent/AgentProfileDetailModal';
import { mockRealEstateAgents, RealEstateAgent } from '@/data/mockAgents';
import { Star, MapPin, Phone, Briefcase, Trophy, Users } from 'lucide-react';

export default function SavedAgents() {
  const { favoriteAgentIds, shortlists, clearAllFavorites } = useFavorites();
  const [selectedAgent, setSelectedAgent] = useState<RealEstateAgent | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const favoriteAgents = mockRealEstateAgents.filter((agent) =>
    favoriteAgentIds.includes(agent.id)
  );

  const getAgentTypeIcon = (agentType: string) => {
    switch (agentType) {
      case 'broker': return Trophy;
      case 'team_lead': return Users;
      default: return Briefcase;
    }
  };

  const handleViewProfile = (agent: RealEstateAgent) => {
    setSelectedAgent(agent);
    setIsProfileModalOpen(true);
  };

  const renderAgentCard = (agent: RealEstateAgent) => {
    const AgentIcon = getAgentTypeIcon(agent.agentType);
    
    return (
      <Card key={agent.id} className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AgentIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{agent.name}</CardTitle>
                <CardDescription>{agent.companyName}</CardDescription>
              </div>
            </div>
            <FavoriteButton 
              agentId={agent.id} 
              agentName={agent.name}
              variant="icon-only"
              size="icon"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Rating */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="ml-1 font-medium">{agent.rating}</span>
                <span className="text-gray-500 text-sm ml-1">({agent.totalReviews})</span>
              </div>
              <span className="text-gray-500">•</span>
              <span className="text-sm text-gray-600">{agent.yearsExperience} years exp.</span>
            </div>

            {/* Specialties */}
            <div className="flex flex-wrap gap-1">
              {agent.specialties.slice(0, 3).map((specialty, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {specialty}
                </Badge>
              ))}
            </div>

            {/* Service Area */}
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{agent.serviceArea.join(', ')}</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t text-center">
              <div>
                <div className="font-semibold text-green-600">{agent.soldProperties}</div>
                <div className="text-xs text-gray-500">Sold</div>
              </div>
              <div>
                <div className="font-semibold text-purple-600">${Math.round(agent.averageSalePrice / 1000)}K</div>
                <div className="text-xs text-gray-500">Avg Sale</div>
              </div>
              <div>
                <div className="font-semibold text-blue-600">{agent.rating}</div>
                <div className="text-xs text-gray-500">Rating</div>
              </div>
            </div>

            {/* Actions */}
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
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderShortlistView = (shortlistId: string) => {
    const shortlist = shortlists.find((list) => list.id === shortlistId);
    if (!shortlist) return null;

    const agents = mockRealEstateAgents.filter((agent) =>
      shortlist.agentIds.includes(agent.id)
    );

    return (
      <div className="space-y-6">
        <Card className={`border-2 ${shortlist.color}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{shortlist.name}</CardTitle>
                {shortlist.description && (
                  <CardDescription>{shortlist.description}</CardDescription>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {agents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Agents Yet</h3>
              <p className="text-gray-500 mb-4">
                Add agents to this shortlist from the Agent Marketplace
              </p>
              <Button onClick={() => window.location.href = '/agent-marketplace'}>
                Browse Agents
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => renderAgentCard(agent))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-500 mr-3 fill-current" />
              <h1 className="text-3xl font-bold text-gray-900">Saved Agents</h1>
            </div>
            {favoriteAgents.length > 0 && (
              <Button
                variant="outline"
                onClick={clearAllFavorites}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Favorites
              </Button>
            )}
          </div>
          <p className="text-gray-600">
            Manage your favorite agents and organize them into custom shortlists
          </p>
        </div>

        <Tabs defaultValue="favorites" className="space-y-6">
          <TabsList>
            <TabsTrigger value="favorites">
              Favorites ({favoriteAgents.length})
            </TabsTrigger>
            {shortlists.map((list) => (
              <TabsTrigger key={list.id} value={list.id}>
                {list.name} ({list.agentIds.length})
              </TabsTrigger>
            ))}
            <TabsTrigger value="manage">Manage Lists</TabsTrigger>
          </TabsList>

          {/* Favorites Tab */}
          <TabsContent value="favorites">
            {favoriteAgents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Favorites Yet</h3>
                  <p className="text-gray-500 mb-4">
                    Start adding agents to your favorites from the Agent Marketplace
                  </p>
                  <Button onClick={() => window.location.href = '/agent-marketplace'}>
                    Browse Agents
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteAgents.map((agent) => renderAgentCard(agent))}
              </div>
            )}
          </TabsContent>

          {/* Shortlist Tabs */}
          {shortlists.map((list) => (
            <TabsContent key={list.id} value={list.id}>
              {renderShortlistView(list.id)}
            </TabsContent>
          ))}

          {/* Manage Lists Tab */}
          <TabsContent value="manage">
            <ShortlistManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Agent Profile Modal */}
      <AgentProfileDetailModal
        agent={selectedAgent}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}