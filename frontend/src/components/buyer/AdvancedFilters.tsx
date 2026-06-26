import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  X,
  Filter,
  DollarSign,
  Home,
  Bed,
  Bath,
  Maximize,
  Calendar,
  MapPin,
  Save,
  School,
  Car,
  Trees,
} from 'lucide-react';

interface FilterCriteria {
  priceMin: number;
  priceMax: number;
  bedrooms: number[];
  bathrooms: number[];
  propertyTypes: string[];
  sqftMin: number;
  sqftMax: number;
  yearBuiltMin: number;
  yearBuiltMax: number;
  features: string[];
  neighborhoods: string[];
  schoolRatingMin: number;
  keywords: string;
}

interface AdvancedFiltersProps {
  onApply: (filters: FilterCriteria) => void;
  onClose: () => void;
  initialFilters?: Partial<FilterCriteria>;
}

export function AdvancedFilters({ onApply, onClose, initialFilters }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterCriteria>({
    priceMin: initialFilters?.priceMin || 0,
    priceMax: initialFilters?.priceMax || 2000000,
    bedrooms: initialFilters?.bedrooms || [],
    bathrooms: initialFilters?.bathrooms || [],
    propertyTypes: initialFilters?.propertyTypes || [],
    sqftMin: initialFilters?.sqftMin || 0,
    sqftMax: initialFilters?.sqftMax || 10000,
    yearBuiltMin: initialFilters?.yearBuiltMin || 1900,
    yearBuiltMax: initialFilters?.yearBuiltMax || new Date().getFullYear(),
    features: initialFilters?.features || [],
    neighborhoods: initialFilters?.neighborhoods || [],
    schoolRatingMin: initialFilters?.schoolRatingMin || 0,
    keywords: initialFilters?.keywords || '',
  });

  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { toast } = useToast();

  const propertyTypeOptions = [
    { id: 'house', label: 'House', icon: Home },
    { id: 'condo', label: 'Condo', icon: Home },
    { id: 'townhouse', label: 'Townhouse', icon: Home },
    { id: 'apartment', label: 'Apartment', icon: Home },
  ];

  const featureOptions = [
    { id: 'parking', label: 'Parking', icon: Car },
    { id: 'pool', label: 'Pool', icon: Trees },
    { id: 'gym', label: 'Gym', icon: Trees },
    { id: 'garden', label: 'Garden', icon: Trees },
    { id: 'fireplace', label: 'Fireplace', icon: Home },
    { id: 'ac', label: 'A/C', icon: Home },
    { id: 'heating', label: 'Heating', icon: Home },
    { id: 'hardwood', label: 'Hardwood Floors', icon: Home },
  ];

  const neighborhoodOptions = [
    'Downtown',
    'Westside',
    'Eastside',
    'Northridge',
    'Southpark',
    'Midtown',
    'Riverside',
    'Hillcrest',
  ];

  const toggleArrayValue = <T,>(array: T[], value: T): T[] => {
    return array.includes(value) ? array.filter((v) => v !== value) : [...array, value];
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your filter.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Filter saved!",
      description: `"${filterName}" has been saved successfully.`,
    });
    setShowSaveDialog(false);
    setFilterName('');
  };

  const handleReset = () => {
    setFilters({
      priceMin: 0,
      priceMax: 2000000,
      bedrooms: [],
      bathrooms: [],
      propertyTypes: [],
      sqftMin: 0,
      sqftMax: 10000,
      yearBuiltMin: 1900,
      yearBuiltMax: new Date().getFullYear(),
      features: [],
      neighborhoods: [],
      schoolRatingMin: 0,
      keywords: '',
    });
    toast({
      title: "Filters reset",
      description: "All filters have been cleared.",
    });
  };

  const activeFilterCount = [
    filters.bedrooms.length > 0,
    filters.bathrooms.length > 0,
    filters.propertyTypes.length > 0,
    filters.features.length > 0,
    filters.neighborhoods.length > 0,
    filters.priceMin > 0 || filters.priceMax < 2000000,
    filters.sqftMin > 0 || filters.sqftMax < 10000,
    filters.schoolRatingMin > 0,
  ].filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-auto animate-in fade-in-0 duration-300">
      <div className="min-h-screen flex items-start justify-center p-4 py-8">
        <Card className="w-full max-w-4xl animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Advanced Filters
                </CardTitle>
                {activeFilterCount > 0 && (
                  <Badge className="mt-2">{activeFilterCount} active filters</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Price Range */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4" />
                Price Range
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price-min" className="text-xs text-gray-600">
                    Minimum
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="price-min"
                      type="number"
                      className="pl-7"
                      value={filters.priceMin}
                      onChange={(e) =>
                        setFilters({ ...filters, priceMin: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="price-max" className="text-xs text-gray-600">
                    Maximum
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="price-max"
                      type="number"
                      className="pl-7"
                      value={filters.priceMax}
                      onChange={(e) =>
                        setFilters({ ...filters, priceMax: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bedrooms */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Bed className="w-4 h-4" />
                Bedrooms
              </Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <Button
                    key={num}
                    variant={filters.bedrooms.includes(num) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        bedrooms: toggleArrayValue(filters.bedrooms, num),
                      })
                    }
                  >
                    {num}+
                  </Button>
                ))}
              </div>
            </div>

            {/* Bathrooms */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Bath className="w-4 h-4" />
                Bathrooms
              </Label>
              <div className="flex flex-wrap gap-2">
                {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((num) => (
                  <Button
                    key={num}
                    variant={filters.bathrooms.includes(num) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        bathrooms: toggleArrayValue(filters.bathrooms, num),
                      })
                    }
                  >
                    {num}+
                  </Button>
                ))}
              </div>
            </div>

            {/* Property Type */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Home className="w-4 h-4" />
                Property Type
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {propertyTypeOptions.map((option) => (
                  <Card
                    key={option.id}
                    className={`cursor-pointer transition-all ${
                      filters.propertyTypes.includes(option.id)
                        ? 'border-2 border-blue-600 bg-blue-50'
                        : 'hover:border-blue-300'
                    }`}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        propertyTypes: toggleArrayValue(filters.propertyTypes, option.id),
                      })
                    }
                  >
                    <CardContent className="p-4 text-center">
                      <option.icon className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-sm font-medium">{option.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Square Footage */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Maximize className="w-4 h-4" />
                Square Footage
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sqft-min" className="text-xs text-gray-600">
                    Minimum
                  </Label>
                  <Input
                    id="sqft-min"
                    type="number"
                    value={filters.sqftMin}
                    onChange={(e) =>
                      setFilters({ ...filters, sqftMin: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="sqft-max" className="text-xs text-gray-600">
                    Maximum
                  </Label>
                  <Input
                    id="sqft-max"
                    type="number"
                    value={filters.sqftMax}
                    onChange={(e) =>
                      setFilters({ ...filters, sqftMax: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Year Built */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4" />
                Year Built
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year-min" className="text-xs text-gray-600">
                    From
                  </Label>
                  <Input
                    id="year-min"
                    type="number"
                    value={filters.yearBuiltMin}
                    onChange={(e) =>
                      setFilters({ ...filters, yearBuiltMin: parseInt(e.target.value) || 1900 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="year-max" className="text-xs text-gray-600">
                    To
                  </Label>
                  <Input
                    id="year-max"
                    type="number"
                    value={filters.yearBuiltMax}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        yearBuiltMax: parseInt(e.target.value) || new Date().getFullYear(),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <Label className="mb-3 block">Features & Amenities</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {featureOptions.map((option) => (
                  <Button
                    key={option.id}
                    variant={filters.features.includes(option.id) ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        features: toggleArrayValue(filters.features, option.id),
                      })
                    }
                  >
                    <option.icon className="w-4 h-4 mr-2" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Neighborhoods */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4" />
                Neighborhoods
              </Label>
              <div className="flex flex-wrap gap-2">
                {neighborhoodOptions.map((neighborhood) => (
                  <Badge
                    key={neighborhood}
                    variant={
                      filters.neighborhoods.includes(neighborhood) ? 'default' : 'outline'
                    }
                    className="cursor-pointer"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        neighborhoods: toggleArrayValue(filters.neighborhoods, neighborhood),
                      })
                    }
                  >
                    {neighborhood}
                  </Badge>
                ))}
              </div>
            </div>

            {/* School Rating */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <School className="w-4 h-4" />
                Minimum School Rating
              </Label>
              <div className="flex gap-2">
                {[5, 6, 7, 8, 9, 10].map((rating) => (
                  <Button
                    key={rating}
                    variant={filters.schoolRatingMin === rating ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilters({ ...filters, schoolRatingMin: rating })}
                  >
                    {rating}+
                  </Button>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                placeholder="e.g., updated kitchen, mountain view, cul-de-sac"
                value={filters.keywords}
                onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleReset}>
                Reset All
              </Button>
              <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
                <Save className="w-4 h-4 mr-2" />
                Save Filter
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleApply}>Apply Filters</Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Filter Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/50 z-10 flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
            <Card className="w-full max-w-md animate-in zoom-in-95 duration-200">
              <CardHeader>
                <CardTitle>Save Filter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="filter-name">Filter Name</Label>
                  <Input
                    id="filter-name"
                    placeholder="e.g., 3BR Houses in Downtown"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowSaveDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSaveFilter}
                    disabled={!filterName.trim()}
                  >
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}