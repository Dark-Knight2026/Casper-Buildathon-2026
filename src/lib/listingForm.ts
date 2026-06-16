import * as z from 'zod';
import type { SurroundingCategory } from '@/types/property';

/**
 * Amenity labels the create flow keys physical features off. Named so a label
 * change in `ALL_AMENITIES` doesn't silently break the `parkingFeatures` /
 * `furnished` derivation.
 */
export const PARKING_AMENITY = 'Parking';
export const FURNISHED_AMENITY = 'Furnished';

/** Tenant-facing nearby categories (constrained list), shared by both forms. */
export const SURROUNDING_CATEGORIES: SurroundingCategory[] = [
  'hospital',
  'school',
  'gym',
  'airport',
  'park',
  'grocery',
  'transit',
];

/** Shared zod schema for the surrounding-area POI field array. */
export const surroundingAreaSchema = z.array(
  z.object({
    category: z.enum([
      'hospital',
      'school',
      'gym',
      'airport',
      'park',
      'grocery',
      'transit',
    ]),
    name: z.string().min(1, 'Place name is required'),
    distanceMiles: z.coerce.number().min(0, 'Distance must be 0 or more'),
    note: z.string().optional(),
  })
);
