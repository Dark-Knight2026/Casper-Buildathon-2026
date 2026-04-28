/**
 * Maintenance Request Create Page
 * Tenant form to submit new maintenance requests
 */

import { useState } from 'react';
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
import type { IssueType, Priority, MaintenanceRequest } from '@/services/maintenanceService';

const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: 'plumbing',     label: 'Plumbing'     },
  { value: 'electrical',  label: 'Electrical'   },
  { value: 'hvac',        label: 'HVAC'          },
  { value: 'appliance',   label: 'Appliance'    },
  { value: 'structural',  label: 'Structural'   },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'other',       label: 'Other'        },
];

const PRIORITIES: { value: Priority; label: string; description: string }[] = [
  { value: 'low',       label: 'Low',       description: 'Can wait, no immediate impact'       },
  { value: 'medium',    label: 'Medium',    description: 'Should be addressed soon'            },
  { value: 'high',      label: 'High',      description: 'Needs prompt attention'              },
  { value: 'emergency', label: 'Emergency', description: 'Immediate safety or security concern' },
];

// TODO: replace with GET /api/v1/properties?tenantId=me when backend is ready
const MOCK_PROPERTIES = [
  { id: 'mock-prop-1', title: '123 Demo Street', address: '123 Demo Street, New York, NY 10001', landlordId: 'mock-landlord-1' },
  { id: 'mock-prop-2', title: '456 Park Avenue',  address: '456 Park Avenue, Brooklyn, NY 11201', landlordId: 'mock-landlord-2' },
];

const requestSchema = z.object({
  propertyId:          z.string().min(1, 'Please select a property'),
  issueType:           z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'other']),
  priority:            z.enum(['low', 'medium', 'high', 'emergency']),
  title:               z.string().min(5, 'Title must be at least 5 characters'),
  description:         z.string().min(20, 'Description must be at least 20 characters'),
  preferredAccessTime: z.string().optional(),
  permissionToEnter:   z.boolean(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function MaintenanceRequestCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      propertyId:          'mock-prop-1',
      issueType:           'other',
      priority:            'medium',
      title:               '',
      description:         '',
      preferredAccessTime: '',
      permissionToEnter:   false,
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (photos.length + files.length > 5) {
      toast({ title: 'Maximum 5 photos allowed', variant: 'destructive' });
      return;
    }

    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);
    setPhotoPreviews(newPhotos.map(f => URL.createObjectURL(f)));
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // TODO: replace with POST /api/v1/maintenance when backend is ready
  const onSubmit = async (data: RequestFormValues) => {
    setSubmitting(true);
    await new Promise(res => setTimeout(res, 600));

    const property = MOCK_PROPERTIES.find(p => p.id === data.propertyId)!;
    const newId = `mr-${Date.now().toString().slice(-6)}`;

    const newRequest: MaintenanceRequest = {
      id: newId,
      propertyId: data.propertyId,
      tenantId: 'mock-tenant-1',
      landlordId: property.landlordId,
      vendorId: null,
      title: data.title,
      description: data.description,
      issueType: data.issueType,
      priority: data.priority,
      status: 'submitted',
      preferredAccessTime: data.preferredAccessTime ? new Date(data.preferredAccessTime) : null,
      permissionToEnter: data.permissionToEnter,
      estimatedCost: null,
      actualCost: null,
      completedAt: null,
      rating: null,
      review: null,
      photos: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      property: { title: property.title, address: property.address, city: 'New York', state: 'NY' },
    };

    toast({ title: 'Request submitted', description: `Request #${newId.slice(-4)} created successfully` });
    setSubmitting(false);
    navigate(`/tenant/maintenance/${newId}`, { state: { request: newRequest } });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/tenant/maintenance')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Requests
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Submit Maintenance Request</h1>
        <p className="text-muted-foreground mt-1">Report an issue with your property</p>
      </div>

      <Alert className="mb-6 border-red-500 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Emergency?</strong> If you have an immediate safety concern (gas leak, fire, flooding),
          call emergency services (911) first, then contact your landlord directly.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>Provide information about the maintenance issue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='pr-2'>Property</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MOCK_PROPERTIES.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title} — {p.address}</SelectItem>
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
                      <FormLabel className='pr-2'>Issue Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ISSUE_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                      <FormLabel className='pr-2'>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORITIES.map(p => (
                            <SelectItem key={p.value} value={p.value}>
                              <div>
                                <div className="font-medium">{p.label}</div>
                                <div className="text-xs text-muted-foreground">{p.description}</div>
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
                    <FormDescription>Brief description of the issue</FormDescription>
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
                        placeholder="Describe the issue in detail, including when it started and what you've observed..."
                        rows={5}
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
                    <FormDescription>When would you prefer maintenance to access the property?</FormDescription>
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
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Permission to Enter</FormLabel>
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
              <CardDescription>Upload up to 5 photos to help illustrate the issue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img src={preview} alt={`Photo ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
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
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">Upload photos ({photos.length}/5)</p>
                  <Input type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="max-w-xs mx-auto" />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => navigate('/tenant/maintenance')}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
