/**
 * Maintenance Request Detail Page (Tenant View)
 * Displays detailed information about a maintenance request
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, MapPin, Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { maintenanceService, type MaintenanceRequest, type RequestStatus, type Priority } from '@/services/maintenanceService';
import { MessageThread } from '@/components/maintenance/MessageThread';
import { getCurrentUserId } from '@/lib/supabase/client';

const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted: 'bg-blue-500',
  assigned: 'bg-yellow-500',
  in_progress: 'bg-orange-500',
  completed: 'bg-green-500',
  closed: 'bg-gray-500'
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  emergency: 'bg-red-500'
};

export default function MaintenanceRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  const loadRequest = useCallback(async () => {
    try {
      setLoading(true);
      if (!id) return;

      const data = await maintenanceService.getRequestById(id);
      if (!data) {
        toast({
          title: 'Error',
          description: 'Request not found',
          variant: 'destructive'
        });
        navigate('/tenant/maintenance');
        return;
      }

      setRequest(data);
    } catch (error) {
      console.error('Error loading request:', error);
      toast({
        title: 'Error',
        description: 'Failed to load request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const handleSubmitReview = async () => {
    try {
      if (!id || rating === 0) {
        toast({
          title: 'Error',
          description: 'Please select a rating',
          variant: 'destructive'
        });
        return;
      }

      setSubmittingReview(true);
      await maintenanceService.rateRequest(id, rating, review);

      toast({
        title: 'Success',
        description: 'Thank you for your feedback!'
      });

      setShowReviewDialog(false);
      loadRequest();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review',
        variant: 'destructive'
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  const getStatusLabel = (status: RequestStatus) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPriorityLabel = (priority: Priority) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!request) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/tenant/maintenance')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Requests
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{request.title}</h1>
            <div className="flex items-center gap-2">
              <Badge className={STATUS_COLORS[request.status]}>
                {getStatusLabel(request.status)}
              </Badge>
              <Badge className={PRIORITY_COLORS[request.priority]}>
                {getPriorityLabel(request.priority)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Request #{request.id.slice(0, 8)}
              </span>
            </div>
          </div>

          {request.status === 'completed' && !request.rating && (
            <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Star className="mr-2 h-4 w-4" />
                  Rate & Review
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rate This Service</DialogTitle>
                  <DialogDescription>
                    How satisfied are you with the maintenance service?
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Rating</Label>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`h-8 w-8 ${
                              star <= rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Review (Optional)</Label>
                    <Textarea
                      placeholder="Share your experience..."
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitReview} disabled={submittingReview || rating === 0}>
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{request.description}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Issue Type</h4>
                  <p className="text-sm capitalize">{request.issueType.replace('_', ' ')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Created</h4>
                  <p className="text-sm">{formatDate(request.createdAt)}</p>
                </div>
              </div>

              {request.preferredAccessTime && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Preferred Access Time
                  </h4>
                  <p className="text-sm">{formatDate(request.preferredAccessTime)}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Permission to Enter
                </h4>
                <p className="text-sm">
                  {request.permissionToEnter ? 'Yes' : 'No'}
                </p>
              </div>

              {request.completedAt && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Completed</h4>
                  <p className="text-sm">{formatDate(request.completedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          {request.photos && request.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {request.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(photo, '_blank')}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rating & Review */}
          {request.rating && (
            <Card>
              <CardHeader>
                <CardTitle>Your Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= request.rating!
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                {request.review && <p className="text-sm">{request.review}</p>}
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          {id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messages
                </CardTitle>
                <CardDescription>
                  Communicate with your landlord and vendor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MessageThread requestId={id} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property Info */}
          <Card>
            <CardHeader>
              <CardTitle>Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{request.property?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.property?.address}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.property?.city}, {request.property?.state}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Landlord Info */}
          {request.landlord && (
            <Card>
              <CardHeader>
                <CardTitle>Landlord</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{request.landlord.fullName}</p>
                </div>
                <p className="text-sm text-muted-foreground">{request.landlord.email}</p>
                {request.landlord.phone && (
                  <p className="text-sm text-muted-foreground">{request.landlord.phone}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Vendor Info */}
          {request.vendor && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned Vendor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{request.vendor.fullName}</p>
                </div>
                {request.vendor.company && (
                  <p className="text-sm text-muted-foreground">{request.vendor.company}</p>
                )}
                <p className="text-sm text-muted-foreground">{request.vendor.email}</p>
                {request.vendor.phone && (
                  <p className="text-sm text-muted-foreground">{request.vendor.phone}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${STATUS_COLORS[request.status]}`} />
                  <div>
                    <p className="font-medium">{getStatusLabel(request.status)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(request.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}