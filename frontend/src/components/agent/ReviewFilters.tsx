import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, CheckCircle } from 'lucide-react';

interface ReviewFiltersProps {
  selectedRating: string;
  onRatingChange: (rating: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  showVerifiedOnly: boolean;
  onVerifiedToggle: () => void;
}

export default function ReviewFilters({
  selectedRating,
  onRatingChange,
  sortBy,
  onSortChange,
  showVerifiedOnly,
  onVerifiedToggle,
}: ReviewFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
      {/* Rating Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Rating:</span>
        <div className="flex gap-1">
          <Button
            variant={selectedRating === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onRatingChange('all')}
          >
            All
          </Button>
          {[5, 4, 3, 2, 1].map((rating) => (
            <Button
              key={rating}
              variant={selectedRating === rating.toString() ? 'default' : 'outline'}
              size="sm"
              onClick={() => onRatingChange(rating.toString())}
              className="flex items-center gap-1"
            >
              {rating}
              <Star className="h-3 w-3 fill-current" />
            </Button>
          ))}
        </div>
      </div>

      {/* Sort By */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Sort by:</span>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="highest">Highest Rated</SelectItem>
            <SelectItem value="lowest">Lowest Rated</SelectItem>
            <SelectItem value="helpful">Most Helpful</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Verified Only Toggle */}
      <Button
        variant={showVerifiedOnly ? 'default' : 'outline'}
        size="sm"
        onClick={onVerifiedToggle}
        className="flex items-center gap-2"
      >
        <CheckCircle className="h-4 w-4" />
        Verified Only
      </Button>
    </div>
  );
}