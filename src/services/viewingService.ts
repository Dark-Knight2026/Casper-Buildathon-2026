import { backendClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/queryString';
import type { Listing, PaginatedResponse } from '@/types/listingContract';

/**
 * Viewings API surface. A viewing is booked against a **listing** (the offer),
 * not the bare property; everything is keyed on `listingId` and camelCase on
 * the wire. Status is `pending | confirmed | cancelled` (NOT approved/rejected).
 *
 * The booking body shape is undocumented in properties_api.md §7, which marks
 * the re-homing as mechanical (path + FK rename, other fields unchanged from the
 * previous version). It is modelled here as the prior `viewingDate`/`viewingTime`
 * fields, camelCased — adjust if the backend freezes a different contract.
 */

const LISTINGS = '/api/v1/listings';
const VIEWINGS = '/api/v1/viewings';

export type ViewingStatus = 'pending' | 'confirmed' | 'cancelled';

/** A viewing as returned by the backend (camelCase wire shape). */
export interface Viewing {
  id: string;
  listingId: string;
  userId: string;
  landlordId: string;
  viewingDate: string; // YYYY-MM-DD
  viewingTime: string; // human slot, e.g. "2:00 PM"
  status: ViewingStatus;
  notes: string | null;
  listing?: Listing; // nested in GET /viewings
  createdAt: string;
  updatedAt: string;
}

/** `POST /listings/{id}/viewings` body. */
export interface BookViewingBody {
  viewingDate: string; // YYYY-MM-DD
  viewingTime: string;
  notes?: string;
}

/** `POST /listings/{id}/viewings`. Tenant books a viewing for a listing. */
export async function bookViewing(
  listingId: string,
  body: BookViewingBody
): Promise<Viewing> {
  return backendClient.post<Viewing>(`${LISTINGS}/${listingId}/viewings`, body);
}

/** `GET /viewings`. The tenant's own viewings (nested listing), paginated. */
export async function getMyViewings(
  params: { page?: number; pageSize?: number } = {}
): Promise<PaginatedResponse<Viewing>> {
  return backendClient.get<PaginatedResponse<Viewing>>(
    `${VIEWINGS}${toQueryString(params)}`
  );
}

/** `GET /listings/{id}/viewings`. Landlord — viewings booked for one listing. */
export async function getListingViewings(
  listingId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<PaginatedResponse<Viewing>> {
  return backendClient.get<PaginatedResponse<Viewing>>(
    `${LISTINGS}/${listingId}/viewings${toQueryString(params)}`
  );
}

/** `PUT /listings/{id}/viewings/{viewingId}`. Landlord confirms/cancels. */
export async function updateViewingStatus(
  listingId: string,
  viewingId: string,
  status: ViewingStatus
): Promise<Viewing> {
  return backendClient.put<Viewing>(
    `${LISTINGS}/${listingId}/viewings/${viewingId}`,
    { status }
  );
}

/** `DELETE /listings/{id}/viewings/{viewingId}`. Tenant cancels (hard delete). */
export async function cancelViewing(
  listingId: string,
  viewingId: string
): Promise<void> {
  await backendClient.delete<void>(
    `${LISTINGS}/${listingId}/viewings/${viewingId}`
  );
}
