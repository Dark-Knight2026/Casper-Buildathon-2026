/**
 * Maintenance Request Detail Page (Tenant View)
 * Displays detailed information about a maintenance request
 */

import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, User, MapPin, Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { MaintenanceRequest, RequestStatus, Priority } from '@/services/maintenanceService';

const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted:   'bg-blue-100 text-blue-800',
  assigned:    'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed:   'bg-green-100 text-green-800',
  closed:      'bg-secondary text-secondary-foreground',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low:       'bg-secondary text-secondary-foreground',
  medium:    'bg-blue-100 text-blue-800',
  high:      'bg-orange-100 text-orange-800',
  emergency: 'bg-red-100 text-red-800',
};

// Fallback mock — used when page is accessed directly (e.g. page refresh)
// TODO: remove when GET /api/v1/maintenance/:id is ready
const MOCK_FALLBACK: MaintenanceRequest = {
  id: 'mr-001',
  propertyId: 'mock-prop-1',
  tenantId: 'mock-tenant-1',
  landlordId: 'mock-landlord-1',
  vendorId: 'vendor-1',
  title: 'Leaking kitchen faucet',
  description: 'The kitchen faucet has been dripping constantly for the past week. Water drips every few seconds even when fully closed.',
  issueType: 'plumbing',
  priority: 'medium',
  status: 'in_progress',
  preferredAccessTime: new Date('2026-04-10T10:00:00'),
  permissionToEnter: true,
  estimatedCost: 120,
  actualCost: null,
  completedAt: null,
  rating: null,
  review: null,
  photos: [],
  createdAt: new Date('2026-04-01'),
  updatedAt: new Date('2026-04-03'),
  property: { title: '123 Demo Street', address: '123 Demo Street', city: 'New York', state: 'NY' },
  landlord: { fullName: 'John Smith', email: 'landlord@demo.com', phone: '+1 (555) 100-2000' },
  vendor: { fullName: 'Mike Johnson', email: 'vendor@fix.com', phone: '+1 (555) 300-4000' } as MaintenanceRequest['vendor'],
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(date));

const getStatusLabel = (status: RequestStatus) =>
  status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

const getPriorityLabel = (priority: Priority) =>
  priority.charAt(0).toUpperCase() + priority.slice(1);

export default function MaintenanceRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Use request passed via navigation state, fallback to mock if accessed directly
  // TODO: replace fallback with GET /api/v1/maintenance/:id when backend is ready
  const request: MaintenanceRequest = (location.state?.request as MaintenanceRequest) ?? MOCK_FALLBACK;

  const [rating, setRating] = useState(request.rating ?? 0);
  const [review, setReview]   = useState(request.review ?? '');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [localRating, setLocalRating] = useState<number | null>(request.rating);

  // TODO: wire to PATCH /api/v1/maintenance/:id/rating when backend is ready
  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast({ title: 'Please select a rating', variant: 'destructive' });
      return;
    }
    setSubmittingReview(true);
    await new Promise(res => setTimeout(res, 500));
    setLocalRating(rating);
    toast({ title: 'Thank you for your feedback!' });
    setShowReviewDialog(false);
    setSubmittingReview(false);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/tenant/maintenance')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Requests
        </Button>

        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{request.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={STATUS_COLORS[request.status]}>
                {getStatusLabel(request.status)}
              </Badge>
              <Badge className={PRIORITY_COLORS[request.priority]}>
                {getPriorityLabel(request.priority)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Request #{(id ?? request.id).slice(-4)}
              </span>
            </div>
          </div>

          {request.status === 'completed' && !localRating && (
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
                  <DialogDescription>How satisfied are you with the maintenance service?</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Rating</Label>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                          <Star className={`h-8 w-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Review (Optional)</Label>
                    <Textarea
                      placeholder="Share your experience..."
                      value={review}
                      onChange={e => setReview(e.target.value)}
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Cancel</Button>
                  <Button onClick={handleSubmitReview} disabled={submittingReview || rating === 0}>
                    {submittingReview ? 'Submitting…' : 'Submit Review'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">

          <Card>
            <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground">{request.description}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Issue Type</p>
                  <p className="capitalize text-foreground">{request.issueType.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Created</p>
                  <p className="text-foreground">{formatDate(request.createdAt)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Permission to Enter</p>
                  <p className="text-foreground">{request.permissionToEnter ? 'Yes' : 'No'}</p>
                </div>
                {request.estimatedCost != null && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Estimated Cost</p>
                    <p className="text-foreground">${request.estimatedCost}</p>
                  </div>
                )}
                {request.actualCost != null && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Actual Cost</p>
                    <p className="text-foreground">${request.actualCost}</p>
                  </div>
                )}
              </div>

              {request.preferredAccessTime && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Preferred Access Time</p>
                    <p className="text-sm text-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {formatDate(request.preferredAccessTime)}
                    </p>
                  </div>
                </>
              )}

              {request.completedAt && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Completed</p>
                    <p className="text-sm text-foreground">{formatDate(request.completedAt)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          {request.photos && request.photos.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {request.photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(photo, '_blank')}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rating */}
          {localRating != null && (
            <Card>
              <CardHeader><CardTitle>Your Review</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} className={`h-5 w-5 ${star <= localRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  ))}
                </div>
                {review && <p className="text-sm text-foreground">{review}</p>}
              </CardContent>
            </Card>
          )}

          {/* Messages — placeholder until backend is ready */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Messages
              </CardTitle>
              <CardDescription>Communicate with your landlord and vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No messages yet</p>
                <p className="text-xs text-muted-foreground">
                  Messaging will be available after backend integration
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Property */}
          <Card>
            <CardHeader><CardTitle>Property</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{request.property?.title}</p>
                  <p className="text-sm text-muted-foreground">{request.property?.address}</p>
                  <p className="text-sm text-muted-foreground">{request.property?.city}, {request.property?.state}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Landlord */}
          {request.landlord && (
            <Card>
              <CardHeader><CardTitle>Landlord</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="font-medium text-foreground">{request.landlord.fullName}</p>
                </div>
                <p className="text-sm text-muted-foreground">{request.landlord.email}</p>
                {request.landlord.phone && (
                  <p className="text-sm text-muted-foreground">{request.landlord.phone}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Vendor */}
          {request.vendor && (
            <Card>
              <CardHeader><CardTitle>Assigned Vendor</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="font-medium text-foreground">{request.vendor.fullName}</p>
                </div>
                {(request.vendor as any).company && (
                  <p className="text-sm text-muted-foreground">{(request.vendor as any).company}</p>
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
            <CardHeader><CardTitle>Status Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${STATUS_COLORS[request.status].split(' ')[0]}`} />
                <div>
                  <p className="font-medium text-foreground">{getStatusLabel(request.status)}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(request.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
