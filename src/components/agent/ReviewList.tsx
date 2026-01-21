import { useState, useMemo } from 'react';
import ReviewCard from './ReviewCard';
import ReviewFilters from './ReviewFilters';
import { AgentReview } from '@/types/review';
import { Button } from '@/components/ui/button';

interface ReviewListProps {
  reviews: AgentReview[];
  onHelpful?: (reviewId: string) => void;
}

export default function ReviewList({ reviews, onHelpful }: ReviewListProps) {
  const [selectedRating, setSelectedRating] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [displayCount, setDisplayCount] = useState(5);

  const filteredAndSortedReviews = useMemo(() => {
    let filtered = [...reviews];

    // Filter by rating
    if (selectedRating !== 'all') {
      filtered = filtered.filter(
        (review) => review.rating === parseInt(selectedRating)
      );
    }

    // Filter by verified
    if (showVerifiedOnly) {
      filtered = filtered.filter((review) => review.verified);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        case 'helpful':
          return b.helpfulCount - a.helpfulCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [reviews, selectedRating, sortBy, showVerifiedOnly]);

  const displayedReviews = filteredAndSortedReviews.slice(0, displayCount);
  const hasMore = displayCount < filteredAndSortedReviews.length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReviewFilters
        selectedRating={selectedRating}
        onRatingChange={setSelectedRating}
        sortBy={sortBy}
        onSortChange={setSortBy}
        showVerifiedOnly={showVerifiedOnly}
        onVerifiedToggle={() => setShowVerifiedOnly(!showVerifiedOnly)}
      />

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {displayedReviews.length} of {filteredAndSortedReviews.length} reviews
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        {displayedReviews.length > 0 ? (
          displayedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} onHelpful={onHelpful} />
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            No reviews match your filters
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setDisplayCount((prev) => prev + 5)}
          >
            Load More Reviews
          </Button>
        </div>
      )}
    </div>
  );
}