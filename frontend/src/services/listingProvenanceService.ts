import { backendClient } from '@/lib/api-client';
import type {
  ListingProvenance,
  FairHousingScreenResult,
  AuthorityDocumentType,
  AuthorityDocumentResponse,
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
 * `POST /listings/{id}/authority/documents`. Uploads one proof-of-authority
 * document (deed / title / management agreement) under the `file` field plus a
 * `documentType` field, which drives the authority tier from T0 to T1. Returns
 * the stored document and the resulting gate status.
 *
 * The browser sets the multipart boundary automatically — do NOT pass a custom
 * `Content-Type`; `buildRequestBody` strips it for FormData.
 */
export async function uploadAuthorityDocument(
  listingId: string,
  file: File,
  documentType: AuthorityDocumentType
): Promise<AuthorityDocumentResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('documentType', documentType);
  return backendClient.post<AuthorityDocumentResponse>(
    `${LISTINGS}/${listingId}/authority/documents`,
    form
  );
}

/**
 * `POST /listings/{id}/fair-housing/screen`. Screens the listing's **stored**
 * title + description (no request body) and returns the matched flags. As a
 * side effect the backend restamps `fairHousingCleared`, so callers should
 * refresh the listing afterwards.
 */
export async function screenFairHousing(
  listingId: string
): Promise<FairHousingScreenResult> {
  return backendClient.post<FairHousingScreenResult>(
    `${LISTINGS}/${listingId}/fair-housing/screen`
  );
}
