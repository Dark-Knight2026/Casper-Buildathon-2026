import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ListingHero from '@/components/listing/ListingHero';
import ListingKeyFacts from '@/components/listing/ListingKeyFacts';
import ListingFeatures from '@/components/listing/ListingFeatures';
import ListingFinancials from '@/components/listing/ListingFinancials';
import MarketInsightsSection from '@/components/listing/MarketInsightsSection';
import SchoolsSection from '@/components/listing/SchoolsSection';
import SimilarHomesCarousel from '@/components/listing/SimilarHomesCarousel';
import TourOptions from '@/components/listing/TourOptions';
import DealAnalysisTool from '@/components/listing/DealAnalysisTool';
import AgentContact from '@/components/listing/AgentContact';
import PropertyHistoryTimeline from '@/components/listing/PropertyHistoryTimeline';
import NeighborhoodAnalytics from '@/components/listing/NeighborhoodAnalytics';
import InteractiveFloorPlan from '@/components/listing/InteractiveFloorPlan';
import TaxHistoryAnalysis from '@/components/listing/TaxHistoryAnalysis';
import { DetailedListing } from '@/types/listing';
import { 
  Heart, 
  Share2, 
  Calculator, 
  Calendar,
  MapPin,
  Eye,
  Phone,
  Mail,
  ChevronDown,
  Info
} from 'lucide-react';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<DetailedListing | null>(null);
  const [showDealAnalysis, setShowDealAnalysis] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Enhanced mock detailed listing data
    const mockListing: DetailedListing = {
      id: '1',
      mlsNumber: 'MLS-2024-001',
      address: '123 Luxury Lane',
      city: 'Beverly Hills',
      state: 'CA',
      zipCode: '90210',
      price: 2850000,
      beds: 4,
      baths: 3.5,
      sqft: 3200,
      lotSize: 8500,
      yearBuilt: 2018,
      propertyType: 'Single Family Home',
      status: 'active',
      daysOnMLS: 12,
      pricePerSqft: 891,
      description: 'Stunning modern home in prestigious Beverly Hills featuring an open-concept design, gourmet kitchen with premium appliances, luxurious master suite, and beautifully landscaped backyard with pool and spa. This architectural masterpiece offers the perfect blend of contemporary elegance and comfortable living.',
      images: [
        { id: '1', url: '/api/placeholder/800/600', isPrimary: true, caption: 'Front exterior view', order: 1 },
        { id: '2', url: '/api/placeholder/800/600', isPrimary: false, caption: 'Living room', order: 2 },
        { id: '3', url: '/api/placeholder/800/600', isPrimary: false, caption: 'Kitchen', order: 3 },
        { id: '4', url: '/api/placeholder/800/600', isPrimary: false, caption: 'Master bedroom', order: 4 },
        { id: '5', url: '/api/placeholder/800/600', isPrimary: false, caption: 'Backyard pool', order: 5 }
      ],
      features: {
        interior: ['Hardwood floors', 'High ceilings', 'Crown molding', 'Walk-in closets', 'Fireplace'],
        exterior: ['Swimming pool', 'Spa/Hot tub', 'Patio', 'Landscaping', 'Sprinkler system'],
        heating: ['Central heating', 'Gas heating'],
        cooling: ['Central air', 'Zoned cooling'],
        parking: ['2-car garage', 'Driveway parking'],
        flooring: ['Hardwood', 'Tile', 'Carpet in bedrooms'],
        appliances: ['Stainless steel appliances', 'Gas range', 'Dishwasher', 'Refrigerator'],
        energy: ['Energy efficient windows', 'LED lighting', 'Smart thermostat'],
        security: ['Security system', 'Gated community'],
        accessibility: ['Single level living', 'Wide doorways']
      },
      financials: {
        hoaFees: 350,
        propertyTaxes: 28500,
        insurance: 3600,
        utilities: 2400
      },
      marketInsights: {
        walkScore: 78,
        transitScore: 65,
        crimeIndex: 25,
        medianHomePrice: 2100000,
        pricePerSqft: 875,
        daysOnMarket: 18,
        priceHistory: [
          { date: '2024-08-15', event: 'listed', price: 2850000, details: 'Initial listing' },
          { date: '2023-12-01', event: 'sold', price: 2750000, details: 'Previous sale' },
          { date: '2023-11-15', event: 'listed', price: 2800000, details: 'Previous listing' }
        ],
        marketTrends: {
          priceAppreciation: { oneYear: 5.2, threeYear: 15.8, fiveYear: 28.3 },
          inventory: 45,
          absorption: 3.2,
          newListings: 12
        },
        neighborhood: {
          walkScore: 78,
          transitScore: 65,
          bikeScore: 72,
          crimeIndex: 25,
          noiseLevel: 30,
          airQuality: 85,
          demographics: {
            medianAge: 42,
            medianIncome: 125000,
            homeOwnership: 68,
            education: { highSchool: 95, bachelors: 72, graduate: 35 }
          },
          amenities: {
            restaurants: 45,
            shopping: 28,
            entertainment: 15,
            healthcare: 8,
            parks: 12
          }
        },
        nearbyAmenities: [
          { id: '1', name: 'Beverly Hills Hotel', type: 'entertainment', distance: 0.8, rating: 4.5, address: '9641 Sunset Blvd', walkTime: 12 },
          { id: '2', name: 'Whole Foods Market', type: 'shopping', distance: 0.5, rating: 4.2, address: '239 N Canon Dr', walkTime: 8 }
        ]
      },
      schools: [
        { id: '1', name: 'Beverly Hills Elementary', type: 'elementary', rating: 9, distance: 0.5, grades: 'K-5', enrollment: 450, studentTeacherRatio: 18 },
        { id: '2', name: 'Beverly Hills Middle School', type: 'middle', rating: 8, distance: 0.8, grades: '6-8', enrollment: 380, studentTeacherRatio: 20 },
        { id: '3', name: 'Beverly Hills High School', type: 'high', rating: 9, distance: 1.2, grades: '9-12', enrollment: 1200, studentTeacherRatio: 22 }
      ],
      comparables: [
        { id: '1', address: '456 Oak Street', price: 2750000, beds: 4, baths: 3, sqft: 3100, soldDate: '2024-07-15', distance: 0.3, pricePerSqft: 887, daysOnMarket: 25, listPrice: 2800000 },
        { id: '2', address: '789 Maple Avenue', price: 2950000, beds: 5, baths: 4, sqft: 3400, soldDate: '2024-06-28', distance: 0.5, pricePerSqft: 868, daysOnMarket: 18, listPrice: 2950000 },
        { id: '3', address: '321 Pine Drive', price: 2650000, beds: 4, baths: 3, sqft: 2900, soldDate: '2024-08-02', distance: 0.4, pricePerSqft: 914, daysOnMarket: 32, listPrice: 2750000 }
      ],
      agent: {
        id: '1',
        name: 'Sarah Mitchell',
        email: 'sarah@luxuryrealty.com',
        phone: '(310) 555-0123',
        photo: '/api/placeholder/100/100',
        company: 'Luxury Realty Group',
        rating: 4.9,
        reviewCount: 127,
        specialties: ['Luxury homes', 'Beverly Hills', 'Investment properties'],
        yearsExperience: 12,
        salesVolume: 45000000,
        transactionCount: 85,
        responseTime: '< 1 hour',
        languages: ['English', 'Spanish'],
        certifications: ['CRS', 'GRI', 'SRES']
      },
      coordinates: { lat: 34.0736, lng: -118.4004 },
      virtualTourUrl: 'https://example.com/virtual-tour',
      floorPlans: [
        {
          id: '1',
          name: 'Main Floor',
          imageUrl: '/api/placeholder/600/400',
          totalSqft: 3200,
          rooms: [
            { id: '1', name: 'Living Room', type: 'Living', dimensions: '20x16', sqft: 320, coordinates: { x: 10, y: 20, width: 30, height: 25 } },
            { id: '2', name: 'Kitchen', type: 'Kitchen', dimensions: '15x12', sqft: 180, coordinates: { x: 45, y: 20, width: 25, height: 20 } }
          ]
        }
      ],
      propertyHistory: [
        { date: '2024-08-15', event: 'listed', price: 2850000, details: 'Listed for sale', daysOnMarket: 12 },
        { date: '2023-12-01', event: 'sold', price: 2750000, details: 'Sold to current owner' },
        { date: '2023-11-15', event: 'listed', price: 2800000, details: 'Previous listing' }
      ],
      taxHistory: [
        { year: 2024, assessedValue: 2650000, taxAmount: 28500, landValue: 1200000, improvementValue: 1450000 },
        { year: 2023, assessedValue: 2580000, taxAmount: 27800, landValue: 1180000, improvementValue: 1400000 },
        { year: 2022, assessedValue: 2520000, taxAmount: 27100, landValue: 1150000, improvementValue: 1370000 }
      ],
      documents: [],
      showingSlots: [],
      createdAt: '2024-08-15T10:00:00Z',
      updatedAt: '2024-08-15T10:00:00Z',
      views: 1247,
      saves: 89
    };

    setListing(mockListing);
  }, [id]);

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: listing?.address,
        text: `Check out this property: ${listing?.address}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <ListingHero listing={listing} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {listing.address}
                  </h1>
                  <p className="text-lg text-gray-600 mb-3">
                    {listing.city}, {listing.state} {listing.zipCode}
                  </p>
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">MLS# {listing.mlsNumber}</Badge>
                    <Badge className={`${
                      listing.status === 'active' ? 'bg-green-100 text-green-800' :
                      listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {listing.status.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-500">{listing.views.toLocaleString()} views</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFavorite}
                    className={isFavorited ? 'text-red-600 border-red-200' : ''}
                  >
                    <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                    <span className="ml-2">{isFavorited ? 'Saved' : 'Save'}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                    <span className="ml-2">Share</span>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-4xl font-bold text-gray-900">
                  ${listing.price.toLocaleString()}
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => setShowDealAnalysis(true)}
                    className="flex items-center space-x-2"
                  >
                    <Calculator className="h-4 w-4" />
                    <span>Investment Calculator</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Key Facts */}
            <ListingKeyFacts listing={listing} />

            {/* Navigation Tabs */}
            <Card>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-6 rounded-none border-b h-auto p-0">
                    <TabsTrigger value="overview" className="py-4">Overview</TabsTrigger>
                    <TabsTrigger value="features" className="py-4">Features</TabsTrigger>
                    <TabsTrigger value="neighborhood" className="py-4">Neighborhood</TabsTrigger>
                    <TabsTrigger value="schools" className="py-4">Schools</TabsTrigger>
                    <TabsTrigger value="financials" className="py-4">Financials</TabsTrigger>
                    <TabsTrigger value="history" className="py-4">History</TabsTrigger>
                  </TabsList>
                  
                  <div className="p-6">
                    <TabsContent value="overview" className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Property Description</h3>
                        <p className="text-gray-700 leading-relaxed text-lg">{listing.description}</p>
                      </div>
                      
                      {listing.floorPlans.length > 0 && (
                        <InteractiveFloorPlan floorPlans={listing.floorPlans} />
                      )}
                      
                      <SimilarHomesCarousel comparables={listing.comparables} />
                    </TabsContent>
                    
                    <TabsContent value="features">
                      <ListingFeatures features={listing.features} />
                    </TabsContent>
                    
                    <TabsContent value="neighborhood">
                      <NeighborhoodAnalytics 
                        data={listing.marketInsights.neighborhood}
                        amenities={listing.marketInsights.nearbyAmenities}
                      />
                    </TabsContent>
                    
                    <TabsContent value="schools">
                      <SchoolsSection schools={listing.schools} />
                    </TabsContent>
                    
                    <TabsContent value="financials" className="space-y-6">
                      <ListingFinancials 
                        financials={listing.financials}
                        price={listing.price}
                      />
                      <TaxHistoryAnalysis 
                        taxHistory={listing.taxHistory}
                        currentPrice={listing.price}
                      />
                    </TabsContent>
                    
                    <TabsContent value="history" className="space-y-6">
                      <PropertyHistoryTimeline 
                        history={listing.propertyHistory}
                        currentPrice={listing.price}
                      />
                      <MarketInsightsSection 
                        insights={listing.marketInsights}
                        comparables={listing.comparables}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Agent Contact */}
            <AgentContact agent={listing.agent} />

            {/* Tour Options */}
            <TourOptions 
              virtualTourUrl={listing.virtualTourUrl}
              floorPlanUrl={listing.floorPlans[0]?.imageUrl}
            />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full flex items-center justify-center space-x-2 h-12">
                  <Calendar className="h-5 w-5" />
                  <span>Schedule Tour</span>
                </Button>
                <Button variant="outline" className="w-full flex items-center justify-center space-x-2 h-12">
                  <Eye className="h-5 w-5" />
                  <span>Virtual Tour</span>
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="flex items-center justify-center space-x-1">
                    <Phone className="h-4 w-4" />
                    <span>Call</span>
                  </Button>
                  <Button variant="outline" className="flex items-center justify-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Property Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Property Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{listing.daysOnMLS}</div>
                    <div className="text-sm text-gray-600">Days on Market</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">${listing.pricePerSqft}</div>
                    <div className="text-sm text-gray-600">Price per Sq Ft</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{(listing.lotSize / 1000).toFixed(1)}K</div>
                    <div className="text-sm text-gray-600">Lot Size (sq ft)</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{listing.yearBuilt}</div>
                    <div className="text-sm text-gray-600">Year Built</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Deal Analysis Modal */}
      {showDealAnalysis && (
        <DealAnalysisTool
          listing={listing}
          isOpen={showDealAnalysis}
          onClose={() => setShowDealAnalysis(false)}
        />
      )}
    </div>
  );
}