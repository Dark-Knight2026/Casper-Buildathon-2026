import { backendClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/queryString';
import type {
  Listing,
  ListingSearchParams,
  ListingState,
  ListingStatistics,
  ListingHistoricalData,
  PaginatedResponse,
  CreateListingBody,
  UpdateListingBody,
  ListingStateTransitionBody,
} from '@/types/listingContract';

/**
 * Listing (time-bound offer) API surface.
 *
 * A listing is an offer against a physical Property (see `propertyAssetService`)
 * carrying an intent, price/terms, lifecycle state, provenance and on-chain
 * indicators. The gate (provenance/authority/fair-housing) and media live in
 * their own services. Everything here is camelCase on the wire; errors
 * propagate as `ApiError`.
 */

const LISTINGS = '/api/v1/listings';

/**
 * `GET /listings`. Public search over active listings only, paginated. The
 * page/size are request params (`page`/`pageSize`), not echoed in the body.
 */
export async function searchListings(
  params: ListingSearchParams = {}
): Promise<PaginatedResponse<Listing>> {
  return backendClient.get<PaginatedResponse<Listing>>(
    `${LISTINGS}${toQueryString({ ...params })}`
  );
}

/**
 * `GET /listings/landlord`. The caller's own listings in any state (scoped by
 * `listedBy` server-side), paginated.
 */
export async function getLandlordListings(
  params: ListingSearchParams = {}
): Promise<PaginatedResponse<Listing>> {
  return backendClient.get<PaginatedResponse<Listing>>(
    `${LISTINGS}/landlord${toQueryString({ ...params })}`
  );
}

/** `GET /listings/{id}`. Offer details with nested property + provenance. */
export async function getListing(id: string): Promise<Listing> {
  return backendClient.get<Listing>(`${LISTINGS}/${id}`);
}

/** `POST /listings`. Creates a listing in `draft` against an existing property. */
export async function createListing(body: CreateListingBody): Promise<Listing> {
  return backendClient.post<Listing>(LISTINGS, body);
}

/** `PUT /listings/{id}`. Partial update; re-runs the fair-housing screen. */
export async function updateListing(
  id: string,
  body: UpdateListingBody
): Promise<Listing> {
  return backendClient.put<Listing>(`${LISTINGS}/${id}`, body);
}

/**
 * `POST /listings/{id}/submit`. Submits a draft for gate review
 * (`draft -> pending gate`). Activation itself is the gate-guarded state
 * transition below.
 */
export async function submitListing(id: string): Promise<Listing> {
  return backendClient.post<Listing>(`${LISTINGS}/${id}/submit`);
}

/**
 * `PUT /listings/{id}/state`. Lifecycle transition. Moving to `active` is
 * gate-guarded: the backend rejects it until identity + authority +
 * fair-housing all pass.
 */
export async function transitionListingState(
  id: string,
  state: ListingState
): Promise<Listing> {
  return backendClient.put<Listing>(`${LISTINGS}/${id}/state`, {
    state,
  } satisfies ListingStateTransitionBody);
}

/**
 * `DELETE /listings/{id}`. Withdraw — always soft (no hard-delete path exists).
 */
export async function withdrawListing(id: string): Promise<void> {
  await backendClient.delete<void>(`${LISTINGS}/${id}`);
}

/**
 * `POST /listings/{id}/view`. Records a unique registered-tenant view. The
 * backend dedups per tenant, so calling it more than once is a no-op server-side.
 */
export async function recordListingView(id: string): Promise<void> {
  await backendClient.post<void>(`${LISTINGS}/${id}/view`);
}

/** `GET /listings/{id}/statistics`. Landlord dashboard analytics. */
export async function getListingStatistics(
  id: string
): Promise<ListingStatistics> {
  return backendClient.get<ListingStatistics>(`${LISTINGS}/${id}/statistics`);
}

/** `GET /listings/{id}/historical-data`. Lease + view counts before deletion. */
export async function getListingHistoricalData(
  id: string
): Promise<ListingHistoricalData> {
  return backendClient.get<ListingHistoricalData>(
    `${LISTINGS}/${id}/historical-data`
  );
}
