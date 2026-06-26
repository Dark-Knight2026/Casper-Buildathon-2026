/**
 * Lease service — wired to the real Rust backend (`/api/v1/leases`) on the
 * `feat/lease-agreement` branch. See `docs/api/agreements_api.md` §3.
 *
 * Replaces the Supabase/mock `leaseApi.ts` + `leaseManagementService.ts`
 * (removed in the cleanup step, LA-20). No Supabase — anywhere.
 */

import { backendClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/queryString';
import type { PaginatedResponse } from '@/types/listingContract';
import type {
  Lease,
  CreateLeaseBody,
  UpdateLeaseBody,
  SignLeaseBody,
  CommitLeaseBody,
  ListLeasesQuery,
} from '@/types/leaseContract';

const LEASES = '/api/v1/leases';

/** `POST /leases` — landlord creates a draft → `draft`. */
export async function createLease(body: CreateLeaseBody): Promise<Lease> {
  return backendClient.post<Lease>(LEASES, body);
}

/** `GET /leases/{id}` — lease detail (party-gated; `403` if not a party). */
export async function getLease(id: string): Promise<Lease> {
  return backendClient.get<Lease>(`${LEASES}/${id}`);
}

/**
 * `GET /leases` — the caller's leases, paginated. Scope by `tenantId: 'me'` or
 * `landlordId: 'me'`, optionally filtered by `status`.
 */
export async function listLeases(
  query: ListLeasesQuery = {}
): Promise<PaginatedResponse<Lease>> {
  return backendClient.get<PaginatedResponse<Lease>>(
    `${LEASES}${toQueryString({ ...query })}`
  );
}

/** `PATCH /leases/{id}` — edit draft terms (draft-only; `409` otherwise). */
export async function updateLease(
  id: string,
  body: UpdateLeaseBody
): Promise<Lease> {
  return backendClient.patch<Lease>(`${LEASES}/${id}`, body);
}

/** `DELETE /leases/{id}` — delete a draft (draft-only; `409` otherwise). */
export async function deleteLease(id: string): Promise<void> {
  return backendClient.delete<void>(`${LEASES}/${id}`);
}

/** `POST /leases/{id}/submit` — send for signing → `pending-signatures`. */
export async function submitLease(id: string): Promise<Lease> {
  return backendClient.post<Lease>(`${LEASES}/${id}/submit`);
}

/**
 * `POST /leases/{id}/sign` — record a party's Casper-message signature of the
 * lease-consent string (see `lib/leaseConsent.ts`). Both parties call this.
 */
export async function signLease(
  id: string,
  body: SignLeaseBody
): Promise<Lease> {
  return backendClient.post<Lease>(`${LEASES}/${id}/sign`, body);
}

/**
 * `POST /leases/{id}/commit` — record the on-chain `create_lease_agreement`
 * result and flip `pending-signatures → active`. Idempotent; gated on both
 * parties having signed.
 */
export async function commitLease(
  id: string,
  body: CommitLeaseBody
): Promise<Lease> {
  return backendClient.post<Lease>(`${LEASES}/${id}/commit`, body);
}

/**
 * `GET /leases/{id}/document` — re-renders + re-stores the document and returns
 * the `Lease` with refreshed `documentLinks`/`documentHash`/`ipfsCid`.
 *
 * ⚠️ GET-with-side-effects: call on an explicit "Generate/Refresh" action, not
 * on every render.
 */
export async function getLeaseDocument(id: string): Promise<Lease> {
  return backendClient.get<Lease>(`${LEASES}/${id}/document`, { retry: false });
}
