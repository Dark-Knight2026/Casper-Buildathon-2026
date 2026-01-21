import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Users,
  TrendingUp,
  MapPin,
  DollarSign,
  Home,
  Mail,
  Phone,
  Calendar,
  Filter,
  ArrowUpDown,
  Star,
  CheckCircle,
  Clock,
  MessageSquare,
  Eye,
  Heart,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TenantRecommendation, PropertyFeatures } from '@/types/matching';

interface BuyerMatch extends TenantRecommendation {
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  buyer_status: 'active' | 'pending' | 'contacted' | 'offer_made';
  property_id: string;
  property_address: string;
  viewed_at?: string;
  saved_at?: string;
  last_contact?: string;
}

interface PropertyBuyerMatchingProps {
  propertyId?: string;
  sellerId: string;
}

export default function PropertyBuyerMatching({ propertyId, sellerId }: PropertyBuyerMatchingProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [matches, setMatches] = useState<BuyerMatch[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>(propertyId || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [minScore, setMinScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'name'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock properties for the seller
  const sellerProperties: PropertyFeatures[] = [
    {
      id: 'prop_1',
      landlord_id: sellerId,
      property_type: 'house',
      address: '123 Oak Street, Norfolk, VA 23510',
      location: { lat: 36.8508, lng: -76.2859, city: 'Norfolk', state: 'VA' },
      bedrooms: 4,
      bathrooms: 3,
      square_feet: 2500,
      monthly_rent: 450000,
      security_deposit: 5000,
      utilities_included: false,
      available_date: '2025-02-01',
      lease_terms: ['1_year'],
      amenities: ['parking', 'gym', 'pool'],
      pet_policy: 'cats_and_dogs',
      smoking_allowed: false,
      furnished: false,
      status: 'active'
    },
    {
      id: 'prop_2',
      landlord_id: sellerId,
      property_type: 'condo',
      address: '456 Beach Boulevard, Virginia Beach, VA 23451',
      location: { lat: 36.8529, lng: -75.9780, city: 'Virginia Beach', state: 'VA' },
      bedrooms: 3,
      bathrooms: 2,
      square_feet: 1800,
      monthly_rent: 350000,
      security_deposit: 4000,
      utilities_included: false,
      available_date: '2025-03-15',
      lease_terms: ['1_year'],
      amenities: ['parking', 'pool', 'balcony'],
      pet_policy: 'no_pets',
      smoking_allowed: false,
      furnished: false,
      status: 'active'
    }
  ];

  // Mock buyer matches data
  useEffect(() => {
    const loadMatches = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockMatches: BuyerMatch[] = [
          {
            tenant_id: 'buyer_1',
            buyer_name: 'Sarah Johnson',
            buyer_email: 'sarah.johnson@email.com',
            buyer_phone: '(757) 555-0123',
            buyer_status: 'active',
            property_id: 'prop_1',
            property_address: '123 Oak Street, Norfolk, VA 23510',
            match_score: {
              property_id: 'prop_1',
              tenant_id: 'buyer_1',
              overall_score: 92,
              component_scores: {
                price_score: 95,
                location_score: 90,
                amenity_score: 88,
                lease_term_score: 92,
                pet_policy_score: 95
              },
              compatibility_metrics: {
                price_difference: -5000,
                price_percentage_of_budget: 98,
                affordability_score: 95,
                required_amenities_met: 3,
                preferred_amenities_met: 2,
                total_amenities_matched: 5,
                amenity_match_percentage: 83,
                lease_term_match: true,
                move_in_date_compatible: true,
                pet_compatible: true,
                overall_compatibility: 92
              },
              weights: {
                price: 0.30,
                location: 0.25,
                amenities: 0.20,
                lease_term: 0.15,
                pet_policy: 0.10
              },
              calculated_at: '2025-01-15T10:00:00Z',
              version: '1.0.0',
              confidence: 0.92
            },
            rank: 1,
            reason: 'Excellent match based on budget, location preferences, and amenity requirements',
            highlights: ['Budget perfectly aligned', 'Preferred neighborhood', 'All required amenities met', 'Pet-friendly'],
            application_status: 'pending',
            viewed_at: '2025-01-14T15:30:00Z',
            saved_at: '2025-01-14T15:35:00Z'
          },
          {
            tenant_id: 'buyer_2',
            buyer_name: 'Michael Chen',
            buyer_email: 'michael.chen@email.com',
            buyer_phone: '(757) 555-0456',
            buyer_status: 'contacted',
            property_id: 'prop_1',
            property_address: '123 Oak Street, Norfolk, VA 23510',
            match_score: {
              property_id: 'prop_1',
              tenant_id: 'buyer_2',
              overall_score: 87,
              component_scores: {
                price_score: 85,
                location_score: 92,
                amenity_score: 85,
                lease_term_score: 88,
                pet_policy_score: 80
              },
              compatibility_metrics: {
                price_difference: 10000,
                price_percentage_of_budget: 102,
                affordability_score: 85,
                required_amenities_met: 2,
                preferred_amenities_met: 3,
                total_amenities_matched: 5,
                amenity_match_percentage: 83,
                lease_term_match: true,
                move_in_date_compatible: true,
                pet_compatible: true,
                overall_compatibility: 87
              },
              weights: {
                price: 0.30,
                location: 0.25,
                amenities: 0.20,
                lease_term: 0.15,
                pet_policy: 0.10
              },
              calculated_at: '2025-01-15T10:00:00Z',
              version: '1.0.0',
              confidence: 0.87
            },
            rank: 2,
            reason: 'Strong match with excellent location preference alignment',
            highlights: ['Great location match', 'Most amenities met', 'Flexible move-in date'],
            application_status: 'none',
            viewed_at: '2025-01-13T09:15:00Z',
            last_contact: '2025-01-14T11:00:00Z'
          },
          {
            tenant_id: 'buyer_3',
            buyer_name: 'Emily Rodriguez',
            buyer_email: 'emily.rodriguez@email.com',
            buyer_phone: '(757) 555-0789',
            buyer_status: 'offer_made',
            property_id: 'prop_2',
            property_address: '456 Beach Boulevard, Virginia Beach, VA 23451',
            match_score: {
              property_id: 'prop_2',
              tenant_id: 'buyer_3',
              overall_score: 89,
              component_scores: {
                price_score: 90,
                location_score: 88,
                amenity_score: 87,
                lease_term_score: 90,
                pet_policy_score: 90
              },
              compatibility_metrics: {
                price_difference: 0,
                price_percentage_of_budget: 100,
                affordability_score: 90,
                required_amenities_met: 2,
                preferred_amenities_met: 2,
                total_amenities_matched: 4,
                amenity_match_percentage: 80,
                lease_term_match: true,
                move_in_date_compatible: true,
                pet_compatible: true,
                overall_compatibility: 89
              },
              weights: {
                price: 0.30,
                location: 0.25,
                amenities: 0.20,
                lease_term: 0.15,
                pet_policy: 0.10
              },
              calculated_at: '2025-01-15T10:00:00Z',
              version: '1.0.0',
              confidence: 0.89
            },
            rank: 1,
            reason: 'Excellent budget alignment and location preference',
            highlights: ['Perfect price match', 'Waterfront location preference', 'Ready to move quickly'],
            application_status: 'approved',
            viewed_at: '2025-01-12T14:20:00Z',
            saved_at: '2025-01-12T14:25:00Z',
            last_contact: '2025-01-15T08:30:00Z'
          },
          {
            tenant_id: 'buyer_4',
            buyer_name: 'David Thompson',
            buyer_email: 'david.thompson@email.com',
            buyer_status: 'active',
            property_id: 'prop_1',
            property_address: '123 Oak Street, Norfolk, VA 23510',
            match_score: {
              property_id: 'prop_1',
              tenant_id: 'buyer_4',
              overall_score: 78,
              component_scores: {
                price_score: 75,
                location_score: 80,
                amenity_score: 78,
                lease_term_score: 80,
                pet_policy_score: 75
              },
              compatibility_metrics: {
                price_difference: 25000,
                price_percentage_of_budget: 106,
                affordability_score: 75,
                required_amenities_met: 2,
                preferred_amenities_met: 1,
                total_amenities_matched: 3,
                amenity_match_percentage: 60,
                lease_term_match: true,
                move_in_date_compatible: true,
                pet_compatible: true,
                overall_compatibility: 78
              },
              weights: {
                price: 0.30,
                location: 0.25,
                amenities: 0.20,
                lease_term: 0.15,
                pet_policy: 0.10
              },
              calculated_at: '2025-01-15T10:00:00Z',
              version: '1.0.0',
              confidence: 0.78
            },
            rank: 3,
            reason: 'Good match with some budget stretch',
            highlights: ['Good location fit', 'Interested in neighborhood'],
            application_status: 'none',
            viewed_at: '2025-01-11T16:45:00Z'
          }
        ];

        setMatches(mockMatches);
      } catch (error) {
        console.error('Failed to load buyer matches:', error);
        toast({
          title: 'Error',
          description: 'Failed to load buyer matches. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMatches();
  }, [sellerId, toast]);

  // Filter and sort matches
  const filteredMatches = useMemo(() => {
    const filtered = matches.filter(match => {
      // Property filter
      if (selectedProperty !== 'all' && match.property_id !== selectedProperty) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all' && match.buyer_status !== filterStatus) {
        return false;
      }

      // Score filter
      if (match.match_score.overall_score < minScore) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          match.buyer_name.toLowerCase().includes(query) ||
          match.buyer_email.toLowerCase().includes(query) ||
          match.property_address.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'score':
          comparison = a.match_score.overall_score - b.match_score.overall_score;
          break;
        case 'date':
          comparison = new Date(a.viewed_at || 0).getTime() - new Date(b.viewed_at || 0).getTime();
          break;
        case 'name':
          comparison = a.buyer_name.localeCompare(b.buyer_name);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [matches, selectedProperty, filterStatus, minScore, searchQuery, sortBy, sortOrder]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'contacted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'offer_made': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleContactBuyer = (match: BuyerMatch) => {
    toast({
      title: 'Contact Buyer',
      description: `Opening email to ${match.buyer_name}...`
    });
    window.location.href = `mailto:${match.buyer_email}?subject=Property Inquiry - ${match.property_address}`;
  };

  const toggleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const renderMatchCard = (match: BuyerMatch) => (
    <Card key={match.tenant_id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Buyer Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{match.buyer_name}</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="outline" className={getStatusColor(match.buyer_status)}>
                    {match.buyer_status.replace('_', ' ')}
                  </Badge>
                  {match.application_status && match.application_status !== 'none' && (
                    <Badge variant="outline" className="capitalize">
                      {match.application_status}
                    </Badge>
                  )}
                </div>
              </div>
              <div className={`text-center px-4 py-2 rounded-lg border ${getScoreColor(match.match_score.overall_score)}`}>
                <div className="text-2xl font-bold">{match.match_score.overall_score}</div>
                <div className="text-xs font-medium">Match Score</div>
              </div>
            </div>

            {/* Property Address */}
            <div className="flex items-center text-sm text-gray-600 mb-3">
              <Home className="h-4 w-4 mr-2" />
              <span>{match.property_address}</span>
            </div>

            {/* Contact Info */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                <a href={`mailto:${match.buyer_email}`} className="hover:text-blue-600">
                  {match.buyer_email}
                </a>
              </div>
              {match.buyer_phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <a href={`tel:${match.buyer_phone}`} className="hover:text-blue-600">
                    {match.buyer_phone}
                  </a>
                </div>
              )}
            </div>

            {/* Match Highlights */}
            <div className="mb-3">
              <p className="text-sm text-gray-700 mb-2">{match.reason}</p>
              <div className="flex flex-wrap gap-2">
                {match.highlights.map((highlight, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {highlight}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
              {match.viewed_at && (
                <div className="flex items-center">
                  <Eye className="h-3 w-3 mr-1" />
                  Viewed {new Date(match.viewed_at).toLocaleDateString()}
                </div>
              )}
              {match.saved_at && (
                <div className="flex items-center">
                  <Heart className="h-3 w-3 mr-1" />
                  Saved {new Date(match.saved_at).toLocaleDateString()}
                </div>
              )}
              {match.last_contact && (
                <div className="flex items-center">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Last contact {new Date(match.last_contact).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Component Scores */}
          <div className="md:w-64 space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Component Scores</h4>
            {Object.entries(match.match_score.component_scores).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 capitalize">{key.replace('_score', '').replace('_', ' ')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        value >= 85 ? 'bg-green-500' : value >= 70 ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className="font-medium w-8 text-right">{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <Button size="sm" onClick={() => handleContactBuyer(match)}>
            <Mail className="h-4 w-4 mr-2" />
            Contact Buyer
          </Button>
          <Button size="sm" variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button size="sm" variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Showing
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center text-2xl">
                <Users className="h-6 w-6 mr-2 text-blue-600" />
                Property-Buyer Matching
              </CardTitle>
              <CardDescription className="mt-2">
                AI-powered matching system to find the best buyers for your properties
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                <TrendingUp className="h-3 w-3 mr-1" />
                {filteredMatches.length} Matches
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Property Filter */}
            <div>
              <Label htmlFor="property-filter" className="text-sm font-medium mb-2 block">
                Property
              </Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger id="property-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {sellerProperties.map(prop => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.address.split(',')[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label htmlFor="status-filter" className="text-sm font-medium mb-2 block">
                Buyer Status
              </Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="offer_made">Offer Made</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Score Filter */}
            <div>
              <Label htmlFor="min-score" className="text-sm font-medium mb-2 block">
                Min Score: {minScore}
              </Label>
              <Input
                id="min-score"
                type="range"
                min="0"
                max="100"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value))}
                className="cursor-pointer"
              />
            </div>

            {/* Sort By */}
            <div>
              <Label htmlFor="sort-by" className="text-sm font-medium mb-2 block">
                Sort By
              </Label>
              <Select value={sortBy} onValueChange={(value: 'score' | 'date' | 'name') => setSortBy(value)}>
                <SelectTrigger id="sort-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Match Score</SelectItem>
                  <SelectItem value="date">Date Viewed</SelectItem>
                  <SelectItem value="name">Buyer Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <Label htmlFor="search" className="text-sm font-medium mb-2 block">
                Search
              </Label>
              <div className="relative">
                <Input
                  id="search"
                  type="text"
                  placeholder="Search buyers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Showing {filteredMatches.length} of {matches.length} matches
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={toggleSort}>
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Matches List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredMatches.length > 0 ? (
        <div className="space-y-4">
          {filteredMatches.map(match => renderMatchCard(match))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No matching buyers found"
          description="Try adjusting your filters or check back later for new matches"
          action={{
            label: 'Reset Filters',
            onClick: () => {
              setSelectedProperty('all');
              setFilterStatus('all');
              setMinScore(0);
              setSearchQuery('');
            }
          }}
        />
      )}
    </div>
  );
}