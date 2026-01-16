import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  MapPin,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Shield,
  GraduationCap,
  Coffee,
  Car,
  Users,
  DollarSign,
  Home,
  School,
  ShoppingBag,
  Utensils,
  TreePine,
  Activity,
} from 'lucide-react';

interface Neighborhood {
  id: string;
  name: string;
  city: string;
  state: string;
  crimeRate: {
    score: number;
    trend: 'up' | 'down' | 'stable';
    description: string;
  };
  schools: {
    elementary: { name: string; rating: number; distance: string };
    middle: { name: string; rating: number; distance: string };
    high: { name: string; rating: number; distance: string };
    averageRating: number;
  };
  walkability: {
    score: number;
    description: string;
  };
  transitScore: {
    score: number;
    description: string;
  };
  demographics: {
    population: number;
    medianAge: number;
    medianIncome: number;
    homeownershipRate: number;
  };
  housing: {
    medianHomeValue: number;
    medianRent: number;
    pricePerSqFt: number;
    yearOverYearGrowth: number;
  };
  amenities: {
    restaurants: number;
    cafes: number;
    groceryStores: number;
    parks: number;
    gyms: number;
    shopping: number;
  };
  commute: {
    averageCommuteTime: number;
    publicTransitAccess: string;
  };
}

const mockNeighborhoods: Neighborhood[] = [
  {
    id: 'neighborhood-1',
    name: 'Downtown',
    city: 'Los Angeles',
    state: 'CA',
    crimeRate: {
      score: 65,
      trend: 'down',
      description: 'Lower than city average',
    },
    schools: {
      elementary: { name: 'Downtown Elementary', rating: 8, distance: '0.5 mi' },
      middle: { name: 'Central Middle School', rating: 7, distance: '0.8 mi' },
      high: { name: 'City High School', rating: 9, distance: '1.2 mi' },
      averageRating: 8,
    },
    walkability: {
      score: 95,
      description: "Walker's Paradise",
    },
    transitScore: {
      score: 92,
      description: 'Excellent Transit',
    },
    demographics: {
      population: 45000,
      medianAge: 34,
      medianIncome: 85000,
      homeownershipRate: 42,
    },
    housing: {
      medianHomeValue: 650000,
      medianRent: 2800,
      pricePerSqFt: 520,
      yearOverYearGrowth: 8.5,
    },
    amenities: {
      restaurants: 250,
      cafes: 120,
      groceryStores: 15,
      parks: 8,
      gyms: 25,
      shopping: 180,
    },
    commute: {
      averageCommuteTime: 25,
      publicTransitAccess: 'Excellent',
    },
  },
  {
    id: 'neighborhood-2',
    name: 'Westside',
    city: 'Los Angeles',
    state: 'CA',
    crimeRate: {
      score: 85,
      trend: 'stable',
      description: 'Much lower than city average',
    },
    schools: {
      elementary: { name: 'Westside Elementary', rating: 9, distance: '0.3 mi' },
      middle: { name: 'West Middle School', rating: 9, distance: '0.6 mi' },
      high: { name: 'Westside High', rating: 10, distance: '1.0 mi' },
      averageRating: 9.3,
    },
    walkability: {
      score: 78,
      description: 'Very Walkable',
    },
    transitScore: {
      score: 65,
      description: 'Good Transit',
    },
    demographics: {
      population: 32000,
      medianAge: 42,
      medianIncome: 125000,
      homeownershipRate: 68,
    },
    housing: {
      medianHomeValue: 950000,
      medianRent: 3500,
      pricePerSqFt: 680,
      yearOverYearGrowth: 6.2,
    },
    amenities: {
      restaurants: 180,
      cafes: 85,
      groceryStores: 12,
      parks: 15,
      gyms: 18,
      shopping: 120,
    },
    commute: {
      averageCommuteTime: 32,
      publicTransitAccess: 'Good',
    },
  },
  {
    id: 'neighborhood-3',
    name: 'Marina',
    city: 'Los Angeles',
    state: 'CA',
    crimeRate: {
      score: 75,
      trend: 'down',
      description: 'Lower than city average',
    },
    schools: {
      elementary: { name: 'Marina Elementary', rating: 7, distance: '0.7 mi' },
      middle: { name: 'Coastal Middle School', rating: 8, distance: '1.0 mi' },
      high: { name: 'Marina High School', rating: 8, distance: '1.5 mi' },
      averageRating: 7.7,
    },
    walkability: {
      score: 88,
      description: 'Very Walkable',
    },
    transitScore: {
      score: 72,
      description: 'Good Transit',
    },
    demographics: {
      population: 28000,
      medianAge: 38,
      medianIncome: 95000,
      homeownershipRate: 55,
    },
    housing: {
      medianHomeValue: 780000,
      medianRent: 3200,
      pricePerSqFt: 590,
      yearOverYearGrowth: 7.8,
    },
    amenities: {
      restaurants: 220,
      cafes: 95,
      groceryStores: 10,
      parks: 12,
      gyms: 22,
      shopping: 150,
    },
    commute: {
      averageCommuteTime: 28,
      publicTransitAccess: 'Good',
    },
  },
];

export function NeighborhoodComparison() {
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<Neighborhood[]>([
    mockNeighborhoods[0],
    mockNeighborhoods[1],
  ]);
  const [availableNeighborhoods] = useState<Neighborhood[]>(mockNeighborhoods);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const handleAddNeighborhood = (neighborhood: Neighborhood) => {
    if (selectedNeighborhoods.length >= 4) {
      toast({
        title: "Maximum reached",
        description: "You can compare up to 4 neighborhoods at a time.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedNeighborhoods.find((n) => n.id === neighborhood.id)) {
      setSelectedNeighborhoods((prev) => [...prev, neighborhood]);
      toast({
        title: "Neighborhood added",
        description: `${neighborhood.name} has been added to the comparison.`,
      });
    }
  };

  const handleRemoveNeighborhood = (neighborhoodId: string) => {
    const neighborhood = selectedNeighborhoods.find(n => n.id === neighborhoodId);
    setSelectedNeighborhoods((prev) => prev.filter((n) => n.id !== neighborhoodId));
    if (neighborhood) {
      toast({
        title: "Neighborhood removed",
        description: `${neighborhood.name} has been removed from the comparison.`,
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Neighborhood Comparison
          </CardTitle>
          <CardDescription>
            Compare neighborhoods side-by-side to find the perfect location
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add Neighborhood */}
          <div className="mb-6">
            <div className="flex gap-2">
              <Select
                onValueChange={(value) => {
                  const neighborhood = availableNeighborhoods.find((n) => n.id === value);
                  if (neighborhood) handleAddNeighborhood(neighborhood);
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a neighborhood to compare..." />
                </SelectTrigger>
                <SelectContent>
                  {availableNeighborhoods
                    .filter((n) => !selectedNeighborhoods.find((s) => s.id === n.id))
                    .map((neighborhood) => (
                      <SelectItem key={neighborhood.id} value={neighborhood.id}>
                        {neighborhood.name}, {neighborhood.city}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Comparing {selectedNeighborhoods.length} of 4 neighborhoods
            </p>
          </div>

          {selectedNeighborhoods.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No neighborhoods selected</p>
              <p className="text-sm text-gray-500">
                Select neighborhoods from the dropdown to start comparing
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Neighborhood Headers */}
                <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `200px repeat(${selectedNeighborhoods.length}, 1fr)` }}>
                  <div></div>
                  {selectedNeighborhoods.map((neighborhood) => (
                    <Card key={neighborhood.id} className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 hover:bg-red-50"
                        onClick={() => handleRemoveNeighborhood(neighborhood.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <CardContent className="p-4 text-center">
                        <h3 className="font-bold text-lg mb-1">{neighborhood.name}</h3>
                        <p className="text-sm text-gray-600">
                          {neighborhood.city}, {neighborhood.state}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Crime Rate */}
                <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `200px repeat(${selectedNeighborhoods.length}, 1fr)` }}>
                  <div className="flex items-center gap-2 font-semibold">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Safety Score
                  </div>
                  {selectedNeighborhoods.map((neighborhood) => (
                    <Card key={neighborhood.id} className={getScoreColor(neighborhood.crimeRate.score)}>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold mb-1">{neighborhood.crimeRate.score}</div>
                        <p className="text-xs mb-2">{neighborhood.crimeRate.description}</p>
                        <div className="flex items-center justify-center gap-1">
                          {neighborhood.crimeRate.trend === 'down' && (
                            <TrendingDown className="w-4 h-4 text-green-600" />
                          )}
                          {neighborhood.crimeRate.trend === 'up' && (
                            <TrendingUp className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-xs">
                            {neighborhood.crimeRate.trend === 'stable' ? 'Stable' : 'Improving'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* School Ratings */}
                <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `200px repeat(${selectedNeighborhoods.length}, 1fr)` }}>
                  <div className="flex items-center gap-2 font-semibold">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                    Schools
                  </div>
                  {selectedNeighborhoods.map((neighborhood) => (
                    <Card key={neighborhood.id}>
                      <CardContent className="p-4">
                        <div className="text-center mb-3">
                          <Badge className={getScoreBadge(neighborhood.schools.averageRating * 10)}>
                            Avg Rating: {neighborhood.schools.averageRating}/10
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Elementary:</span>
                            <span className="font-semibold">{neighborhood.schools.elementary.rating}/10</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Middle:</span>
                            <span className="font-semibold">{neighborhood.schools.middle.rating}/10</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">High:</span>
                            <span className="font-semibold">{neighborhood.schools.high.rating}/10</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Walkability & Transit */}
                <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `200px repeat(${selectedNeighborhoods.length}, 1fr)` }}>
                  <div className="flex items-center gap-2 font-semibold">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Walkability
                  </div>
                  {selectedNeighborhoods.map((neighborhood) => (
                    <Card key={neighborhood.id} className={getScoreColor(neighborhood.walkability.score)}>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold mb-1">{neighborhood.walkability.score}</div>
                        <p className="text-xs">{neighborhood.walkability.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `200px repeat(${selectedNeighborhoods.length}, 1fr)` }}>
                  <div className="flex items-center gap-2 font-semibold">
                    <Car className="w-5 h-5 text-blue-600" />
                    Transit Score
                  </div>
                  {selectedNeighborhoods.map((neighborhood) => (
                    <Card key={neighborhood.id} className={getScoreColor(neighborhood.transitScore.score)}>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold mb-1">{neighborhood.transitScore.score}</div>
                        <p className="text-xs">{neighborhood.transitScore.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Demographics */}
                <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `200px repeat(${selectedNeighborhoods.length}, 1fr)` }}>
                  <div className="flex items-center gap-2 font-semibold">
                    <Users className="w-5 h-5 text-blue-600" />
                    Demographics
                  </div>
                  {selectedNeighborhoods.map((neighborhood) => (
                    <Card key={neighborhood.id}>
                      <CardContent className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Population:</span>
                          <span className="font-semibold">{neighborhood.demographics.population.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Median Age:</span>
                          <span className="font-semibold">{neighborhood.demographics.medianAge}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Median Income:</span>
                          <span className="font-semibold">${(neighborhood.demographics.medianIncome / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Homeownership:</span>
                          <span className="font-semibold">{neighborhood.demographics.homeownershipRate}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Housing Market */}
                <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `200px repeat(${selectedNeighborhoods.length}, 1fr)` }}>
                  <div className="flex items-center gap-2 font-semibold">
                    <Home className="w-5 h-5 text-blue-600" />
                    Housing Market
                  </div>
                  {selectedNeighborhoods.map((neighborhood) => (
                    <Card key={neighborhood.id}>
                      <CardContent className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Median Value:</span>
                          <span className="font-semibold">${(neighborhood.housing.medianHomeValue / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price/SqFt:</span>
                          <span className="font-semibold">${neighborhood.housing.pricePerSqFt}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">YoY Growth:</span>
                          <span className="font-semibold text-green-600">
                            +{neighborhood.housing.yearOverYearGrowth}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Median Rent:</span>
                          <span className="font-semibold">${neighborhood.housing.medianRent.toLocaleString()}/mo</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Amenities */}
                <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `200px repeat(${selectedNeighborhoods.length}, 1fr)` }}>
                  <div className="flex items-center gap-2 font-semibold">
                    <Coffee className="w-5 h-5 text-blue-600" />
                    Amenities
                  </div>
                  {selectedNeighborhoods.map((neighborhood) => (
                    <Card key={neighborhood.id}>
                      <CardContent className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1 text-gray-600">
                            <Utensils className="w-3 h-3" /> Restaurants:
                          </span>
                          <span className="font-semibold">{neighborhood.amenities.restaurants}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1 text-gray-600">
                            <Coffee className="w-3 h-3" /> Cafes:
                          </span>
                          <span className="font-semibold">{neighborhood.amenities.cafes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1 text-gray-600">
                            <ShoppingBag className="w-3 h-3" /> Shopping:
                          </span>
                          <span className="font-semibold">{neighborhood.amenities.shopping}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1 text-gray-600">
                            <TreePine className="w-3 h-3" /> Parks:
                          </span>
                          <span className="font-semibold">{neighborhood.amenities.parks}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Commute */}
                <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${selectedNeighborhoods.length}, 1fr)` }}>
                  <div className="flex items-center gap-2 font-semibold">
                    <Car className="w-5 h-5 text-blue-600" />
                    Commute
                  </div>
                  {selectedNeighborhoods.map((neighborhood) => (
                    <Card key={neighborhood.id}>
                      <CardContent className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Time:</span>
                          <span className="font-semibold">{neighborhood.commute.averageCommuteTime} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Transit:</span>
                          <Badge variant="outline">{neighborhood.commute.publicTransitAccess}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}