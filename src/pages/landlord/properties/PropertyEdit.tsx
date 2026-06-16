/**
 * Property Edit Page
 * Edits a listing's offer (title, description, terms, amenities, media). The
 * underlying physical property is deduplicated and shared, so its attributes
 * are shown read-only — there is no property-update endpoint.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ListingLifecycle } from '@/components/listing/ListingLifecycle';
import { getListing, updateListing } from '@/services/listingService';
import { uploadMedia } from '@/services/listingMediaService';
import { formatPropertyType, formatFullAddress } from '@/lib/listingDisplay';
import { logger } from '@/utils/logger';
import { ApiClient } from '@/lib/api-client';
import {
  ALL_AMENITIES,
  UTILITIES,
  LEASE_TERMS,
  PET_POLICIES,
} from '@/types/property';
import type { RentLtrTerms } from '@/types/listingContract';

const listingFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  availableDate: z.string().min(1, 'Available date is required'),
  rent: z.coerce.number().min(1, 'Rent must be greater than 0'),
  securityDeposit: z.coerce
    .number()
    .min(0, 'Security deposit must be 0 or more'),
  leaseTerms: z.array(z.string()).min(1, 'Select at least one lease term'),
  amenities: z.array(z.string()),
  utilitiesIncluded: z.array(z.string()),
  petPolicy: z.string(),
  furnished: z.boolean(),
});

type ListingFormValues = z.infer<typeof listingFormSchema>;

export default function PropertyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const {
    data: listing,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id as string),
    enabled: !!id,
  });

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      availableDate: '',
      rent: 0,
      securityDeposit: 0,
      leaseTerms: [],
      amenities: [],
      utilitiesIncluded: [],
      petPolicy: 'No Pets',
      furnished: false,
    },
  });

  const { reset } = form;
  // Populate the form once the listing resolves.
  useEffect(() => {
    if (!listing) return;
    const terms =
      listing.intent === 'rent_ltr' ? (listing.terms as RentLtrTerms) : null;
    reset({
      title: listing.title,
      description: listing.description,
      availableDate: listing.availableDate
        ? listing.availableDate.slice(0, 10)
        : '',
      rent: terms?.rentMonthly ?? 0,
      securityDeposit: terms?.securityDeposit ?? 0,
      leaseTerms: terms?.leaseTermsOffered ?? [],
      amenities: listing.amenities,
      utilitiesIncluded: listing.utilitiesIncluded,
      petPolicy: listing.petPolicy ?? 'No Pets',
      furnished: terms?.furnished ?? false,
    });
  }, [listing, reset]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newFiles = [...uploadedImages, ...files];
    setUploadedImages(newFiles);
    setImagePreviews(newFiles.map((file) => URL.createObjectURL(file)));
  };

  const handleRemoveNewImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ListingFormValues) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateListing(id, {
        title: data.title,
        description: data.description,
        availableDate: data.availableDate,
        amenities: data.amenities,
        utilitiesIncluded: data.utilitiesIncluded,
        petPolicy: data.petPolicy,
        terms: {
          rentMonthly: data.rent,
          securityDeposit: data.securityDeposit,
          leaseTermsOffered: data.leaseTerms,
          furnished: data.furnished,
        },
      });

      if (uploadedImages.length > 0) {
        await uploadMedia(id, uploadedImages);
      }

      toast({ title: 'Listing updated' });
      navigate(`/landlord/properties/${id}`);
    } catch (error) {
      logger.error('Error updating listing:', error);
      toast({
        title: 'Could not update the listing',
        description: ApiClient.handleError(error),
        variant: 'destructive',
      });
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/landlord/properties')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Listing not found</h3>
          <p className="text-muted-foreground">
            We couldn't load this listing. It may have been removed.
          </p>
        </Card>
      </div>
    );
  }

  const asset = listing.property;
  const existingMedia = [...listing.media].sort(
    (a, b) => a.position - b.position
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/landlord/properties/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Property
        </Button>
        <h1 className="text-3xl font-bold">Edit Listing</h1>
        <p className="text-muted-foreground mt-1">
          Update your listing details
        </p>
      </div>

      <div className="space-y-6">
        {/* Lifecycle */}
        <ListingLifecycle listing={listing} />

        {/* Property (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Property</CardTitle>
            <CardDescription>
              Physical details are fixed for this property and can't be edited
              from a listing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="md:col-span-3">
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium">{formatFullAddress(asset)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">
                  {asset ? formatPropertyType(asset.propertyType) : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Bedrooms</p>
                <p className="font-medium">{asset?.bedroomsTotal ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bathrooms</p>
                <p className="font-medium">{asset?.bathroomsTotal ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Square Feet</p>
                <p className="font-medium">
                  {asset?.livingArea?.toLocaleString() ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Year Built</p>
                <p className="font-medium">{asset?.yearBuilt ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Listing Details */}
            <Card>
              <CardHeader>
                <CardTitle>Listing Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Listing Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Modern 2BR Apartment in Downtown"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the listing in detail..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rent ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="2000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="securityDeposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Deposit ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="2000"
                            {...field}
                          />
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
                    <FormItem>
                      <FormLabel>Available Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leaseTerms"
                  render={() => (
                    <FormItem>
                      <FormLabel>Lease Terms</FormLabel>
                      <div className="grid grid-cols-3 gap-3">
                        {LEASE_TERMS.map((term) => (
                          <FormField
                            key={term}
                            control={form.control}
                            name="leaseTerms"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(term)}
                                    onCheckedChange={(checked) =>
                                      checked
                                        ? field.onChange([...field.value, term])
                                        : field.onChange(
                                            field.value?.filter(
                                              (v) => v !== term
                                            )
                                          )
                                    }
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

            {/* Amenities */}
            <Card>
              <CardHeader>
                <CardTitle>Amenities &amp; Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="amenities"
                  render={() => (
                    <FormItem>
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
                                    onCheckedChange={(checked) =>
                                      checked
                                        ? field.onChange([
                                            ...field.value,
                                            amenity,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (v) => v !== amenity
                                            )
                                          )
                                    }
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

                <FormField
                  control={form.control}
                  name="utilitiesIncluded"
                  render={() => (
                    <FormItem>
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
                                    onCheckedChange={(checked) =>
                                      checked
                                        ? field.onChange([
                                            ...field.value,
                                            utility,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (v) => v !== utility
                                            )
                                          )
                                    }
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
                    <FormItem>
                      <FormLabel>Pet Policy</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
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

                <FormField
                  control={form.control}
                  name="furnished"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Furnished
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Photos */}
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
                <CardDescription>
                  Existing photos are managed via moderation. New uploads are
                  reviewed before they appear publicly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {existingMedia.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Current Photos</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {existingMedia.map((media) => (
                        <img
                          key={media.id}
                          src={media.url}
                          alt="Listing"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {imagePreviews.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">New Photos</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`New ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveNewImage(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Add photos
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="max-w-xs mx-auto"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/landlord/properties/${id}`)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
