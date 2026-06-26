import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  X, 
  Check,
  SlidersHorizontal
} from 'lucide-react';
import AdvancedFilters, { FilterCriteria } from '../filters/AdvancedFilters';

interface MobileFilterDrawerProps {
  onFiltersChange: (filters: FilterCriteria) => void;
  initialFilters?: Partial<FilterCriteria>;
  activeFiltersCount?: number;
}

export default function MobileFilterDrawer({ 
  onFiltersChange, 
  initialFilters = {},
  activeFiltersCount = 0
}: MobileFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterCriteria | null>(null);

  const handleApplyFilters = () => {
    if (tempFilters) {
      onFiltersChange(tempFilters);
    }
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const emptyFilters: FilterCriteria = {
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
    setTempFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="lg"
          className="relative w-full sm:w-auto touch-manipulation"
        >
          <SlidersHorizontal className="h-5 w-5 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent 
        side="bottom" 
        className="h-[90vh] p-0 rounded-t-3xl"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center text-xl">
              <Filter className="h-5 w-5 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount} active
                </Badge>
              )}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="touch-manipulation"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        {/* Filters Content */}
        <ScrollArea className="h-[calc(90vh-140px)]">
          <div className="px-6 py-4">
            <AdvancedFilters
              onFiltersChange={setTempFilters}
              initialFilters={initialFilters}
              isCollapsed={false}
            />
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="flex-1 h-12 text-base touch-manipulation"
            >
              Clear All
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="flex-1 h-12 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 touch-manipulation"
            >
              <Check className="h-5 w-5 mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}