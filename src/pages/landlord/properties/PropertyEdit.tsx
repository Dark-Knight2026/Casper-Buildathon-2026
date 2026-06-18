/**
 * Property Edit Page
 * Edits both the listing's offer (title, description, terms, amenities, media)
 * and the underlying physical property's basic info (address, type, beds/baths,
 * area, year built) via `PUT /properties/{id}`. Editing the address re-runs
 * dedup on the backend (a `409` collision surfaces as a toast).
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Save,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getListing, updateListing } from '@/services/listingService';
import { updateProperty } from '@/services/propertyAssetService';
import { uploadMedia, updateMedia } from '@/services/listingMediaService';
import { logger } from '@/utils/logger';
import { ApiClient } from '@/lib/api-client';
import { SurroundingAreaFields } from '@/components/listing/SurroundingAreaFields';
import { CustomAmenitiesField } from '@/components/listing/CustomAmenitiesField';
import { PropertyDetailsFields } from '@/components/property/PropertyDetailsFields';
import {
  listingFormSchema,
  type ListingFormValues,
} from '@/lib/propertyEditForm';
import {
  ALL_AMENITIES,
  UTILITIES,
  LEASE_TERMS,
  PET_POLICIES,
} from '@/types/property';
import type {
  RentLtrTerms,
  MediaRef,
  MediaModerationStatus,
} from '@/types/listingContract';

const MEDIA_STATUS_STYLE: Record<MediaModerationStatus, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-600',
  rejected: 'bg-red-500',
};

export default function PropertyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  // Holds the zod-validated (coerced) values between confirming the dialog and
  // submitting — `form.getValues()` would return raw strings, unparsed numbers.
  const [pendingData, setPendingData] = useState<ListingFormValues | null>(
    null
  );
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  // Existing photos as a local working copy — remove/reorder mutate this and are
  // committed (via `updateMedia`) on save, alongside the form.
  const [media, setMedia] = useState<MediaRef[]>([]);

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
      addressLine1: '',
      addressLine2: '',
      city: '',
      stateOrProvince: '',
      postalCode: '',
      propertyType: 'apartment',
      bedroomsTotal: 0,
      bathroomsTotal: 0,
      livingArea: 0,
      yearBuilt: 0,
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
      surroundingArea: [],
    },
  });

  const { reset } = form;
  // Populate the form + media working copy once the listing resolves.
  useEffect(() => {
    if (!listing) return;
    setMedia([...listing.media].sort((a, b) => a.position - b.position));
    const terms =
      listing.intent === 'rent_ltr' ? (listing.terms as RentLtrTerms) : null;
    const asset = listing.property;
    reset({
      addressLine1: asset?.addressLine1 ?? '',
      addressLine2: asset?.addressLine2 ?? '',
      city: asset?.city ?? '',
      stateOrProvince: asset?.stateOrProvince ?? '',
      postalCode: asset?.postalCode ?? '',
      propertyType: asset?.propertyType ?? 'apartment',
      bedroomsTotal: asset?.bedroomsTotal ?? 0,
      bathroomsTotal: asset?.bathroomsTotal ?? 0,
      livingArea: asset?.livingArea ?? 0,
      yearBuilt: asset?.yearBuilt ?? 0,
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
      surroundingArea: listing.surroundingArea ?? [],
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

  const removeExistingPhoto = (mediaId: string) =>
    setMedia((prev) => prev.filter((m) => m.id !== mediaId));

  const movePhoto = (index: number, dir: -1 | 1) =>
    setMedia((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const onSubmit = async (data: ListingFormValues) => {
    if (!id || !listing) return;
    setSaving(true);
    try {
      // Physical property first — it may 409 on an address collision; if it
      // fails we surface the error and leave the listing untouched.
      if (listing?.property) {
        await updateProperty(listing.property.id, {
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2 || null,
          city: data.city,
          stateOrProvince: data.stateOrProvince,
          postalCode: data.postalCode,
          propertyType: data.propertyType,
          bedroomsTotal: data.bedroomsTotal,
          bathroomsTotal: data.bathroomsTotal,
          livingArea: data.livingArea,
          yearBuilt: data.yearBuilt,
        });
      }

      await updateListing(id, {
        title: data.title,
        description: data.description,
        availableDate: data.availableDate,
        amenities: data.amenities,
        utilitiesIncluded: data.utilitiesIncluded,
        petPolicy: data.petPolicy,
        surroundingArea: data.surroundingArea,
        terms: {
          rentMonthly: data.rent,
          securityDeposit: data.securityDeposit,
          leaseTermsOffered: data.leaseTerms,
          furnished: data.furnished,
        },
      });

      // Commit existing-photo removals / reorders before appending new uploads.
      const originalIds = [...listing.media]
        .sort((a, b) => a.position - b.position)
        .map((m) => m.id);
      const currentIds = media.map((m) => m.id);
      const removed = originalIds.filter((mid) => !currentIds.includes(mid));
      const orderChanged =
        currentIds.length !== originalIds.length ||
        currentIds.some((mid, i) => mid !== originalIds[i]);
      if (removed.length || orderChanged) {
        await updateMedia(id, {
          order: currentIds.length ? currentIds : undefined,
          remove: removed.length ? removed : undefined,
        });
      }

      if (uploadedImages.length > 0) {
        await uploadMedia(id, uploadedImages);
      }

      await queryClient.invalidateQueries({ queryKey: ['listing', id] });
      queryClient.invalidateQueries({ queryKey: ['landlord-listings'] });
      toast({ title: 'Listing updated' });
      navigate(`/landlord/properties/${id}`);
    } catch (error) {
      logger.error('Error updating listing:', error);
      toast({
        title: 'Could not update the listing',
        description: ApiClient.handleError(error),
        variant: 'destructive',
      });
    } finally {
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
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              setPendingData(data);
              setConfirmSave(true);
            })}
            className="space-y-6"
          >
            {/* Property — physical asset (PUT /properties/{id}) */}
            <PropertyDetailsFields control={form.control} />

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

                <CustomAmenitiesField form={form} name="amenities" />

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

                <SurroundingAreaFields
                  control={form.control}
                  name="surroundingArea"
                />
              </CardContent>
            </Card>

            {/* Photos */}
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
                <CardDescription>
                  New photos are published immediately (moderation is automatic
                  ). Remove or reorder existing photos below — changes apply
                  when you save. The first photo is the cover.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {media.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Current Photos</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {media.map((item, index) => (
                        <div key={item.id} className="relative group">
                          <img
                            src={item.url}
                            alt="Listing"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          {item.moderationStatus !== 'approved' && (
                            <Badge
                              className={`absolute top-2 left-2 capitalize ${MEDIA_STATUS_STYLE[item.moderationStatus]}`}
                            >
                              {item.moderationStatus}
                            </Badge>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeExistingPhoto(item.id)}
                            aria-label="Remove photo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="absolute bottom-2 left-2 right-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7"
                              disabled={index === 0}
                              onClick={() => movePhoto(index, -1)}
                              aria-label="Move photo earlier"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7"
                              disabled={index === media.length - 1}
                              onClick={() => movePhoto(index, 1)}
                              aria-label="Move photo later"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
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

      <ConfirmationDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Save changes?"
        description="The property is shared across all of its listings, so these edits apply to every listing on it. Changing the address re-checks for duplicate properties."
        confirmLabel="Save changes"
        loading={saving}
        onConfirm={() => (pendingData ? onSubmit(pendingData) : undefined)}
      />
    </div>
  );
}
