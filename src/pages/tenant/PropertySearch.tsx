import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { PropertyCard } from '@/components/property/PropertyCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Minus, Plus, Search, SlidersHorizontal } from 'lucide-react';

type FilterOption = { value: string; label: string };

const PRICE_MIN = 0;
const PRICE_MAX = 10000;
const PRICE_STEP = 100;
const PRICE_DEFAULT: [number, number] = [PRICE_MIN, PRICE_MAX];

const formatPrice = (n: number) =>
  n >= PRICE_MAX ? `$${PRICE_MAX.toLocaleString()}+` : `$${n.toLocaleString()}`;

const ROOM_MAX = 6;

const SQUARE_FEET_RANGES: FilterOption[] = [
  { value: 'all', label: 'Any Size' },
  { value: '0-1000', label: 'Under 1,000 sqft' },
  { value: '1000-1500', label: '1,000 – 1,500 sqft' },
  { value: '1500-2500', label: '1,500 – 2,500 sqft' },
  { value: '2500-999999', label: '2,500+ sqft' },
];

const PROPERTY_TYPE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Types' },
  { value: 'House', label: 'House' },
  { value: 'Condo', label: 'Condo' },
  { value: 'Townhouse', label: 'Townhouse' },
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Studio', label: 'Studio' },
  { value: 'Loft', label: 'Loft' },
];

function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
}) {
  const display = value === 0 ? 'Any' : `${value}+`;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="min-w-[3rem] text-center text-sm font-medium">{display}</div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: FilterOption[];
  label?: string;
}) {
  const select = (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        {options.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!label) return select;

  return (
    <div className="space-y-2 flex gap-2 items-center">
      <Label>{label}</Label>
      {select}
    </div>
  );
}

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
  const [priceRange, setPriceRange] = useState<[number, number]>(PRICE_DEFAULT);
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [squareFeet, setSquareFeet] = useState('all');
  const [propertyType, setPropertyType] = useState('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const isPriceFiltered =
    priceRange[0] !== PRICE_DEFAULT[0] || priceRange[1] !== PRICE_DEFAULT[1];
  const activeFilters =
    (isPriceFiltered ? 1 : 0) +
    (bedrooms > 0 ? 1 : 0) +
    (bathrooms > 0 ? 1 : 0) +
    [squareFeet, propertyType].filter((f) => f !== 'all').length;

  const resetFilters = () => {
    setSearchTerm('');
    setPriceRange(PRICE_DEFAULT);
    setBedrooms(0);
    setBathrooms(0);
    setSquareFeet('all');
    setPropertyType('all');
  };

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

    if (property.price < priceRange[0]) return false;
    if (priceRange[1] < PRICE_MAX && property.price > priceRange[1]) return false;

    if (bedrooms > 0 && property.bedrooms < bedrooms) return false;
    if (bathrooms > 0 && property.bathrooms < bathrooms) return false;

    if (squareFeet !== 'all') {
      const [min, max] = squareFeet.split('-').map(Number);
      const sqft = property.square_feet ?? 0;
      if (sqft < min || (max && sqft > max)) return false;
    }

    if (propertyType !== 'all' && property.property_type !== propertyType) return false;

    return true;
  });


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground mb-4">Find Your Perfect Home</h1>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by location or property name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="sm:w-auto h-10">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                  {activeFilters > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilters}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Filters</DialogTitle>
                  <DialogDescription>
                    Refine results by price, size, and property type.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Price Range</Label>
                      <span className="text-sm text-muted-foreground">
                        {formatPrice(priceRange[0])} – {formatPrice(priceRange[1])}
                      </span>
                    </div>
                    <Slider
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step={PRICE_STEP}
                      value={priceRange}
                      onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
                      className="pt-2"
                    />
                  </div>
                  <Stepper
                    label="Bedrooms"
                    value={bedrooms}
                    onChange={setBedrooms}
                    max={ROOM_MAX}
                  />
                  <Stepper
                    label="Bathrooms"
                    value={bathrooms}
                    onChange={setBathrooms}
                    max={ROOM_MAX}
                  />
                  <FilterSelect
                    label="Square Footage"
                    value={squareFeet}
                    onChange={setSquareFeet}
                    placeholder="Square Footage"
                    options={SQUARE_FEET_RANGES}
                  />
                  <FilterSelect
                    label="Property Type"
                    value={propertyType}
                    onChange={setPropertyType}
                    placeholder="Property Type"
                    options={PROPERTY_TYPE_OPTIONS}
                  />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="ghost"
                    onClick={resetFilters}
                    disabled={activeFilters === 0 && !searchTerm}
                  >
                    Clear all
                  </Button>
                  <Button onClick={() => setIsFiltersOpen(false)}>
                    Show {filteredProperties.length}{' '}
                    {filteredProperties.length === 1 ? 'property' : 'properties'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
            <Button variant="outline" onClick={resetFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
