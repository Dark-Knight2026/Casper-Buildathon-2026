/**
 * Tenant Maintenance Page
 * Submit and track maintenance requests with photo upload
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Plus,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { leaseManagementService } from '@/services/leaseManagementService';
import { useToast } from '@/hooks/use-toast';
import type { LeaseAgreement } from '@/types/lease';

interface MaintenanceRequest {
  id: string;
  leaseId: string;
  propertyAddress: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  category: string;
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
}

export function TenantMaintenance() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeLeases, setActiveLeases] = useState<LeaseAgreement[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    leaseId: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'general'
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const loadActiveLeases = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth/login');
        return;
      }

      const leases = await leaseManagementService.getLeases({
        tenantId: user.id,
        status: ['active']
      });

      setActiveLeases(leases);
      
      if (leases.length > 0) {
        setFormData(prev => ({ ...prev, leaseId: leases[0].id }));
      }
    } catch (err) {
      console.error('Error loading leases:', err);
    }
  }, [navigate]);

  const loadMaintenanceRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth/login');
        return;
      }

      // Get all leases for the tenant
      const leases = await leaseManagementService.getLeases({
        tenantId: user.id
      });

      // Mock maintenance requests (replace with actual API call)
      const mockRequests: MaintenanceRequest[] = [];
      
      setRequests(mockRequests);
    } catch (err) {
      console.error('Error loading maintenance requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load maintenance requests');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadMaintenanceRequests();
    loadActiveLeases();
  }, [loadMaintenanceRequests, loadActiveLeases]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (photos.length + files.length > 5) {
      toast({
        title: 'Too many photos',
        description: 'You can upload a maximum of 5 photos',
        variant: 'destructive'
      });
      return;
    }

    setPhotos(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.leaseId || !formData.title || !formData.description) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload photos to storage
      const photoUrls: string[] = [];
      
      for (const photo of photos) {
        const fileName = `maintenance/${Date.now()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, photo);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        photoUrls.push(publicUrl);
      }

      // Create maintenance request (mock implementation)
      const newRequest: MaintenanceRequest = {
        id: `req-${Date.now()}`,
        leaseId: formData.leaseId,
        propertyAddress: activeLeases.find(l => l.id === formData.leaseId)?.propertyAddress || '',
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: 'pending',
        category: formData.category,
        photos: photoUrls,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setRequests(prev => [newRequest, ...prev]);

      toast({
        title: 'Request submitted',
        description: 'Your maintenance request has been submitted successfully'
      });

      // Reset form
      setFormData({
        leaseId: activeLeases[0]?.id || '',
        title: '',
        description: '',
        priority: 'medium',
        category: 'general'
      });
      setPhotos([]);
      setPhotoPreviews([]);
      setShowNewRequest(false);
    } catch (err) {
      console.error('Error submitting request:', err);
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Failed to submit maintenance request',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="h-3 w-3" />
      },
      'in-progress': {
        color: 'bg-blue-100 text-blue-800',
        icon: <Wrench className="h-3 w-3" />
      },
      completed: {
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-3 w-3" />
      },
      cancelled: {
        color: 'bg-gray-100 text-gray-800',
        icon: <XCircle className="h-3 w-3" />
      }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {status.replace('-', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant="outline" className={priorityColors[priority]}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Maintenance Requests</h1>
            <p className="text-gray-600">Submit and track maintenance requests</p>
          </div>
          <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit Maintenance Request</DialogTitle>
                <DialogDescription>
                  Describe the issue and upload photos if applicable
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="lease">Property *</Label>
                    <Select
                      value={formData.leaseId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, leaseId: value }))}
                      disabled={activeLeases.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeLeases.map(lease => (
                          <SelectItem key={lease.id} value={lease.id}>
                            {lease.propertyAddress}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Maintenance</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="appliance">Appliance</SelectItem>
                        <SelectItem value="structural">Structural</SelectItem>
                        <SelectItem value="pest">Pest Control</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority *</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' | 'urgent' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Can wait</SelectItem>
                        <SelectItem value="medium">Medium - Should be addressed soon</SelectItem>
                        <SelectItem value="high">High - Needs attention</SelectItem>
                        <SelectItem value="urgent">Urgent - Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Issue Title *</Label>
                    <Input
                      id="title"
                      placeholder="Brief description of the issue"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Detailed Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Provide detailed information about the issue..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={5}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Photos (Optional, max 5)</Label>
                    <div className="border-2 border-dashed rounded-lg p-4">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoChange}
                        className="hidden"
                        id="photo-upload"
                        disabled={photos.length >= 5}
                      />
                      <label
                        htmlFor="photo-upload"
                        className={`flex flex-col items-center justify-center cursor-pointer ${
                          photos.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload photos ({photos.length}/5)
                        </p>
                      </label>
                    </div>

                    {photoPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {photoPreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => removePhoto(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewRequest(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Maintenance Requests</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              You haven't submitted any maintenance requests yet
            </p>
            <Button onClick={() => setShowNewRequest(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Submit First Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{request.title}</CardTitle>
                      {getStatusBadge(request.status)}
                      {getPriorityBadge(request.priority)}
                    </div>
                    <CardDescription>{request.propertyAddress}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">{request.description}</p>
                </div>

                {request.photos && request.photos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Attached Photos</p>
                    <div className="grid grid-cols-4 gap-2">
                      {request.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                    <Badge variant="outline">{request.category}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}