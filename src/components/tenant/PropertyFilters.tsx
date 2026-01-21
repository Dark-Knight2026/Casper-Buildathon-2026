/**
 * Property Filters Component
 * Filter sidebar for property search
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { PropertySearchParams, PropertyType } from '@/types/property';
import { ALL_AMENITIES, PET_POLICIES } from '@/types/property';
import { X } from 'lucide-react';

interface PropertyFiltersProps {
  filters: PropertySearchParams;
  onFilterChange: (filters: Partial<PropertySearchParams>) => void;
  onReset: () => void;
}

const PROPERTY_TYPES: PropertyType[] = ['Apartment', 'House', 'Condo', 'Townhouse', 'Studio', 'Loft'];

type SortByOption = 'rent' | 'createdAt' | 'updatedAt' | 'views' | 'availableDate';

export function PropertyFilters({ filters, onFilterChange, onReset }: PropertyFiltersProps) {
  const handlePriceChange = (values: number[]) => {
    onFilterChange({
      minRent: values[0],
      maxRent: values[1],
    });
  };

  const handlePropertyTypeToggle = (type: PropertyType) => {
    const current = filters.propertyType || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    onFilterChange({ propertyType: updated.length > 0 ? updated : undefined });
  };

  const handleAmenityToggle = (amenity: string) => {
    const current = filters.amenities || [];
    const updated = current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity];
    onFilterChange({ amenities: updated.length > 0 ? updated : undefined });
  };

  const hasActiveFilters = () => {
    return (
      filters.minRent !== undefined ||
      filters.maxRent !== undefined ||
      filters.minBedrooms !== undefined ||
      filters.maxBedrooms !== undefined ||
      filters.minBathrooms !== undefined ||
      (filters.propertyType && filters.propertyType.length > 0) ||
      (filters.amenities && filters.amenities.length > 0) ||
      filters.petsAllowed !== undefined ||
      filters.furnished !== undefined ||
      filters.parkingAvailable !== undefined
    );
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Filters</CardTitle>
          {hasActiveFilters() && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Range */}
        <div>
          <Label className="mb-3 block">Price Range</Label>
          <div className="space-y-4">
            <Slider
              min={0}
              max={10000}
              step={100}
              value={[filters.minRent || 0, filters.maxRent || 10000]}
              onValueChange={handlePriceChange}
              className="mb-2"
            />
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minRent || ''}
                onChange={(e) => onFilterChange({ minRent: e.target.value ? Number(e.target.value) : undefined })}
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxRent || ''}
                onChange={(e) => onFilterChange({ maxRent: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
        </div>

        {/* Bedrooms */}
        <div>
          <Label className="mb-3 block">Bedrooms</Label>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3, 4].map((num) => (
              <Button
                key={num}
                variant={filters.minBedrooms === num ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFilterChange({ minBedrooms: num })}
              >
                {num === 0 ? 'Studio' : num === 4 ? '4+' : num}
              </Button>
            ))}
          </div>
        </div>

        {/* Bathrooms */}
        <div>
          <Label className="mb-3 block">Bathrooms</Label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 1.5, 2, 2.5, 3].map((num) => (
              <Button
                key={num}
                variant={filters.minBathrooms === num ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFilterChange({ minBathrooms: num })}
              >
                {num === 3 ? '3+' : num}
              </Button>
            ))}
          </div>
        </div>

        {/* Property Type */}
        <div>
          <Label className="mb-3 block">Property Type</Label>
          <div className="space-y-2">
            {PROPERTY_TYPES.map((type) => (
              <div key={type} className="flex items-center">
                <Checkbox
                  id={`type-${type}`}
                  checked={filters.propertyType?.includes(type)}
                  onCheckedChange={() => handlePropertyTypeToggle(type)}
                />
                <label
                  htmlFor={`type-${type}`}
                  className="ml-2 text-sm cursor-pointer"
                >
                  {type}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div>
          <Label className="mb-3 block">Amenities</Label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {ALL_AMENITIES.slice(0, 15).map((amenity) => (
              <div key={amenity} className="flex items-center">
                <Checkbox
                  id={`amenity-${amenity}`}
                  checked={filters.amenities?.includes(amenity)}
                  onCheckedChange={() => handleAmenityToggle(amenity)}
                />
                <label
                  htmlFor={`amenity-${amenity}`}
                  className="ml-2 text-sm cursor-pointer"
                >
                  {amenity}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Filters */}
        <div className="space-y-3">
          <div className="flex items-center">
            <Checkbox
              id="pets-allowed"
              checked={filters.petsAllowed === true}
              onCheckedChange={(checked) => 
                onFilterChange({ petsAllowed: checked ? true : undefined })
              }
            />
            <label htmlFor="pets-allowed" className="ml-2 text-sm cursor-pointer">
              Pets Allowed
            </label>
          </div>

          <div className="flex items-center">
            <Checkbox
              id="furnished"
              checked={filters.furnished === true}
              onCheckedChange={(checked) => 
                onFilterChange({ furnished: checked ? true : undefined })
              }
            />
            <label htmlFor="furnished" className="ml-2 text-sm cursor-pointer">
              Furnished
            </label>
          </div>

          <div className="flex items-center">
            <Checkbox
              id="parking"
              checked={filters.parkingAvailable === true}
              onCheckedChange={(checked) => 
                onFilterChange({ parkingAvailable: checked ? true : undefined })
              }
            />
            <label htmlFor="parking" className="ml-2 text-sm cursor-pointer">
              Parking Available
            </label>
          </div>
        </div>

        {/* Sort By */}
        <div>
          <Label className="mb-3 block">Sort By</Label>
          <Select
            value={filters.sortBy || 'createdAt'}
            onValueChange={(value) => onFilterChange({ sortBy: value as SortByOption })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Newest First</SelectItem>
              <SelectItem value="rent">Price: Low to High</SelectItem>
              <SelectItem value="availableDate">Available Date</SelectItem>
              <SelectItem value="views">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}