import { backendClient } from '@/lib/api-client';
import type {
  ListingProvenance,
  FairHousingScreenResult,
} from '@/types/listingContract';

/**
 * Listing authority-to-list gate API surface.
 *
 * The gate has three parts — identity (KYC), authority tier (T0/T1/T2), and a
 * fair-housing advertising screen — and a listing cannot reach `active` until
 * all three pass. `provenance` is read-only and reflects the gate result.
 *
 * Backend stubs in MVP: identity is always verified, T2 is unreachable (only
 * the T0 -> T1 document upload is wired), and the fair-housing screen is a
 * substring blocklist rather than a real compliance control.
 */

const LISTINGS = '/api/v1/listings';

/** `GET /listings/{id}/provenance`. Current gate status. */
export async function getProvenance(
  listingId: string
): Promise<ListingProvenance> {
  return backendClient.get<ListingProvenance>(
    `${LISTINGS}/${listingId}/provenance`
  );
}

/**
 * `POST /listings/{id}/authority/documents`. Uploads deed / title / management
 * agreement, which drives the authority tier from T0 to T1. Returns the
 * updated provenance so the caller can re-render the gate.
 *
 * The browser sets the multipart boundary automatically — do NOT pass a custom
 * `Content-Type`; `buildRequestBody` strips it for FormData.
 */
export async function uploadAuthorityDocuments(
  listingId: string,
  files: File[]
): Promise<ListingProvenance> {
  const form = new FormData();
  for (const file of files) {
    form.append('documents', file);
  }
  return backendClient.post<ListingProvenance>(
    `${LISTINGS}/${listingId}/authority/documents`,
    form
  );
}

/**
 * `POST /listings/{id}/fair-housing/screen`. Runs (or previews) the advertising
 * screen and returns the matched flags. Pass `title`/`description` to preview
 * unsaved edits; omit them to screen the listing's current stored text.
 */
export async function screenFairHousing(
  listingId: string,
  text?: { title?: string; description?: string }
): Promise<FairHousingScreenResult> {
  return backendClient.post<FairHousingScreenResult>(
    `${LISTINGS}/${listingId}/fair-housing/screen`,
    text ?? {}
  );
}
