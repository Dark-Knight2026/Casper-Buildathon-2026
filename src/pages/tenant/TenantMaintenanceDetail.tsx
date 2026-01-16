import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { maintenanceService } from '@/services/maintenanceService';
import MaintenanceChat from '@/components/maintenance/MaintenanceChat';
import { ArrowLeft, Star, Loader2 } from 'lucide-react';

interface RequestProperties {
  address: string;
  city: string;
  state: string;
  landlord_id: string;
}

interface RequestVendor {
  name: string;
  company: string;
  phone: string;
  email: string;
}

interface RequestWithDetails {
  id: string;
  tenant_id: string;
  property_id: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  photos: string[];
  preferred_time_slots: string[];
  assigned_to: string | null;
  vendor_id: string | null;
  estimated_completion_date: string | null;
  actual_completion_date: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  notes: string | null;
  rating: number | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
  properties: RequestProperties;
  tenants: {
    full_name: string;
    email: string;
    phone: string;
  };
  vendors?: RequestVendor;
}

export default function TenantMaintenanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<RequestWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const loadRequest = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await maintenanceService.getRequestById(id);
      setRequest(data as RequestWithDetails);
      if (data.rating) {
        setRating(data.rating);
        setFeedback(data.feedback || '');
      }
    } catch (error) {
      console.error('Error loading request:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadRequest();
    }
  }, [id, loadRequest]);

  const handleSubmitFeedback = async () => {
    if (!id || rating === 0) return;

    setSubmittingFeedback(true);
    try {
      await maintenanceService.submitFeedback(id, rating, feedback);
      await loadRequest();
      alert('Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading maintenance request...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-semibold mb-2">Request not found</h3>
            <Button onClick={() => navigate('/tenant/maintenance')}>
              Back to Maintenance
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const properties = request.properties;
  const vendors = request.vendors;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/tenant/maintenance')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Maintenance Request Details</h1>
          <p className="text-muted-foreground">Request #{request.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Property</p>
              <p className="text-sm">
                {properties.address}, {properties.city}, {properties.state}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <Badge variant="outline" className="mt-1">
                  {request.category}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Priority</p>
                <Badge
                  variant={
                    request.priority === 'emergency'
                      ? 'destructive'
                      : request.priority === 'high'
                      ? 'default'
                      : 'secondary'
                  }
                  className="mt-1"
                >
                  {request.priority}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge
                variant={
                  request.status === 'completed'
                    ? 'default'
                    : request.status === 'in-progress' || request.status === 'assigned'
                    ? 'secondary'
                    : 'outline'
                }
                className="mt-1"
              >
                {request.status}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm mt-1">{request.description}</p>
            </div>

            {request.photos && request.photos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Photos</p>
                <div className="grid grid-cols-2 gap-2">
                  {request.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Issue ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80"
                      onClick={() => window.open(photo, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}

            {request.preferred_time_slots && request.preferred_time_slots.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Preferred Time Slots</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {request.preferred_time_slots.map((slot, index) => (
                    <Badge key={index} variant="outline">
                      {slot}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium">{new Date(request.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">{new Date(request.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {vendors && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned Vendor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-sm">{vendors.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company</p>
                  <p className="text-sm">{vendors.company}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{vendors.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{vendors.email}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {request.estimated_completion_date && (
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expected Completion</p>
                  <p className="text-sm">
                    {new Date(request.estimated_completion_date).toLocaleDateString()}
                  </p>
                </div>
                {request.actual_completion_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed On</p>
                    <p className="text-sm">
                      {new Date(request.actual_completion_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(request.estimated_cost || request.actual_cost) && (
            <Card>
              <CardHeader>
                <CardTitle>Cost Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {request.estimated_cost && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estimated Cost</p>
                    <p className="text-sm">${request.estimated_cost.toLocaleString()}</p>
                  </div>
                )}
                {request.actual_cost && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Actual Cost</p>
                    <p className="text-sm font-bold text-lg">
                      ${request.actual_cost.toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {request.status === 'completed' && !request.rating && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">Rate This Service</CardTitle>
                <CardDescription className="text-blue-700">
                  Help us improve by rating your experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                              ? 'fill-yellow-500 text-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="feedback">Feedback (Optional)</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Share your experience..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleSubmitFeedback}
                  disabled={rating === 0 || submittingFeedback}
                  className="w-full"
                >
                  {submittingFeedback ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {request.rating && (
            <Card>
              <CardHeader>
                <CardTitle>Your Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rating</p>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= request.rating!
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {request.feedback && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Comments</p>
                    <p className="text-sm mt-1">{request.feedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {id && <MaintenanceChat requestId={id} />}
    </div>
  );
}