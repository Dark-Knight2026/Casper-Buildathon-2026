import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ReviewStats as ReviewStatsType } from '@/types/review';

interface ReviewStatsProps {
  stats: ReviewStatsType;
}

export default function ReviewStats({ stats }: ReviewStatsProps) {
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= Math.round(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingPercentage = (count: number) => {
    return stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Rating */}
        <div className="flex items-center gap-6 mb-6 pb-6 border-b">
          <div className="text-center">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {stats.averageRating.toFixed(1)}
            </div>
            {renderStars(stats.averageRating)}
            <p className="text-sm text-gray-500 mt-2">
              Based on {stats.totalReviews} reviews
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
              const percentage = getRatingPercentage(count);
              
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <Progress value={percentage} className="flex-1 h-2" />
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              {stats.verifiedPercentage}%
            </div>
            <p className="text-sm text-gray-600 mt-1">Verified Reviews</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">
              {Math.round((stats.ratingDistribution[5] / stats.totalReviews) * 100)}%
            </div>
            <p className="text-sm text-gray-600 mt-1">5-Star Reviews</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}