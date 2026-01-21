import { Star, CheckCircle, ThumbsUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AgentReview } from '@/types/review';
import { useState } from 'react';

interface ReviewCardProps {
  review: AgentReview;
  onHelpful?: (reviewId: string) => void;
}

export default function ReviewCard({ review, onHelpful }: ReviewCardProps) {
  const [isHelpful, setIsHelpful] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);

  const handleHelpful = () => {
    if (!isHelpful) {
      setIsHelpful(true);
      setHelpfulCount(prev => prev + 1);
      onHelpful?.(review.id);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-semibold text-lg">
                {review.clientInitials}
              </span>
            </div>
            
            {/* Client Info */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900">{review.clientName}</h4>
                {review.verified && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {renderStars(review.rating)}
                <span>•</span>
                <span>{formatDate(review.date)}</span>
              </div>
            </div>
          </div>

          {/* Transaction Badge */}
          {review.transactionType && (
            <Badge variant="outline" className="capitalize">
              {review.transactionType}
            </Badge>
          )}
        </div>

        {/* Review Title */}
        {review.title && (
          <h5 className="font-semibold text-gray-900 mb-2">{review.title}</h5>
        )}

        {/* Review Text */}
        <p className="text-gray-700 mb-4 leading-relaxed">{review.comment}</p>

        {/* Property Type */}
        {review.propertyType && (
          <p className="text-sm text-gray-500 mb-4">
            Property: {review.propertyType}
          </p>
        )}

        {/* Agent Response */}
        {review.agentResponse && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-blue-900">Agent Response</span>
              <span className="text-sm text-blue-700">
                {formatDate(review.agentResponse.date)}
              </span>
            </div>
            <p className="text-blue-900">{review.agentResponse.text}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHelpful}
            disabled={isHelpful}
            className={isHelpful ? 'text-blue-600' : ''}
          >
            <ThumbsUp className={`h-4 w-4 mr-2 ${isHelpful ? 'fill-blue-600' : ''}`} />
            Helpful ({helpfulCount})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}