import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PropertyCard } from '@/components/property/PropertyCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

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
  rating?: number;
  priceChange?: string;
  daysOnMarket?: number;
  photoCount?: number;
}

export default function PropertySearch() {
  const navigate = useNavigate();

  const MOCK_PROPERTIES: Property[] = FEATURED_PROPERTIES.map((p) => ({
    id: p.id,
    landlord_id: p.landlordId,
    title: p.title,
    description: p.description,
    address: p.address,
    city: p.city,
    state: p.state,
    zip_code: p.zipCode,
    price: p.rent,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    square_feet: p.squareFeet ?? undefined,
    property_type: p.propertyType,
    images: p.images,
    is_available: p.status === 'active',
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
    rating: p.rating,
    priceChange: p.priceChange,
    daysOnMarket: p.daysOnMarket,
    photoCount: p.photoCount,
  }));

  const [properties] = useState<Property[]>(MOCK_PROPERTIES);
  const loading = false;
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [bedrooms, setBedrooms] = useState('all');

  const filteredProperties = properties.filter((property) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        property.title.toLowerCase().includes(searchLower) ||
        property.address.toLowerCase().includes(searchLower) ||
        property.city.toLowerCase().includes(searchLower) ||
        property.state.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      if (property.price < min || (max && property.price > max)) return false;
    }

    if (bedrooms !== 'all') {
      if (property.bedrooms < Number(bedrooms)) return false;
    }

    return true;
  });


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground mb-4">Find Your Perfect Home</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by location or property name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-2000">Under $2,000</SelectItem>
                <SelectItem value="2000-3000">$2,000 – $3,000</SelectItem>
                <SelectItem value="3000-5000">$3,000 – $5,000</SelectItem>
                <SelectItem value="5000-999999">$5,000+</SelectItem>
              </SelectContent>
            </Select>

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
        <p className="text-muted-foreground mb-6">
          {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={{
                id: property.id,
                title: property.title,
                address: property.address,
                city: property.city,
                state: property.state,
                price: property.price,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                squareFeet: property.square_feet,
                images: property.images ?? [],
                status: property.is_available ? 'active' : 'inactive',
                priceChange: property.priceChange,
                rating: property.rating,
                daysOnMarket: property.daysOnMarket,
                photoCount: property.photoCount,
              }}
              onClick={() => navigate(`/properties/${property.id}`, { state: { property } })}
            />
          ))}
        </div>

        {filteredProperties.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">No properties found matching your criteria.</p>
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
