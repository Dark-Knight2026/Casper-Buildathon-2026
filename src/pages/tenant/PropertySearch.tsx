import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FavoriteButton } from '@/components/property/FavoriteButton';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MapPin, Bed, Bath, Square, DollarSign, Loader2 } from 'lucide-react';

interface Property {
  id: string;
  landlord_id: string;
  title: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  property_type: string;
  amenities?: string[];
  images?: string[];
  available_from?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export default function PropertySearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [bedrooms, setBedrooms] = useState('all');

  // Fetch properties from database
  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: 'Error',
        description: 'Failed to load properties. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Filter properties based on search criteria
  const filteredProperties = properties.filter((property) => {
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        property.title.toLowerCase().includes(searchLower) ||
        property.address.toLowerCase().includes(searchLower) ||
        property.city.toLowerCase().includes(searchLower) ||
        property.state.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Price range filter
    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      if (property.price < min || (max && property.price > max)) {
        return false;
      }
    }

    // Bedrooms filter
    if (bedrooms !== 'all') {
      const bedroomCount = Number(bedrooms);
      if (property.bedrooms < bedroomCount) {
        return false;
      }
    }

    return true;
  });

  const handlePropertyClick = (propertyId: string) => {
    navigate(`/properties/${propertyId}`);
  };

  const getPropertyImage = (property: Property) => {
    if (property.images && property.images.length > 0) {
      return property.images[0];
    }
    // Default placeholder image
    return 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Your Perfect Home</h1>
          
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by location or property name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Price Range */}
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-2000">Under $2,000</SelectItem>
                <SelectItem value="2000-3000">$2,000 - $3,000</SelectItem>
                <SelectItem value="3000-5000">$3,000 - $5,000</SelectItem>
                <SelectItem value="5000-999999">$5,000+</SelectItem>
              </SelectContent>
            </Select>

            {/* Bedrooms */}
            <Select value={bedrooms} onValueChange={setBedrooms}>
              <SelectTrigger>
                <SelectValue placeholder="Bedrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Bedrooms</SelectItem>
                <SelectItem value="1">1+ Bedroom</SelectItem>
                <SelectItem value="2">2+ Bedrooms</SelectItem>
                <SelectItem value="3">3+ Bedrooms</SelectItem>
                <SelectItem value="4">4+ Bedrooms</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
          </p>
          {!user && (
            <p className="text-sm text-gray-500">
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/auth/register')}>
                Sign up
              </Button>
              {' '}to save your favorite properties
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <Card
              key={property.id}
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <div className="relative" onClick={() => handlePropertyClick(property.id)}>
                <img
                  src={getPropertyImage(property)}
                  alt={property.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2">
                  <FavoriteButton
                    propertyId={property.id}
                    variant="default"
                    className="bg-white/90 hover:bg-white"
                  />
                </div>
              </div>

              <CardContent className="p-4" onClick={() => handlePropertyClick(property.id)}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {property.title}
                </h3>
                <div className="flex items-center text-gray-600 mb-3">
                  <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="text-sm truncate">{property.address}, {property.city}, {property.state}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <div className="flex items-center">
                    <Bed className="h-4 w-4 mr-1" />
                    <span>{property.bedrooms} bed</span>
                  </div>
                  <div className="flex items-center">
                    <Bath className="h-4 w-4 mr-1" />
                    <span>{property.bathrooms} bath</span>
                  </div>
                  {property.square_feet && (
                    <div className="flex items-center">
                      <Square className="h-4 w-4 mr-1" />
                      <span>{property.square_feet} sqft</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center text-2xl font-bold text-gray-900">
                    <DollarSign className="h-5 w-5" />
                    {property.price.toLocaleString()}
                    <span className="text-sm font-normal text-gray-500 ml-1">/mo</span>
                  </div>
                  {property.is_available && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Available
                    </Badge>
                  )}
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0">
                <Button
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePropertyClick(property.id);
                  }}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {filteredProperties.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No properties found matching your criteria.</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setPriceRange('all');
                setBedrooms('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}