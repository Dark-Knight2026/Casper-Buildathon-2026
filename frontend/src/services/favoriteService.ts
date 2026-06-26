import { backendClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/queryString';
import type { Listing, PaginatedResponse } from '@/types/listingContract';

/**
 * Favorites API surface. A favorite saves a **listing** (the offer), not the
 * bare property; everything is keyed on `listingId` and camelCase on the wire.
 * Errors propagate as `ApiError` (a duplicate `POST` is a `409`).
 */

const FAVORITES = '/api/v1/favorites';

/** A saved listing with the full listing it targets nested. */
export interface FavoriteResponse {
  listingId: string;
  favoritedAt: string;
  listing: Listing;
}

/** `GET /favorites`. The tenant's saved listings, paginated. */
export async function getFavorites(
  params: { page?: number; pageSize?: number } = {}
): Promise<PaginatedResponse<FavoriteResponse>> {
  return backendClient.get<PaginatedResponse<FavoriteResponse>>(
    `${FAVORITES}${toQueryString({ ...params })}`
  );
}

/** `GET /favorites/ids`. The set of favorited listing ids (for toggle state). */
export async function getFavoriteIds(): Promise<string[]> {
  return backendClient.get<string[]>(`${FAVORITES}/ids`);
}

/** `POST /favorites`. Saves a listing; the backend 409s on a duplicate. */
export async function addFavorite(
  listingId: string
): Promise<FavoriteResponse> {
  return backendClient.post<FavoriteResponse>(FAVORITES, { listingId });
}

/** `DELETE /favorites/{listingId}`. Un-saves a listing. */
export async function removeFavorite(listingId: string): Promise<void> {
  await backendClient.delete<void>(`${FAVORITES}/${listingId}`);
}
