/**
 * Maintenance Request Create Page
 * Tenant form to submit new maintenance requests
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { maintenanceService, type IssueType, type Priority } from '@/services/maintenanceService';
import { propertyService } from '@/services/propertyService';
import { getCurrentUserId } from '@/lib/supabase/client';
import type { Property } from '@/types/property';

const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'structural', label: 'Structural' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'other', label: 'Other' }
];

const PRIORITIES: { value: Priority; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Can wait, no immediate impact' },
  { value: 'medium', label: 'Medium', description: 'Should be addressed soon' },
  { value: 'high', label: 'High', description: 'Needs prompt attention' },
  { value: 'emergency', label: 'Emergency', description: 'Immediate safety or security concern' }
];

const requestSchema = z.object({
  propertyId: z.string().min(1, 'Please select a property'),
  issueType: z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'emergency']),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  preferredAccessTime: z.string().optional(),
  permissionToEnter: z.boolean()
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function MaintenanceRequestCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      propertyId: '',
      issueType: 'other',
      priority: 'medium',
      title: '',
      description: '',
      preferredAccessTime: '',
      permissionToEnter: false
    }
  });

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      const tenantId = await getCurrentUserId();
      if (!tenantId) return;

      // Get tenant's properties (properties where they have active leases)
      // For now, we'll get all properties - in production, filter by active leases
      const response = await propertyService.getProperties(tenantId, { limit: 100 });
      setProperties(response.properties);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({
        title: 'Error',
        description: 'Failed to load properties',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalPhotos = photos.length + files.length;
    if (totalPhotos > 5) {
      toast({
        title: 'Warning',
        description: 'Maximum 5 photos allowed',
        variant: 'destructive'
      });
      return;
    }

    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);

    const newPreviews = newPhotos.map(file => URL.createObjectURL(file));
    setPhotoPreviews(newPreviews);
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPhotoPreviews(newPreviews);
  };

  const onSubmit = async (data: RequestFormValues) => {
    try {
      setSubmitting(true);
      const tenantId = await getCurrentUserId();
      if (!tenantId) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive'
        });
        return;
      }

      // Get property to find landlord
      const property = properties.find(p => p.id === data.propertyId);
      if (!property) {
        toast({
          title: 'Error',
          description: 'Property not found',
          variant: 'destructive'
        });
        return;
      }

      const request = await maintenanceService.createRequest({
        propertyId: data.propertyId,
        tenantId,
        landlordId: property.landlordId,
        title: data.title,
        description: data.description,
        issueType: data.issueType,
        priority: data.priority,
        preferredAccessTime: data.preferredAccessTime ? new Date(data.preferredAccessTime) : undefined,
        permissionToEnter: data.permissionToEnter,
        photos: photos.length > 0 ? photos : undefined
      });

      toast({
        title: 'Success',
        description: `Maintenance request #${request.id.slice(0, 8)} created successfully`
      });

      navigate(`/tenant/maintenance/${request.id}`);
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create maintenance request',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/tenant/maintenance')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Requests
        </Button>
        <h1 className="text-3xl font-bold">Submit Maintenance Request</h1>
        <p className="text-muted-foreground mt-1">
          Report an issue with your property
        </p>
      </div>

      {/* Emergency Alert */}
      <Alert className="mb-6 border-red-500 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Emergency?</strong> If you have an immediate safety concern (gas leak, fire, flooding, etc.), 
          call emergency services (911) first, then contact your landlord directly.
        </AlertDescription>
      </Alert>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>
                Provide information about the maintenance issue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.title} - {property.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="issueType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ISSUE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORITIES.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              <div>
                                <div className="font-medium">{priority.label}</div>
                                <div className="text-xs text-muted-foreground">{priority.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Leaking faucet in kitchen" {...field} />
                    </FormControl>
                    <FormDescription>
                      Brief description of the issue
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the issue in detail, including when it started, what you've observed, and any relevant information..."
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredAccessTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Access Time (Optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>
                      When would you prefer maintenance to access the property?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permissionToEnter"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Permission to Enter
                      </FormLabel>
                      <FormDescription>
                        I give permission for maintenance personnel to enter my unit if I'm not home
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos (Optional)</CardTitle>
              <CardDescription>
                Upload up to 5 photos to help illustrate the issue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < 5 && (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload photos ({photos.length}/5)
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="max-w-xs mx-auto"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/tenant/maintenance')}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}