/**
 * Maintenance Request Detail Page (Landlord View)
 * Manage and update maintenance requests
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, MapPin, MessageSquare, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { maintenanceService, type MaintenanceRequest, type RequestStatus, type Priority } from '@/services/maintenanceService';
import { MessageThread } from '@/components/maintenance/MessageThread';
import { supabase } from '@/lib/supabase/client';

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

interface Vendor {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  company: string | null;
}

export default function MaintenanceRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>('submitted');
  const [internalNotes, setInternalNotes] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [updating, setUpdating] = useState(false);

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
        navigate('/landlord/maintenance');
        return;
      }

      setRequest(data);
      setSelectedStatus(data.status);
      setSelectedVendor(data.vendorId || '');
      setEstimatedCost(data.estimatedCost?.toString() || '');
      setActualCost(data.actualCost?.toString() || '');
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

  const loadVendors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone, company')
        .eq('role', 'vendor')
        .eq('is_active', true);

      if (error) {
        console.error('Error loading vendors:', error);
        return;
      }

      setVendors(data.map(v => ({
        id: v.id,
        fullName: v.full_name,
        email: v.email,
        phone: v.phone,
        company: v.company
      })));
    } catch (error) {
      console.error('Error in loadVendors:', error);
    }
  }, []);

  useEffect(() => {
    loadRequest();
    loadVendors();
  }, [loadRequest, loadVendors]);

  const handleAssignVendor = async () => {
    if (!id || !selectedVendor) return;

    try {
      setUpdating(true);
      await maintenanceService.assignVendor(id, selectedVendor);

      toast({
        title: 'Success',
        description: 'Vendor assigned successfully'
      });

      loadRequest();
    } catch (error) {
      console.error('Error assigning vendor:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign vendor',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!id) return;

    try {
      setUpdating(true);
      await maintenanceService.updateStatus(id, selectedStatus);

      toast({
        title: 'Success',
        description: 'Status updated successfully'
      });

      loadRequest();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
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
      <div className="container mx-auto py-8 px-4 max-w-6xl">
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
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/landlord/maintenance')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
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

          {/* Management Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Management Actions</CardTitle>
              <CardDescription>
                Assign vendor and update request status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Assign Vendor</Label>
                <div className="flex gap-2">
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.fullName} {vendor.company && `(${vendor.company})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssignVendor}
                    disabled={updating || !selectedVendor || selectedVendor === request.vendorId}
                  >
                    Assign
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Update Status</Label>
                <div className="flex gap-2">
                  <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as RequestStatus)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={updating || selectedStatus === request.status}
                  >
                    Update
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estimated Cost ($)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Actual Cost ($)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  placeholder="Add internal notes (visible only to landlord)..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          {id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messages
                </CardTitle>
                <CardDescription>
                  Communicate with tenant and vendor
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

          {/* Tenant Info */}
          {request.tenant && (
            <Card>
              <CardHeader>
                <CardTitle>Tenant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{request.tenant.fullName}</p>
                </div>
                <p className="text-sm text-muted-foreground">{request.tenant.email}</p>
                {request.tenant.phone && (
                  <p className="text-sm text-muted-foreground">{request.tenant.phone}</p>
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

          {/* Rating */}
          {request.rating && (
            <Card>
              <CardHeader>
                <CardTitle>Tenant Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-lg ${
                        star <= request.rating!
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {request.review && <p className="text-sm">{request.review}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}