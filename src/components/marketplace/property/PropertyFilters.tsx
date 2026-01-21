/**
 * PropertyFilters Component
 * Advanced filtering sidebar for property search
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X,
  SlidersHorizontal,
  DollarSign,
  MapPin,
  Home,
  Calendar,
  PawPrint
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PropertyFilterState {
  priceRange: [number, number];
  location: string;
  radius: number; // miles
  propertyTypes: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  minSquareFeet: number | null;
  maxSquareFeet: number | null;
  amenities: string[];
  leaseTerms: string[];
  petPolicy: string[];
  availableFrom: string | null;
  furnished: boolean | null;
}

interface PropertyFiltersProps {
  filters: PropertyFilterState;
  onFiltersChange: (filters: PropertyFilterState) => void;
  onReset: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const PROPERTY_TYPES = [
  'Apartment',
  'House',
  'Condo',
  'Townhouse',
  'Studio',
  'Loft'
];

const AMENITIES = [
  'Parking',
  'Gym',
  'Pool',
  'Laundry',
  'Dishwasher',
  'Air Conditioning',
  'Heating',
  'Balcony',
  'Patio',
  'Hardwood Floors',
  'Fireplace',
  'Walk-in Closet',
  'Storage',
  'Elevator',
  'Doorman',
  'Security System'
];

const LEASE_TERMS = [
  'Month-to-Month',
  '6 Months',
  '1 Year',
  '2 Years'
];

const PET_POLICIES = [
  'Cats Allowed',
  'Dogs Allowed',
  'Small Dogs Only',
  'No Pets'
];

export function PropertyFilters({
  filters,
  onFiltersChange,
  onReset,
  isCollapsed = false,
  onToggleCollapse
}: PropertyFiltersProps) {
  const [localFilters, setLocalFilters] = useState<PropertyFilterState>(filters);

  const updateFilter = <K extends keyof PropertyFilterState>(
    key: K,
    value: PropertyFilterState[K]
  ) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const toggleArrayFilter = <K extends keyof PropertyFilterState>(
    key: K,
    value: string
  ) => {
    const currentArray = localFilters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray as PropertyFilterState[K]);
  };

  const activeFilterCount = () => {
    let count = 0;
    if (localFilters.priceRange[0] > 0 || localFilters.priceRange[1] < 10000) count++;
    if (localFilters.location) count++;
    if (localFilters.propertyTypes.length > 0) count += localFilters.propertyTypes.length;
    if (localFilters.bedrooms !== null) count++;
    if (localFilters.bathrooms !== null) count++;
    if (localFilters.amenities.length > 0) count += localFilters.amenities.length;
    if (localFilters.leaseTerms.length > 0) count += localFilters.leaseTerms.length;
    if (localFilters.petPolicy.length > 0) count += localFilters.petPolicy.length;
    if (localFilters.furnished !== null) count++;
    return count;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (isCollapsed) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleCollapse}
              className="w-full"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Show Filters
              {activeFilterCount() > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {activeFilterCount()}
                </Badge>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Filters
            {activeFilterCount() > 0 && (
              <Badge variant="secondary">{activeFilterCount()}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            )}
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <Separator />

      <ScrollArea className="h-[calc(100vh-200px)]">
        <CardContent className="space-y-6 pt-6">
          {/* Price Range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-semibold">Price Range</Label>
            </div>
            <div className="space-y-2">
              <Slider
                value={localFilters.priceRange}
                onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
                min={0}
                max={10000}
                step={100}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{formatPrice(localFilters.priceRange[0])}</span>
                <span>{formatPrice(localFilters.priceRange[1])}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-semibold">Location</Label>
            </div>
            <Input
              placeholder="Enter city, neighborhood, or ZIP"
              value={localFilters.location}
              onChange={(e) => updateFilter('location', e.target.value)}
            />
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Search Radius</Label>
              <Select
                value={localFilters.radius.toString()}
                onValueChange={(value) => updateFilter('radius', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mile</SelectItem>
                  <SelectItem value="5">5 miles</SelectItem>
                  <SelectItem value="10">10 miles</SelectItem>
                  <SelectItem value="25">25 miles</SelectItem>
                  <SelectItem value="50">50 miles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Property Type */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-semibold">Property Type</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PROPERTY_TYPES.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={localFilters.propertyTypes.includes(type)}
                    onCheckedChange={() => toggleArrayFilter('propertyTypes', type)}
                  />
                  <label
                    htmlFor={`type-${type}`}
                    className="text-sm cursor-pointer"
                  >
                    {type}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Bedrooms & Bathrooms */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Bedrooms & Bathrooms</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Bedrooms</Label>
                <Select
                  value={localFilters.bedrooms?.toString() || 'any'}
                  onValueChange={(value) =>
                    updateFilter('bedrooms', value === 'any' ? null : parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="0">Studio</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                    <SelectItem value="5">5+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Bathrooms</Label>
                <Select
                  value={localFilters.bathrooms?.toString() || 'any'}
                  onValueChange={(value) =>
                    updateFilter('bathrooms', value === 'any' ? null : parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Square Footage */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Square Footage</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Min</Label>
                <Input
                  type="number"
                  placeholder="Min sqft"
                  value={localFilters.minSquareFeet || ''}
                  onChange={(e) =>
                    updateFilter('minSquareFeet', e.target.value ? parseInt(e.target.value) : null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Max</Label>
                <Input
                  type="number"
                  placeholder="Max sqft"
                  value={localFilters.maxSquareFeet || ''}
                  onChange={(e) =>
                    updateFilter('maxSquareFeet', e.target.value ? parseInt(e.target.value) : null)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Amenities */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Amenities</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {AMENITIES.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity}`}
                    checked={localFilters.amenities.includes(amenity)}
                    onCheckedChange={() => toggleArrayFilter('amenities', amenity)}
                  />
                  <label
                    htmlFor={`amenity-${amenity}`}
                    className="text-sm cursor-pointer"
                  >
                    {amenity}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Lease Terms */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-semibold">Lease Terms</Label>
            </div>
            <div className="space-y-2">
              {LEASE_TERMS.map((term) => (
                <div key={term} className="flex items-center space-x-2">
                  <Checkbox
                    id={`lease-${term}`}
                    checked={localFilters.leaseTerms.includes(term)}
                    onCheckedChange={() => toggleArrayFilter('leaseTerms', term)}
                  />
                  <label
                    htmlFor={`lease-${term}`}
                    className="text-sm cursor-pointer"
                  >
                    {term}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Pet Policy */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-semibold">Pet Policy</Label>
            </div>
            <div className="space-y-2">
              {PET_POLICIES.map((policy) => (
                <div key={policy} className="flex items-center space-x-2">
                  <Checkbox
                    id={`pet-${policy}`}
                    checked={localFilters.petPolicy.includes(policy)}
                    onCheckedChange={() => toggleArrayFilter('petPolicy', policy)}
                  />
                  <label
                    htmlFor={`pet-${policy}`}
                    className="text-sm cursor-pointer"
                  >
                    {policy}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Furnished */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Furnished</Label>
            <Select
              value={
                localFilters.furnished === null
                  ? 'any'
                  : localFilters.furnished
                  ? 'yes'
                  : 'no'
              }
              onValueChange={(value) =>
                updateFilter(
                  'furnished',
                  value === 'any' ? null : value === 'yes'
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="yes">Furnished</SelectItem>
                <SelectItem value="no">Unfurnished</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Available From */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Available From</Label>
            <Input
              type="date"
              value={localFilters.availableFrom || ''}
              onChange={(e) => updateFilter('availableFrom', e.target.value || null)}
            />
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}