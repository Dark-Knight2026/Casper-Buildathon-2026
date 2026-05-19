/**
 * Property Create Page
 * Multi-step form wizard for creating a new property
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, ArrowRight, Check, Home, MapPin, Sparkles, Camera, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ALL_AMENITIES, UTILITIES, LEASE_TERMS, PET_POLICIES, US_STATES, type PropertyType, type SurroundingCategory } from '@/types/property';

const PROPERTY_TYPES: PropertyType[] = ['Apartment', 'House', 'Condo', 'Townhouse', 'Studio', 'Loft'];

// Tenant-facing nearby categories. Free-text place name + per-place distance;
// category is constrained to this list so the tenant surrounding-area filter
// keeps working.
const SURROUNDING_CATEGORIES: SurroundingCategory[] = [
  'hospital', 'school', 'gym', 'airport', 'park', 'grocery', 'transit',
];

// Form validation schema
const propertyFormSchema = z.object({
  // Step 1: Basic Info
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  propertyType: z.enum(['Apartment', 'House', 'Condo', 'Townhouse', 'Studio', 'Loft']),
  
  // Step 2: Details
  bedrooms: z.coerce.number().min(0, 'Bedrooms must be 0 or more'),
  bathrooms: z.coerce.number().min(0.5, 'Bathrooms must be at least 0.5').step(0.5),
  squareFeet: z.coerce.number().min(100, 'Square feet must be at least 100').nullable(),
  rent: z.coerce.number().min(1, 'Rent must be greater than 0'),
  securityDeposit: z.coerce.number().min(0, 'Security deposit must be 0 or more'),
  availableDate: z.string().min(1, 'Available date is required'),
  leaseTerms: z.array(z.string()).min(1, 'Select at least one lease term'),
  
  // Step 3: Amenities
  amenities: z.array(z.string()),
  utilitiesIncluded: z.array(z.string()),
  petPolicy: z.string(),
  surroundingArea: z.array(z.object({
    category: z.enum(['hospital', 'school', 'gym', 'airport', 'park', 'grocery', 'transit']),
    name: z.string().min(1, 'Place name is required'),
    distanceMiles: z.coerce.number().min(0, 'Distance must be 0 or more'),
    note: z.string().optional(),
  })),

  // Status
  status: z.enum(['active', 'pending', 'rented', 'inactive'])
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

const STEPS = [
  { id: 1, name: 'Basic Info', icon: Home },
  { id: 2, name: 'Details', icon: MapPin },
  { id: 3, name: 'Amenities', icon: Sparkles },
  { id: 4, name: 'Photos', icon: Camera }
];

export default function PropertyCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: '',
      description: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      propertyType: 'Apartment',
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: null,
      rent: 0,
      securityDeposit: 0,
      availableDate: new Date().toISOString().split('T')[0],
      leaseTerms: ['1 Year'],
      amenities: [],
      utilitiesIncluded: [],
      petPolicy: 'No Pets',
      surroundingArea: [],
      status: 'active'
    }
  });

  const { fields: poiFields, append: appendPoi, remove: removePoi } = useFieldArray({
    control: form.control,
    name: 'surroundingArea',
  });

  // Custom amenities live in the same `amenities` string[]; anything not in
  // ALL_AMENITIES is treated as a landlord-added custom entry.
  const [customAmenity, setCustomAmenity] = useState('');
  const customAmenities = form.watch('amenities').filter(
    (a) => !ALL_AMENITIES.some((known) => known === a),
  );
  const addCustomAmenity = () => {
    const value = customAmenity.trim();
    if (!value) return;
    const current = form.getValues('amenities');
    if (!current.some((a) => a === value)) {
      form.setValue('amenities', [...current, value], { shouldValidate: true, shouldDirty: true });
    }
    setCustomAmenity('');
  };
  const removeCustomAmenity = (value: string) => {
    form.setValue(
      'amenities',
      form.getValues('amenities').filter((a) => a !== value),
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const handleNext = async () => {
    let fieldsToValidate: (keyof PropertyFormValues)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['title', 'description', 'address', 'city', 'state', 'zipCode', 'propertyType'];
        break;
      case 2:
        fieldsToValidate = ['bedrooms', 'bathrooms', 'squareFeet', 'rent', 'securityDeposit', 'availableDate', 'leaseTerms'];
        break;
      case 3:
        fieldsToValidate = ['amenities', 'utilitiesIncluded', 'petPolicy', 'surroundingArea'];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 10 images
    const newFiles = [...uploadedImages, ...files].slice(0, 10);
    setUploadedImages(newFiles);

    // Generate previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const handleRemoveImage = (index: number) => {
    const newFiles = uploadedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setUploadedImages(newFiles);
    setImagePreviews(newPreviews);
  };

  const onSubmit = (data: PropertyFormValues) => {
    setUploading(true);
    // TODO(BE): replace with POST /api/v1/landlord/properties (+ image
    // upload) — BE-blocked (LeaseFi MVP spec §3.3). Mock the create so the
    // landlord happy-path works on localhost without Supabase (same
    // intentional demo pattern as LandlordDashboard / landlordMockData).
    setTimeout(() => {
      setUploading(false);
      toast({
        title: 'Property created',
        description:
          uploadedImages.length > 0
            ? `"${data.title}" saved with ${uploadedImages.length} photo(s).`
            : `"${data.title}" saved.`,
      });
      navigate('/landlord/properties');
    }, 600);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/landlord/properties')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
        <h1 className="text-3xl font-bold">Add New Property</h1>
        <p className="text-muted-foreground mt-1">
          Fill in the details to list your property
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isCompleted
                        ? 'bg-primary border-primary text-primary-foreground'
                        : isActive
                        ? 'border-primary text-primary'
                        : 'border-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={`text-xs mt-2 ${
                      isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 self-start mt-5 transition-colors ${
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the basic details about your property
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1 space-y-1">
                      <FormLabel >Property Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Modern 2BR Apartment in Downtown" {...field} />
                      </FormControl>
                      <FormDescription>
                        A catchy title that describes your property
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1 space-y-1">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your property in detail..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Highlight key features and nearby amenities
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1 space-y-1">
                      <FormLabel>Property Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="data-[size=default]:h-10 min-h-10! w-full rounded-md">
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROPERTY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                  name="address"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1 space-y-1">
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St, Apt 4B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1 space-y-1">
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Los Angeles" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1 space-y-1">
                        <FormLabel>State</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="data-[size=default]:h-10 min-h-10! w-full rounded-md">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
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
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1 space-y-1">
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="90001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
                <CardDescription>
                  Specify the details and pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1 space-y-1">
                        <FormLabel>Bedrooms</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1 space-y-1">
                        <FormLabel>Bathrooms</FormLabel>
                        <FormControl>
                          <Input type="number" min="0.5" step="0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="squareFeet"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1 space-y-1">
                        <FormLabel>Square Feet</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="100"
                            placeholder="1000"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rent"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1 space-y-1">
                        <FormLabel>Monthly Rent ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" placeholder="2000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="securityDeposit"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1 space-y-1">
                        <FormLabel>Security Deposit ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="2000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="availableDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1 space-y-1">
                      <FormLabel>Available from</FormLabel>
                      <FormControl>
                        {/* Single move-in availability date; cannot be in the past. */}
                        <Input type="date" min={new Date().toISOString().split('T')[0]} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leaseTerms"
                  render={() => (
                    <FormItem className="flex flex-col gap-1 space-y-1">
                      <FormLabel>Lease Terms (select all that apply)</FormLabel>
                      <div className="grid grid-cols-3 gap-3">
                        {LEASE_TERMS.map((term) => (
                          <FormField
                            key={term}
                            control={form.control}
                            name="leaseTerms"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-1">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(term)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, term])
                                        : field.onChange(field.value?.filter((value) => value !== term));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {term}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Amenities */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Amenities & Features</CardTitle>
                <CardDescription>
                  Select all amenities and features available
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="amenities"
                  render={() => (
                    <FormItem className="flex flex-col gap-1 space-y-0">
                      <FormLabel>Amenities</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {ALL_AMENITIES.map((amenity) => (
                          <FormField
                            key={amenity}
                            control={form.control}
                            name="amenities"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(amenity)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, amenity])
                                        : field.onChange(field.value?.filter((value) => value !== amenity));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {amenity}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-1">
                  <FormLabel>Add a custom amenity</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      value={customAmenity}
                      onChange={(e) => setCustomAmenity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomAmenity();
                        }
                      }}
                      placeholder="Something not in the list (e.g., Rooftop terrace)"
                    />
                    <Button type="button" variant="outline" onClick={addCustomAmenity} className='min-h-10!'>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add
                    </Button>
                  </div>
                  {customAmenities.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {customAmenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                        >
                          {amenity}
                          <button
                            type="button"
                            onClick={() => removeCustomAmenity(amenity)}
                            aria-label={`Remove ${amenity}`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="utilitiesIncluded"
                  render={() => (
                    <FormItem className="flex flex-col gap-1 space-y-0">
                      <FormLabel>Utilities Included</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {UTILITIES.map((utility) => (
                          <FormField
                            key={utility}
                            control={form.control}
                            name="utilitiesIncluded"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(utility)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, utility])
                                        : field.onChange(field.value?.filter((value) => value !== utility));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {utility}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="petPolicy"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1 space-y-0">
                      <FormLabel>Pet Policy</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="data-[size=default]:h-10 min-h-10! w-full rounded-md">
                            <SelectValue placeholder="Select pet policy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PET_POLICIES.map((policy) => (
                            <SelectItem key={policy} value={policy}>
                              {policy}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pets / Furnished / Parking are captured via the Amenities
                    list above (Pet-Friendly / Furnished / Parking) — no
                    separate checkboxes, to avoid duplicate/conflicting input. */}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel>Nearby places</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendPoi({ category: 'park', name: '', distanceMiles: 0 })}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add place
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    What's nearby and how far it is — shown to tenants in surrounding-area search.
                  </p>
                  {poiFields.length === 0 && (
                    <p className="text-sm text-muted-foreground">No nearby places added yet.</p>
                  )}
                  {poiFields.map((poi, index) => (
                    <div
                      key={poi.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_8rem_auto] gap-2 items-start border rounded-md p-3"
                    >
                      <FormField
                        control={form.control}
                        name={`surroundingArea.${index}.category`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col gap-1 space-y-0">
                            <FormLabel className="sr-only">Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="data-[size=default]:h-10 min-h-10! w-full rounded-md capitalize">
                                  <SelectValue placeholder="Category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SURROUNDING_CATEGORIES.map((category) => (
                                  <SelectItem key={category} value={category} className="capitalize">
                                    {category}
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
                        name={`surroundingArea.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col gap-1 space-y-0">
                            <FormLabel className="sr-only">Place name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Lincoln High School" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`surroundingArea.${index}.distanceMiles`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col gap-1 space-y-0">
                            <FormLabel className="sr-only">Distance (miles)</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-1.5">
                                <Input type="number" min={0} step={0.1} placeholder="0" {...field} />
                                <span className="text-sm text-muted-foreground">mi</span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePoi(index)}
                        aria-label="Remove place"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Photos */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Property Photos</CardTitle>
                <CardDescription>
                  Upload up to 10 photos of your property (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Click to upload or drag and drop
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="max-w-xs mx-auto"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG, GIF up to 10MB each
                  </p>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                        >
                          Remove
                        </Button>
                        {index === 0 && (
                          <Badge className="absolute bottom-2 left-2">Primary</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Creating...' : 'Create Property'}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}