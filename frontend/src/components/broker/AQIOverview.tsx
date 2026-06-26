import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LeaderboardEntry, WeightSchema } from '@/types/broker';
import WeightSchemaEditor from './WeightSchemaEditor';
import { 
  Award, 
  TrendingUp, 
  Settings, 
  Info, 
  BarChart3,
  Users,
  Target,
  Clock,
  Star,
  Camera,
  Shield,
  DollarSign
} from 'lucide-react';

export default function AQIOverview() {
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [isWeightSchemaOpen, setIsWeightSchemaOpen] = useState(false);
  const [currentSchema, setCurrentSchema] = useState<WeightSchema>({
    id: 'schema-v2.1',
    version: 'v2.1',
    production: 0.35,
    efficiency: 0.25,
    clientExperience: 0.20,
    compliance: 0.15,
    marketing: 0.05,
    activeFrom: new Date('2024-01-01'),
    isActive: true
  });

  // Mock leaderboard data
  const leaderboard: LeaderboardEntry[] = [
    {
      agentId: 'agent-1',
      agentName: 'Emily Rodriguez',
      rank: 1,
      aqiScore: 92.3,
      confidenceInterval: [89.1, 95.5],
      dealsCount: 24,
      totalVolume: 8500000,
      skillRating: { mu: 1.8, sigma: 0.3 }
    },
    {
      agentId: 'agent-2',
      agentName: 'Michael Chen',
      rank: 2,
      aqiScore: 87.9,
      confidenceInterval: [84.2, 91.6],
      dealsCount: 19,
      totalVolume: 6200000,
      skillRating: { mu: 1.5, sigma: 0.4 }
    },
    {
      agentId: 'agent-3',
      agentName: 'Sarah Williams',
      rank: 3,
      aqiScore: 84.1,
      confidenceInterval: [80.8, 87.4],
      dealsCount: 16,
      totalVolume: 5800000,
      skillRating: { mu: 1.3, sigma: 0.5 }
    },
    {
      agentId: 'agent-4',
      agentName: 'David Park',
      rank: 4,
      aqiScore: 79.6,
      confidenceInterval: [75.9, 83.3],
      dealsCount: 12,
      totalVolume: 4200000,
      skillRating: { mu: 1.1, sigma: 0.6 }
    }
  ];

  const handleSaveSchema = (newSchema: WeightSchema) => {
    setCurrentSchema(newSchema);
    setIsWeightSchemaOpen(false);
    // In a real app, this would save to the backend
    console.log('Saving new weight schema:', newSchema);
  };

  const getAQIColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-800 text-white';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Quality Index (AQI)</h2>
          <p className="text-gray-600">Comprehensive performance measurement system</p>
        </div>
        <div className="flex items-center space-x-3">
          <Dialog open={isWeightSchemaOpen} onOpenChange={setIsWeightSchemaOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Weight Schema
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>AQI Weight Schema Configuration</DialogTitle>
              </DialogHeader>
              <WeightSchemaEditor
                currentSchema={currentSchema}
                onSave={handleSaveSchema}
                onCancel={() => setIsWeightSchemaOpen(false)}
              />
            </DialogContent>
          </Dialog>
          
          <Button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
            <BarChart3 className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* AQI Components Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Production</p>
                <p className="text-2xl font-bold text-green-600">{(currentSchema.production * 100).toFixed(0)}%</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Deals & Volume</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Efficiency</p>
                <p className="text-2xl font-bold text-blue-600">{(currentSchema.efficiency * 100).toFixed(0)}%</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Speed & Timing</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Client Exp.</p>
                <p className="text-2xl font-bold text-purple-600">{(currentSchema.clientExperience * 100).toFixed(0)}%</p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Ratings & Reviews</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance</p>
                <p className="text-2xl font-bold text-orange-600">{(currentSchema.compliance * 100).toFixed(0)}%</p>
              </div>
              <Shield className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Reliability</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-pink-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Marketing</p>
                <p className="text-2xl font-bold text-pink-600">{(currentSchema.marketing * 100).toFixed(0)}%</p>
              </div>
              <Camera className="h-8 w-8 text-pink-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Quality & Response</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="difficulty">Difficulty Adjustment</TabsTrigger>
          </TabsList>
          
          <Select value={selectedSegment} onValueChange={setSelectedSegment}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Segments</SelectItem>
              <SelectItem value="downtown-sfh-500k-1m">Downtown SFH $500K-$1M</SelectItem>
              <SelectItem value="north-condo-1m-3m">North Condo $1M-$3M</SelectItem>
              <SelectItem value="luxury-sfh-3m+">Luxury SFH $3M+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Agent Performance Leaderboard</span>
                <Badge variant="outline">
                  Schema: {currentSchema.version} | Last Updated: {new Date().toLocaleDateString()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((agent) => (
                  <div key={agent.agentId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Badge className={`${getRankBadge(agent.rank)} w-8 h-8 rounded-full flex items-center justify-center font-bold`}>
                        {agent.rank}
                      </Badge>
                      <div>
                        <p className="font-semibold text-gray-900">{agent.agentName}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{agent.dealsCount} deals</span>
                          <span>${(agent.totalVolume / 1000000).toFixed(1)}M volume</span>
                          <span>Skill: μ={agent.skillRating.mu.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold px-3 py-1 rounded-lg border ${getAQIColor(agent.aqiScore)}`}>
                        {agent.aqiScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        CI: [{agent.confidenceInterval[0].toFixed(1)}, {agent.confidenceInterval[1].toFixed(1)}]
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Downtown SFH</CardTitle>
                <p className="text-sm text-gray-600">$500K - $1M Price Band</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Top Agent:</span>
                    <span className="font-medium">Emily Rodriguez</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg AQI:</span>
                    <span className="font-medium">82.4</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Agents:</span>
                    <span className="font-medium">8</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">North Condos</CardTitle>
                <p className="text-sm text-gray-600">$1M - $3M Price Band</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Top Agent:</span>
                    <span className="font-medium">Michael Chen</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg AQI:</span>
                    <span className="font-medium">79.1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Agents:</span>
                    <span className="font-medium">6</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Luxury Properties</CardTitle>
                <p className="text-sm text-gray-600">$3M+ Price Band</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Top Agent:</span>
                    <span className="font-medium">Sarah Williams</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg AQI:</span>
                    <span className="font-medium">86.7</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Agents:</span>
                    <span className="font-medium">4</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AQI Trends Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Trend analysis charts would be displayed here</p>
                <p className="text-sm text-gray-500 mt-2">Historical AQI data, seasonal patterns, and performance trends</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="difficulty" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Difficulty-Adjusted Skill Ratings</CardTitle>
              <p className="text-sm text-gray-600">TrueSkill/Elo-like system accounting for deal complexity</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((agent) => (
                  <div key={agent.agentId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{agent.agentName.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{agent.agentName}</p>
                        <p className="text-sm text-gray-600">
                          Raw AQI: {agent.aqiScore.toFixed(1)} | {agent.dealsCount} deals
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">
                        μ = {agent.skillRating.mu.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        σ = {agent.skillRating.sigma.toFixed(2)} (uncertainty)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">How Difficulty Adjustment Works:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• ML models predict expected days-to-close and sale price based on property features</li>
                  <li>• Residuals (actual vs expected) measure outperformance</li>
                  <li>• Deal hardness factors (inventory levels, contingencies) scale updates</li>
                  <li>• Higher uncertainty (σ) means larger rating adjustments</li>
                  <li>• Separates skill from easy/hard deal mix</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}