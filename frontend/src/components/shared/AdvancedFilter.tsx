import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface FilterOption {
  id: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'date' | 'range';
  options?: { value: string; label: string }[];
}

export interface ActiveFilter {
  id: string;
  label: string;
  value: string | number | { min: number; max: number };
  displayValue: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: ActiveFilter[];
  createdAt: Date;
}

interface AdvancedFilterProps {
  filterOptions: FilterOption[];
  activeFilters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, filters: ActiveFilter[]) => void;
  onLoadFilter?: (filter: SavedFilter) => void;
  onDeleteFilter?: (filterId: string) => void;
}

export default function AdvancedFilter({
  filterOptions = [],
  activeFilters = [],
  onFiltersChange,
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter
}: AdvancedFilterProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [rangeMin, setRangeMin] = useState<string>('');
  const [rangeMax, setRangeMax] = useState<string>('');
  const [saveFilterName, setSaveFilterName] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const selectedFilterOption = filterOptions.find(opt => opt.id === selectedOption);

  const handleAddFilter = () => {
    if (!selectedOption || !selectedFilterOption) return;

    let value: string | number | { min: number; max: number };
    let displayValue: string;

    if (selectedFilterOption.type === 'range') {
      if (!rangeMin || !rangeMax) {
        toast({
          title: 'Invalid Range',
          description: 'Please enter both minimum and maximum values',
          variant: 'destructive'
        });
        return;
      }
      value = { min: parseFloat(rangeMin), max: parseFloat(rangeMax) };
      displayValue = `${rangeMin} - ${rangeMax}`;
    } else if (selectedFilterOption.type === 'number') {
      if (!filterValue) return;
      value = parseFloat(filterValue);
      displayValue = filterValue;
    } else if (selectedFilterOption.type === 'select') {
      if (!filterValue) return;
      const option = selectedFilterOption.options?.find(opt => opt.value === filterValue);
      value = filterValue;
      displayValue = option?.label || filterValue;
    } else {
      if (!filterValue) return;
      value = filterValue;
      displayValue = filterValue;
    }

    const newFilter: ActiveFilter = {
      id: selectedOption,
      label: selectedFilterOption.label,
      value,
      displayValue
    };

    // Remove existing filter with same id if exists
    const updatedFilters = activeFilters.filter(f => f.id !== selectedOption);
    onFiltersChange([...updatedFilters, newFilter]);

    // Reset form
    setSelectedOption('');
    setFilterValue('');
    setRangeMin('');
    setRangeMax('');
    setIsOpen(false);

    toast({
      title: 'Filter Added',
      description: `${selectedFilterOption.label} filter applied`
    });
  };

  const handleRemoveFilter = (filterId: string) => {
    onFiltersChange(activeFilters.filter(f => f.id !== filterId));
    toast({
      title: 'Filter Removed',
      description: 'Filter has been removed'
    });
  };

  const handleClearAll = () => {
    onFiltersChange([]);
    toast({
      title: 'Filters Cleared',
      description: 'All filters have been removed'
    });
  };

  const handleSaveFilter = () => {
    if (!saveFilterName.trim()) {
      toast({
        title: 'Invalid Name',
        description: 'Please enter a name for this filter',
        variant: 'destructive'
      });
      return;
    }

    if (activeFilters.length === 0) {
      toast({
        title: 'No Filters',
        description: 'Please add at least one filter before saving',
        variant: 'destructive'
      });
      return;
    }

    if (onSaveFilter) {
      onSaveFilter(saveFilterName, activeFilters);
      setSaveFilterName('');
      setShowSaveDialog(false);
      toast({
        title: 'Filter Saved',
        description: `Filter "${saveFilterName}" has been saved`
      });
    }
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    if (onLoadFilter) {
      onLoadFilter(filter);
      toast({
        title: 'Filter Loaded',
        description: `Filter "${filter.name}" has been applied`
      });
    }
  };

  const handleDeleteSavedFilter = (filterId: string, filterName: string) => {
    if (onDeleteFilter) {
      onDeleteFilter(filterId);
      toast({
        title: 'Filter Deleted',
        description: `Filter "${filterName}" has been deleted`
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Active Filters:</span>
          {activeFilters.map(filter => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span className="text-xs">
                {filter.label}: {filter.displayValue}
              </span>
              <button
                onClick={() => handleRemoveFilter(filter.id)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-6 text-xs"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div>
                <Label>Filter Type</Label>
                <Select value={selectedOption} onValueChange={setSelectedOption}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a filter..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.map(option => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFilterOption && (
                <div>
                  <Label>{selectedFilterOption.label}</Label>
                  
                  {selectedFilterOption.type === 'text' && (
                    <Input
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder={`Enter ${selectedFilterOption.label.toLowerCase()}...`}
                      className="mt-1"
                    />
                  )}

                  {selectedFilterOption.type === 'number' && (
                    <Input
                      type="number"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder={`Enter ${selectedFilterOption.label.toLowerCase()}...`}
                      className="mt-1"
                    />
                  )}

                  {selectedFilterOption.type === 'date' && (
                    <Input
                      type="date"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="mt-1"
                    />
                  )}

                  {selectedFilterOption.type === 'select' && (
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select an option..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedFilterOption.options?.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {selectedFilterOption.type === 'range' && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <Input
                          type="number"
                          value={rangeMin}
                          onChange={(e) => setRangeMin(e.target.value)}
                          placeholder="Min"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={rangeMax}
                          onChange={(e) => setRangeMax(e.target.value)}
                          placeholder="Max"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedOption('');
                    setFilterValue('');
                    setRangeMin('');
                    setRangeMax('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddFilter}
                  disabled={!selectedOption}
                >
                  Apply Filter
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Save Filter Button */}
        {onSaveFilter && activeFilters.length > 0 && (
          <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div>
                  <Label>Filter Name</Label>
                  <Input
                    value={saveFilterName}
                    onChange={(e) => setSaveFilterName(e.target.value)}
                    placeholder="Enter a name for this filter..."
                    className="mt-1"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Current Filters:</p>
                  <div className="space-y-1">
                    {activeFilters.map(filter => (
                      <div key={filter.id} className="text-xs text-gray-600">
                        • {filter.label}: {filter.displayValue}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowSaveDialog(false);
                      setSaveFilterName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveFilter}>
                    Save
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Saved Filters Dropdown */}
        {savedFilters.length > 0 && (
          <Select onValueChange={(value) => {
            const filter = savedFilters.find(f => f.id === value);
            if (filter) handleLoadFilter(filter);
          }}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Load saved filter..." />
            </SelectTrigger>
            <SelectContent>
              {savedFilters.map(filter => (
                <div key={filter.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-100">
                  <SelectItem value={filter.id} className="flex-1 cursor-pointer">
                    {filter.name} ({filter.filters.length})
                  </SelectItem>
                  {onDeleteFilter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSavedFilter(filter.id, filter.name);
                      }}
                      className="ml-2 p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </button>
                  )}
                </div>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}