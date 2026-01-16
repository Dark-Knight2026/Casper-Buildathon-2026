import React from 'react';
import { X } from 'lucide-react';
import { SearchFilters } from '@/types/search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SearchFiltersPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClose: () => void;
}

export function SearchFiltersPanel({
  filters,
  onFiltersChange,
  onClose,
}: SearchFiltersPanelProps) {
  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(filters).filter(
    key => filters[key as keyof SearchFilters] !== undefined
  ).length;

  return (
    <div className="w-80 border-l bg-white h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount}</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Property Filters */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700">Property Filters</h4>

            {/* Property Type */}
            <div className="space-y-2">
              <Label>Property Type</Label>
              <Select
                value={filters.propertyType?.[0]}
                onValueChange={(value) =>
                  updateFilter('propertyType', value ? [value] : undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <Label>Price Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.priceRange?.min || ''}
                  onChange={(e) =>
                    updateFilter('priceRange', {
                      ...filters.priceRange,
                      min: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.priceRange?.max || ''}
                  onChange={(e) =>
                    updateFilter('priceRange', {
                      ...filters.priceRange,
                      max: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            {/* Bedrooms */}
            <div className="space-y-2">
              <Label>Bedrooms</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  min="0"
                  value={filters.bedroomRange?.min || ''}
                  onChange={(e) =>
                    updateFilter('bedroomRange', {
                      ...filters.bedroomRange,
                      min: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Max"
                  min="0"
                  value={filters.bedroomRange?.max || ''}
                  onChange={(e) =>
                    updateFilter('bedroomRange', {
                      ...filters.bedroomRange,
                      max: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            {/* Bathrooms */}
            <div className="space-y-2">
              <Label>Bathrooms</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  min="0"
                  step="0.5"
                  value={filters.bathroomRange?.min || ''}
                  onChange={(e) =>
                    updateFilter('bathroomRange', {
                      ...filters.bathroomRange,
                      min: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Max"
                  min="0"
                  step="0.5"
                  value={filters.bathroomRange?.max || ''}
                  onChange={(e) =>
                    updateFilter('bathroomRange', {
                      ...filters.bathroomRange,
                      max: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Tenant Filters */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700">Tenant Filters</h4>

            <div className="space-y-2">
              <Label>Tenant Status</Label>
              <Select
                value={filters.tenantStatus?.[0]}
                onValueChange={(value) =>
                  updateFilter('tenantStatus', value ? [value] : undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lease Status</Label>
              <Select
                value={filters.leaseStatus?.[0]}
                onValueChange={(value) =>
                  updateFilter('leaseStatus', value ? [value] : undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="renewed">Renewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Document Filters */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700">Document Filters</h4>

            <div className="space-y-2">
              <Label>Document Category</Label>
              <Select
                value={filters.documentCategory?.[0]}
                onValueChange={(value) =>
                  updateFilter('documentCategory', value ? [value] : undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lease">Lease</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="identification">Identification</SelectItem>
                  <SelectItem value="payment_receipt">Payment Receipt</SelectItem>
                  <SelectItem value="notice">Notice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="requires-signature">Requires Signature</Label>
              <Switch
                id="requires-signature"
                checked={filters.requiresSignature || false}
                onCheckedChange={(checked) =>
                  updateFilter('requiresSignature', checked || undefined)
                }
              />
            </div>
          </div>

          {/* Agent Filters */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700">Agent Filters</h4>

            <div className="space-y-2">
              <Label>Minimum Rating</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[filters.agentRating || 0]}
                  onValueChange={([value]) =>
                    updateFilter('agentRating', value || undefined)
                  }
                  max={5}
                  step={0.5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-8">
                  {filters.agentRating?.toFixed(1) || '0.0'}
                </span>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700">Date Range</h4>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={
                  filters.dateRange?.start
                    ? new Date(filters.dateRange.start).toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  updateFilter('dateRange', {
                    ...filters.dateRange,
                    start: e.target.value ? new Date(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={
                  filters.dateRange?.end
                    ? new Date(filters.dateRange.end).toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  updateFilter('dateRange', {
                    ...filters.dateRange,
                    end: e.target.value ? new Date(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={clearAllFilters}
          disabled={activeFilterCount === 0}
        >
          Clear All Filters
        </Button>
      </div>
    </div>
  );
}