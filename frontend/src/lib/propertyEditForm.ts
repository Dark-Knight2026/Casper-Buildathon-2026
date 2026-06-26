import * as z from 'zod';
import { REAL_PROPERTY_TYPES } from '@/types/listingContract';
import { surroundingAreaSchema } from '@/lib/listingForm';

/**
 * The `PropertyEdit` form schema — edits both the physical property
 * (`PUT /properties/{id}`) and the listing offer (`PUT /listings/{id}`). Lives
 * here (not in the page) so the page and the extracted `PropertyDetailsFields`
 * can share the inferred type without a circular import.
 */
export const propertyEditFormSchema = z.object({
  // Physical property
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  stateOrProvince: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  propertyType: z.enum(REAL_PROPERTY_TYPES),
  bedroomsTotal: z.coerce.number().min(0, 'Must be 0 or more'),
  bathroomsTotal: z.coerce.number().min(0, 'Must be 0 or more'),
  livingArea: z.coerce.number().min(0, 'Must be 0 or more'),
  yearBuilt: z.coerce.number().min(0, 'Must be 0 or more'),
  // Listing offer
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
  surroundingArea: surroundingAreaSchema,
});

export type PropertyEditFormValues = z.infer<typeof propertyEditFormSchema>;
