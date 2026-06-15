import { backendClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/queryString';
import type {
  PropertyAsset,
  Listing,
  CreatePropertyBody,
  GeoSearchParams,
} from '@/types/listingContract';

/**
 * Property (physical-asset) API surface.
 *
 * A property is the deduplicated physical building; the rental offer lives on
 * a separate Listing (see `listingService`). Everything here is camelCase on
 * the wire, so no DTO translation is needed. Errors propagate as `ApiError`.
 */

const PROPERTIES = '/api/v1/properties';

/**
 * `POST /properties`. Dedup-aware upsert: the backend normalizes the address
 * and returns the existing property when `normalizedAddress + parcelApn`
 * already matches, instead of creating a duplicate. Callers should treat the
 * result as "the property to list against", new or pre-existing.
 */
export async function createProperty(
  body: CreatePropertyBody
): Promise<PropertyAsset> {
  return backendClient.post<PropertyAsset>(PROPERTIES, body);
}

/** `GET /properties/{id}`. Physical-asset record only (no offer data). */
export async function getProperty(id: string): Promise<PropertyAsset> {
  return backendClient.get<PropertyAsset>(`${PROPERTIES}/${id}`);
}

/** `GET /properties/{id}/listings`. Full listing history against this property. */
export async function getPropertyListings(id: string): Promise<Listing[]> {
  return backendClient.get<Listing[]>(`${PROPERTIES}/${id}/listings`);
}

/**
 * `GET /properties/search`. Geo-only search (radius or bbox). Attribute search
 * lives in `listingService.searchListings`, not here.
 */
export async function searchPropertiesByGeo(
  params: GeoSearchParams
): Promise<PropertyAsset[]> {
  return backendClient.get<PropertyAsset[]>(
    `${PROPERTIES}/search${toQueryString({ ...params })}`
  );
}
