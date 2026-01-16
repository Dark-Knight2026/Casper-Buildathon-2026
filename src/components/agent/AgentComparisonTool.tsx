import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Star,
  TrendingUp,
  Home,
  DollarSign,
  Clock,
  Award,
  Users,
  Target,
  X,
  Download,
  Share2,
  CheckCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  companyName: string;
  rating: number;
  totalReviews: number;
  yearsExperience: number;
  soldProperties: number;
  activeListings: number;
  averageSalePrice: number;
  responseTime: string;
  specialties: string[];
  certifications: string[];
  languages: string[];
  availability: 'available' | 'busy' | 'unavailable';
}

interface AgentComparisonToolProps {
  availableAgents: Agent[];
  preselectedAgents?: Agent[];
  onClose?: () => void;
}

export default function AgentComparisonTool({
  availableAgents,
  preselectedAgents = [],
  onClose,
}: AgentComparisonToolProps) {
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>(
    preselectedAgents.slice(0, 4)
  );

  const handleAddAgent = (agentId: string) => {
    if (selectedAgents.length >= 4) return;
    const agent = availableAgents.find((a) => a.id === agentId);
    if (agent && !selectedAgents.find((a) => a.id === agentId)) {
      setSelectedAgents([...selectedAgents, agent]);
    }
  };

  const handleRemoveAgent = (agentId: string) => {
    setSelectedAgents(selectedAgents.filter((a) => a.id !== agentId));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPerformanceScore = (agent: Agent) => {
    const ratingScore = (agent.rating / 5) * 100;
    const experienceScore = Math.min((agent.yearsExperience / 20) * 100, 100);
    const volumeScore = Math.min((agent.soldProperties / 500) * 100, 100);
    return Math.round((ratingScore * 0.4 + experienceScore * 0.3 + volumeScore * 0.3));
  };

  const getBestInCategory = (category: keyof Agent) => {
    if (selectedAgents.length === 0) return null;
    
    if (category === 'rating' || category === 'yearsExperience' || 
        category === 'soldProperties' || category === 'activeListings' || 
        category === 'averageSalePrice' || category === 'totalReviews') {
      return selectedAgents.reduce((best, agent) => 
        (agent[category] as number) > (best[category] as number) ? agent : best
      );
    }
    
    if (category === 'responseTime') {
      return selectedAgents.reduce((best, agent) => {
        const bestMinutes = parseResponseTime(best.responseTime);
        const agentMinutes = parseResponseTime(agent.responseTime);
        return agentMinutes < bestMinutes ? agent : best;
      });
    }
    
    return null;
  };

  const parseResponseTime = (time: string): number => {
    if (time.includes('30 min')) return 30;
    if (time.includes('1 hour')) return 60;
    if (time.includes('2 hour')) return 120;
    if (time.includes('3 hour')) return 180;
    return 240;
  };

  const getMaxValue = (field: 'rating' | 'yearsExperience' | 'soldProperties' | 'averageSalePrice' | 'totalReviews') => {
    if (selectedAgents.length === 0) return 1;
    return Math.max(...selectedAgents.map((a) => a[field] as number));
  };

  const handleExport = () => {
    console.log('Exporting comparison report...');
    // In a real app, this would generate a PDF or CSV
  };

  const handleShare = () => {
    console.log('Sharing comparison...');
    // In a real app, this would generate a shareable link
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Comparison</h2>
          <p className="text-gray-600 mt-1">Compare up to 4 agents side by side</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Agent Selection */}
      {selectedAgents.length < 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Agent to Compare</CardTitle>
            <CardDescription>
              Select up to {4 - selectedAgents.length} more agent(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleAddAgent}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent..." />
              </SelectTrigger>
              <SelectContent>
                {availableAgents
                  .filter((agent) => !selectedAgents.find((a) => a.id === agent.id))
                  .map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} - {agent.companyName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {selectedAgents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No agents selected</p>
            <p className="text-sm">Select agents from the dropdown above to start comparing</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Agent Headers */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedAgents.length}, minmax(0, 1fr))` }}>
            {selectedAgents.map((agent) => (
              <Card key={agent.id} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => handleRemoveAgent(agent.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardContent className="pt-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                    {agent.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <h3 className="font-bold text-lg mb-1">{agent.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{agent.companyName}</p>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-bold">{agent.rating}</span>
                    <span className="text-sm text-gray-500">({agent.totalReviews})</span>
                  </div>
                  <Badge
                    className={
                      agent.availability === 'available'
                        ? 'bg-green-100 text-green-800'
                        : agent.availability === 'busy'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {agent.availability === 'available'
                      ? 'Available'
                      : agent.availability === 'busy'
                      ? 'Busy'
                      : 'Unavailable'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overall Performance Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Overall Performance Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedAgents.length}, minmax(0, 1fr))` }}>
                {selectedAgents.map((agent) => {
                  const score = getPerformanceScore(agent);
                  const isBest = getBestInCategory('rating')?.id === agent.id;
                  return (
                    <div key={agent.id} className={`text-center p-4 rounded-lg ${isBest ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50'}`}>
                      {isBest && (
                        <Badge className="mb-2 bg-green-600">
                          <Award className="h-3 w-3 mr-1" />
                          Best
                        </Badge>
                      )}
                      <div className="text-3xl font-bold text-blue-600 mb-1">{score}</div>
                      <div className="text-sm text-gray-600 mb-2">out of 100</div>
                      <Progress value={score} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rating */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium">Client Rating</span>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedAgents.length}, minmax(0, 1fr))` }}>
                  {selectedAgents.map((agent) => {
                    const isBest = getBestInCategory('rating')?.id === agent.id;
                    return (
                      <div key={agent.id} className={`p-3 rounded-lg ${isBest ? 'bg-green-50 border border-green-500' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold">{agent.rating}</span>
                          {isBest && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </div>
                        <Progress value={(agent.rating / 5) * 100} className="h-2 mb-1" />
                        <p className="text-xs text-gray-600">{agent.totalReviews} reviews</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Experience */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Years of Experience</span>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedAgents.length}, minmax(0, 1fr))` }}>
                  {selectedAgents.map((agent) => {
                    const isBest = getBestInCategory('yearsExperience')?.id === agent.id;
                    const maxExp = getMaxValue('yearsExperience');
                    return (
                      <div key={agent.id} className={`p-3 rounded-lg ${isBest ? 'bg-green-50 border border-green-500' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold">{agent.yearsExperience}</span>
                          {isBest && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </div>
                        <Progress value={(agent.yearsExperience / maxExp) * 100} className="h-2 mb-1" />
                        <p className="text-xs text-gray-600">years</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Properties Sold */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Home className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Properties Sold</span>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedAgents.length}, minmax(0, 1fr))` }}>
                  {selectedAgents.map((agent) => {
                    const isBest = getBestInCategory('soldProperties')?.id === agent.id;
                    const maxSold = getMaxValue('soldProperties');
                    return (
                      <div key={agent.id} className={`p-3 rounded-lg ${isBest ? 'bg-green-50 border border-green-500' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold">{agent.soldProperties}</span>
                          {isBest && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </div>
                        <Progress value={(agent.soldProperties / maxSold) * 100} className="h-2 mb-1" />
                        <p className="text-xs text-gray-600">total sales</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Average Sale Price */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Average Sale Price</span>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedAgents.length}, minmax(0, 1fr))` }}>
                  {selectedAgents.map((agent) => {
                    const isBest = getBestInCategory('averageSalePrice')?.id === agent.id;
                    const maxPrice = getMaxValue('averageSalePrice');
                    return (
                      <div key={agent.id} className={`p-3 rounded-lg ${isBest ? 'bg-green-50 border border-green-500' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl font-bold">{formatCurrency(agent.averageSalePrice)}</span>
                          {isBest && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </div>
                        <Progress value={(agent.averageSalePrice / maxPrice) * 100} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Response Time */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Response Time</span>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedAgents.length}, minmax(0, 1fr))` }}>
                  {selectedAgents.map((agent) => {
                    const isBest = getBestInCategory('responseTime')?.id === agent.id;
                    return (
                      <div key={agent.id} className={`p-3 rounded-lg ${isBest ? 'bg-green-50 border border-green-500' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-bold">{agent.responseTime}</span>
                          {isBest && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Listings */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Active Listings</span>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedAgents.length}, minmax(0, 1fr))` }}>
                  {selectedAgents.map((agent) => {
                    const isBest = getBestInCategory('activeListings')?.id === agent.id;
                    return (
                      <div key={agent.id} className={`p-3 rounded-lg ${isBest ? 'bg-green-50 border border-green-500' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold">{agent.activeListings}</span>
                          {isBest && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specialties Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Specialties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedAgents.length}, minmax(0, 1fr))` }}>
                {selectedAgents.map((agent) => (
                  <div key={agent.id} className="space-y-2">
                    {agent.specialties.slice(0, 5).map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="mr-1 mb-1">
                        {specialty}
                      </Badge>
                    ))}
                    {agent.specialties.length > 5 && (
                      <Badge variant="outline">+{agent.specialties.length - 5} more</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Certifications Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedAgents.length}, minmax(0, 1fr))` }}>
                {selectedAgents.map((agent) => (
                  <div key={agent.id} className="space-y-2">
                    {agent.certifications.map((cert, index) => (
                      <div key={index} className="flex items-start text-sm">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{cert}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Languages Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Languages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedAgents.length}, minmax(0, 1fr))` }}>
                {selectedAgents.map((agent) => (
                  <div key={agent.id} className="flex flex-wrap gap-2">
                    {agent.languages.map((language, index) => (
                      <Badge key={index} variant="outline">
                        {language}
                      </Badge>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendation */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
                Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const bestAgent = selectedAgents.reduce((best, agent) => 
                  getPerformanceScore(agent) > getPerformanceScore(best) ? agent : best
                );
                return (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-medium text-lg mb-2">
                        Based on overall performance, we recommend <span className="text-blue-600">{bestAgent.name}</span>
                      </p>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-blue-600" />
                          Highest overall performance score ({getPerformanceScore(bestAgent)}/100)
                        </li>
                        <li className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-blue-600" />
                          {bestAgent.rating} star rating with {bestAgent.totalReviews} reviews
                        </li>
                        <li className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-blue-600" />
                          {bestAgent.soldProperties} properties sold with {bestAgent.yearsExperience} years experience
                        </li>
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}