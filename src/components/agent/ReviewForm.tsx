import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface ReviewSubmission {
  agentId: string;
  rating: number;
  title: string;
  comment: string;
  transactionType: string;
  propertyType: string;
}

interface ReviewFormProps {
  agentId: string;
  agentName: string;
  onSubmit?: (review: ReviewSubmission) => void;
}

export default function ReviewForm({ agentId, agentName, onSubmit }: ReviewFormProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [propertyType, setPropertyType] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please select a star rating',
        variant: 'destructive',
      });
      return;
    }

    if (!comment.trim()) {
      toast({
        title: 'Review Required',
        description: 'Please write a review',
        variant: 'destructive',
      });
      return;
    }

    const review: ReviewSubmission = {
      agentId,
      rating,
      title,
      comment,
      transactionType,
      propertyType,
    };

    onSubmit?.(review);

    toast({
      title: 'Review Submitted',
      description: 'Thank you for your feedback!',
    });

    // Reset form
    setRating(0);
    setTitle('');
    setComment('');
    setTransactionType('');
    setPropertyType('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a Review for {agentName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div>
            <Label>Your Rating *</Label>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-gray-600">
                  {rating === 5 && 'Excellent'}
                  {rating === 4 && 'Very Good'}
                  {rating === 3 && 'Good'}
                  {rating === 2 && 'Fair'}
                  {rating === 1 && 'Poor'}
                </span>
              )}
            </div>
          </div>

          {/* Review Title */}
          <div>
            <Label htmlFor="title">Review Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              className="mt-2"
            />
          </div>

          {/* Review Comment */}
          <div>
            <Label htmlFor="comment">Your Review *</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about your experience working with this agent..."
              rows={6}
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-1">
              Minimum 50 characters ({comment.length}/50)
            </p>
          </div>

          {/* Transaction Type */}
          <div>
            <Label>Transaction Type</Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buying</SelectItem>
                <SelectItem value="sell">Selling</SelectItem>
                <SelectItem value="rent">Renting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Property Type */}
          <div>
            <Label htmlFor="propertyType">Property Type</Label>
            <Input
              id="propertyType"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              placeholder="e.g., Single Family Home, Condo, Townhouse"
              className="mt-2"
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" size="lg">
            Submit Review
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}