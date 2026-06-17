import { backendClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/queryString';
import type { PaginatedResponse } from '@/types/listingContract';
import type {
  RentalApplication,
  SubmitApplicationBody,
  ReviewableStatus,
  LandlordApplicationParams,
  ApplicationNote as BackendApplicationNote,
  BackgroundCheck,
  BackgroundCheckType,
  ApplicationScore,
} from '@/types/applicationContract';

// ───────────────────────────────────────────────────────────────────────────
// LeaseFi backend applications API (PL-23a tenant + PL-42 landlord domain)
//
// An application is a tenant's request to rent a listing. The Supabase
// `ApplicationService` class was removed in PL-29 (the landlord domain is fully
// wired to the Rust backend below). Wire types live in `applicationContract.ts`.
// ───────────────────────────────────────────────────────────────────────────

const LISTINGS = '/api/v1/listings';
const APPLICATIONS = '/api/v1/applications';

// Re-exported so existing importers (PL-23a/23a+ pages, the status badge) keep
// sourcing the wire types from this service.
export type {
  ApplicationStatus,
  ReviewableStatus,
  RentalApplication,
  SubmitApplicationBody,
  LandlordApplicationParams,
  ApplicationNote as BackendApplicationNote,
  BackgroundCheck,
  BackgroundCheckType,
  BackgroundCheckStatus,
  RequestBackgroundCheckBody,
  ApplicationScore,
  ScoreFactor,
  ScoreFactorKind,
} from '@/types/applicationContract';

/** `POST /listings/{id}/applications`. Tenant submits (or, with `asDraft`, drafts). */
export async function submitApplication(
  listingId: string,
  body: SubmitApplicationBody
): Promise<RentalApplication> {
  return backendClient.post<RentalApplication>(
    `${LISTINGS}/${listingId}/applications`,
    body
  );
}

/** `GET /applications`. The tenant's own applications (nested listing), paginated. */
export async function getMyApplications(
  params: { page?: number; pageSize?: number } = {}
): Promise<PaginatedResponse<RentalApplication>> {
  return backendClient.get<PaginatedResponse<RentalApplication>>(
    `${APPLICATIONS}${toQueryString({ ...params })}`
  );
}

/** `GET /listings/{id}/applications`. Landlord — applications for one listing. */
export async function getListingApplications(
  listingId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<PaginatedResponse<RentalApplication>> {
  return backendClient.get<PaginatedResponse<RentalApplication>>(
    `${LISTINGS}/${listingId}/applications${toQueryString({ ...params })}`
  );
}

/**
 * `GET /applications/landlord`. Landlord — all applications across their
 * listings, paginated; filterable by status/search/listing/date range.
 */
export async function getLandlordApplications(
  params: LandlordApplicationParams = {}
): Promise<PaginatedResponse<RentalApplication>> {
  return backendClient.get<PaginatedResponse<RentalApplication>>(
    `${APPLICATIONS}/landlord${toQueryString({ ...params })}`
  );
}

/** `GET /applications/{id}`. Single application detail by id. */
export async function getApplication(
  applicationId: string
): Promise<RentalApplication> {
  return backendClient.get<RentalApplication>(
    `${APPLICATIONS}/${applicationId}`
  );
}

/**
 * `PUT /applications/{id}/status`. Landlord review — `under_review`,
 * `conditional`, `approved` or `rejected`. The backend `409`s a transition the
 * application's current state can't reach.
 */
export async function reviewApplication(
  applicationId: string,
  status: ReviewableStatus
): Promise<RentalApplication> {
  return backendClient.put<RentalApplication>(
    `${APPLICATIONS}/${applicationId}/status`,
    { status }
  );
}

/** `GET /applications/{id}/notes`. Internal landlord notes (newest first). */
export async function getApplicationNotes(
  applicationId: string
): Promise<BackendApplicationNote[]> {
  return backendClient.get<BackendApplicationNote[]>(
    `${APPLICATIONS}/${applicationId}/notes`
  );
}

/** `POST /applications/{id}/notes`. Adds a private landlord note. */
export async function addApplicationNote(
  applicationId: string,
  body: string
): Promise<BackendApplicationNote> {
  return backendClient.post<BackendApplicationNote>(
    `${APPLICATIONS}/${applicationId}/notes`,
    { body }
  );
}

/**
 * `POST /applications/{id}/background-checks`. Requests a check. The provider
 * is stubbed on the backend (hackathon) — results are fake.
 */
export async function requestBackgroundCheck(
  applicationId: string,
  checkType: BackgroundCheckType
): Promise<BackgroundCheck> {
  return backendClient.post<BackgroundCheck>(
    `${APPLICATIONS}/${applicationId}/background-checks`,
    { checkType }
  );
}

/** `GET /applications/{id}/background-checks`. Lists requested checks. */
export async function getBackgroundChecks(
  applicationId: string
): Promise<BackgroundCheck[]> {
  return backendClient.get<BackgroundCheck[]>(
    `${APPLICATIONS}/${applicationId}/background-checks`
  );
}

/** `GET /applications/{id}/score`. Server-computed score breakdown (stubbed). */
export async function getApplicationScore(
  applicationId: string
): Promise<ApplicationScore> {
  return backendClient.get<ApplicationScore>(
    `${APPLICATIONS}/${applicationId}/score`
  );
}

/**
 * `PATCH /applications/{id}`. Replaces a draft's fields. Tenant-only, and only
 * while the application is a `draft` (the backend `409`s otherwise).
 */
export async function updateDraftApplication(
  applicationId: string,
  body: SubmitApplicationBody
): Promise<RentalApplication> {
  return backendClient.patch<RentalApplication>(
    `${APPLICATIONS}/${applicationId}`,
    body
  );
}

/**
 * `POST /applications/{id}/submit`. Submits a draft (`draft -> pending`).
 * Tenant-only, draft-only.
 */
export async function submitDraftApplication(
  applicationId: string
): Promise<RentalApplication> {
  return backendClient.post<RentalApplication>(
    `${APPLICATIONS}/${applicationId}/submit`
  );
}
