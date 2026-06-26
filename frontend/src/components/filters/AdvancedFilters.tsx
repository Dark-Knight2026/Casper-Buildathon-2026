import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Filter, 
  X, 
  Search, 
  Home, 
  DollarSign, 
  Calendar,
  Star,
  MapPin,
  Bed,
  Bath,
  Square,
  Wifi,
  Car,
  Dumbbell,
  Shield,
  Zap,
  Coffee,
  Trees,
  Waves
} from 'lucide-react';

export interface FilterCriteria {
  priceRange: [number, number];
  propertyTypes: string[];
  bedrooms: string;
  bathrooms: string;
  sqftRange: [number, number];
  amenities: string[];
  location: string;
  availableFrom: string;
  rating: number;
  petFriendly: boolean;
  furnished: boolean;
  utilities: string[];
  leaseTerms: string[];
  keywords: string;
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterCriteria) => void;
  initialFilters?: Partial<FilterCriteria>;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const defaultFilters: FilterCriteria = {
  priceRange: [0, 10000],
  propertyTypes: [],
  bedrooms: 'any',
  bathrooms: 'any',
  sqftRange: [0, 5000],
  amenities: [],
  location: '',
  availableFrom: '',
  rating: 0,
  petFriendly: false,
  furnished: false,
  utilities: [],
  leaseTerms: [],
  keywords: ''
};

const propertyTypes = [
  { id: 'apartment', label: 'Apartment', icon: Home },
  { id: 'house', label: 'House', icon: Home },
  { id: 'villa', label: 'Villa', icon: Home },
  { id: 'condo', label: 'Condo', icon: Home },
  { id: 'townhouse', label: 'Townhouse', icon: Home },
  { id: 'studio', label: 'Studio', icon: Home }
];

const amenities = [
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'gym', label: 'Gym', icon: Dumbbell },
  { id: 'security', label: '24/7 Security', icon: Shield },
  { id: 'elevator', label: 'Elevator', icon: Zap },
  { id: 'laundry', label: 'Laundry', icon: Coffee },
  { id: 'balcony', label: 'Balcony', icon: Trees },
  { id: 'pool', label: 'Swimming Pool', icon: Waves },
  { id: 'ac', label: 'Air Conditioning', icon: Zap },
  { id: 'heating', label: 'Heating', icon: Zap },
  { id: 'dishwasher', label: 'Dishwasher', icon: Coffee },
  { id: 'garden', label: 'Garden', icon: Trees }
];

const utilities = [
  'Electricity',
  'Water',
  'Gas',
  'Internet',
  'Cable TV',
  'Trash Collection'
];

const leaseTerms = [
  '1 month',
  '3 months',
  '6 months',
  '1 year',
  '2+ years'
];

const filterPresets = [
  {
    name: 'Budget Friendly',
    filters: { priceRange: [0, 2000], propertyTypes: ['apartment', 'studio'] }
  },
  {
    name: 'Family Home',
    filters: { bedrooms: '3+', bathrooms: '2+', amenities: ['parking', 'garden'] }
  },
  {
    name: 'Luxury',
    filters: { priceRange: [5000, 10000], amenities: ['pool', 'gym', 'security'], rating: 4 }
  },
  {
    name: 'Pet Friendly',
    filters: { petFriendly: true, amenities: ['garden', 'balcony'] }
  }
];

export default function AdvancedFilters({ 
  onFiltersChange, 
  initialFilters = {}, 
  className = '',
  isCollapsed = false,
  onToggleCollapse
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterCriteria>({
    ...defaultFilters,
    ...initialFilters
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Update filters when they change
  useEffect(() => {
    onFiltersChange(filters);
    
    // Count active filters
    let count = 0;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) count++;
    if (filters.propertyTypes.length > 0) count++;
    if (filters.bedrooms !== 'any') count++;
    if (filters.bathrooms !== 'any') count++;
    if (filters.sqftRange[0] > 0 || filters.sqftRange[1] < 5000) count++;
    if (filters.amenities.length > 0) count++;
    if (filters.location) count++;
    if (filters.availableFrom) count++;
    if (filters.rating > 0) count++;
    if (filters.petFriendly) count++;
    if (filters.furnished) count++;
    if (filters.utilities.length > 0) count++;
    if (filters.leaseTerms.length > 0) count++;
    if (filters.keywords) count++;
    
    setActiveFiltersCount(count);
  }, [filters, onFiltersChange]);

  const updateFilter = <K extends keyof FilterCriteria>(key: K, value: FilterCriteria[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = <K extends keyof FilterCriteria>(key: K, value: string) => {
    setFilters(prev => {
      const currentArray = prev[key] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [key]: newArray };
    });
  };

  const applyPreset = (preset: typeof filterPresets[0]) => {
    setFilters(prev => ({ ...prev, ...preset.filters }));
  };

  const clearAllFilters = () => {
    setFilters(defaultFilters);
  };

  const clearFilter = (filterKey: keyof FilterCriteria) => {
    setFilters(prev => ({ ...prev, [filterKey]: defaultFilters[filterKey] }));
  };

  if (isCollapsed) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              <CardTitle>Filters</CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount} active
                </Badge>
              )}
            </div>
            {onToggleCollapse && (
              <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            <CardTitle>Advanced Filters</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear All
            </Button>
            {onToggleCollapse && (
              <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter Presets */}
        <div className="flex flex-wrap gap-2">
          {filterPresets.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
              className="text-xs"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Keywords Search */}
        <div className="space-y-2">
          <Label>Keywords</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by keywords..."
              value={filters.keywords}
              onChange={(e) => updateFilter('keywords', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label>Location</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="City, neighborhood, or address"
              value={filters.location}
              onChange={(e) => updateFilter('location', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Separator />

        {/* Price Range */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              Price Range
            </Label>
            <span className="text-sm text-gray-600">
              ${filters.priceRange[0].toLocaleString()} - ${filters.priceRange[1].toLocaleString()}
            </span>
          </div>
          <Slider
            value={filters.priceRange}
            onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
            max={10000}
            min={0}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>$0</span>
            <span>$10,000+</span>
          </div>
        </div>

        <Separator />

        {/* Property Types */}
        <div className="space-y-3">
          <Label>Property Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {propertyTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.id}
                  className={`
                    flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors
                    ${filters.propertyTypes.includes(type.id) 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => toggleArrayFilter('propertyTypes', type.id)}
                >
                  <Checkbox 
                    checked={filters.propertyTypes.includes(type.id)}
                    onChange={() => {}}
                  />
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{type.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Bedrooms & Bathrooms */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center">
              <Bed className="h-4 w-4 mr-1" />
              Bedrooms
            </Label>
            <Select value={filters.bedrooms} onValueChange={(value) => updateFilter('bedrooms', value)}>
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
            <Label className="flex items-center">
              <Bath className="h-4 w-4 mr-1" />
              Bathrooms
            </Label>
            <Select value={filters.bathrooms} onValueChange={(value) => updateFilter('bathrooms', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="1.5">1.5+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="2.5">2.5+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Square Footage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center">
              <Square className="h-4 w-4 mr-1" />
              Square Footage
            </Label>
            <span className="text-sm text-gray-600">
              {filters.sqftRange[0].toLocaleString()} - {filters.sqftRange[1].toLocaleString()} sq ft
            </span>
          </div>
          <Slider
            value={filters.sqftRange}
            onValueChange={(value) => updateFilter('sqftRange', value as [number, number])}
            max={5000}
            min={0}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0 sq ft</span>
            <span>5,000+ sq ft</span>
          </div>
        </div>

        <Separator />

        {/* Amenities */}
        <div className="space-y-3">
          <Label>Amenities</Label>
          <div className="grid grid-cols-2 gap-2">
            {amenities.map((amenity) => {
              const Icon = amenity.icon;
              return (
                <div
                  key={amenity.id}
                  className={`
                    flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors
                    ${filters.amenities.includes(amenity.id) 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => toggleArrayFilter('amenities', amenity.id)}
                >
                  <Checkbox 
                    checked={filters.amenities.includes(amenity.id)}
                    onChange={() => {}}
                  />
                  <Icon className="h-3 w-3" />
                  <span className="text-xs">{amenity.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Additional Options */}
        <div className="space-y-4">
          <Label>Additional Options</Label>
          
          {/* Available From */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Available From
            </Label>
            <Input
              type="date"
              value={filters.availableFrom}
              onChange={(e) => updateFilter('availableFrom', e.target.value)}
            />
          </div>

          {/* Minimum Rating */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center">
              <Star className="h-4 w-4 mr-1" />
              Minimum Rating
            </Label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant={filters.rating >= rating ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter('rating', rating)}
                  className="p-2"
                >
                  <Star className="h-3 w-3" />
                </Button>
              ))}
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={filters.petFriendly}
                onCheckedChange={(checked) => updateFilter('petFriendly', checked as boolean)}
              />
              <Label className="text-sm">Pet Friendly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={filters.furnished}
                onCheckedChange={(checked) => updateFilter('furnished', checked as boolean)}
              />
              <Label className="text-sm">Furnished</Label>
            </div>
          </div>

          {/* Utilities Included */}
          <div className="space-y-2">
            <Label className="text-sm">Utilities Included</Label>
            <div className="grid grid-cols-2 gap-2">
              {utilities.map((utility) => (
                <div key={utility} className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.utilities.includes(utility)}
                    onCheckedChange={() => toggleArrayFilter('utilities', utility)}
                  />
                  <Label className="text-xs">{utility}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Lease Terms */}
          <div className="space-y-2">
            <Label className="text-sm">Lease Terms</Label>
            <div className="flex flex-wrap gap-2">
              {leaseTerms.map((term) => (
                <Button
                  key={term}
                  variant={filters.leaseTerms.includes(term) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleArrayFilter('leaseTerms', term)}
                  className="text-xs"
                >
                  {term}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm">Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {filters.priceRange[0] > 0 || filters.priceRange[1] < 10000 ? (
                  <Badge variant="secondary" className="flex items-center">
                    Price: ${filters.priceRange[0].toLocaleString()} - ${filters.priceRange[1].toLocaleString()}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => clearFilter('priceRange')} />
                  </Badge>
                ) : null}
                
                {filters.propertyTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="flex items-center">
                    {propertyTypes.find(pt => pt.id === type)?.label}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleArrayFilter('propertyTypes', type)} />
                  </Badge>
                ))}
                
                {filters.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="flex items-center">
                    {amenities.find(a => a.id === amenity)?.label}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleArrayFilter('amenities', amenity)} />
                  </Badge>
                ))}
                
                {filters.petFriendly && (
                  <Badge variant="secondary" className="flex items-center">
                    Pet Friendly
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('petFriendly', false)} />
                  </Badge>
                )}
                
                {filters.furnished && (
                  <Badge variant="secondary" className="flex items-center">
                    Furnished
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('furnished', false)} />
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}