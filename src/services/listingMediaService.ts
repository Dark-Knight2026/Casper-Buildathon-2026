import { backendClient } from '@/lib/api-client';
import type { MediaRef, MediaReorderEntry } from '@/types/listingContract';

/**
 * Listing media API surface.
 *
 * Upload is not a plain put: each image is EXIF/GPS-stripped, moderation-passed
 * and IPFS-pinned. A fresh upload is `pending` and excluded from public reads
 * until an agent approves it; the owner sees all statuses. The agent-only
 * moderation endpoint (`PUT /media/{mediaId}/moderation`) is intentionally not
 * exposed here — it is outside the landlord/tenant surface.
 *
 * Backend stubs in MVP: the EXIF stripper is a no-op and the pinner returns a
 * synthetic `cid` (bytes are not actually stored); only moderation is real.
 */

const LISTINGS = '/api/v1/listings';

/**
 * `POST /listings/{id}/media`. Uploads one or more images. The browser sets the
 * multipart boundary automatically — do NOT pass a custom `Content-Type`;
 * `buildRequestBody` strips it for FormData. Returns the full media set for the
 * listing (fresh uploads come back `pending`).
 */
export async function uploadMedia(
  listingId: string,
  files: File[]
): Promise<MediaRef[]> {
  const form = new FormData();
  for (const file of files) {
    form.append('media', file);
  }
  return backendClient.post<MediaRef[]>(`${LISTINGS}/${listingId}/media`, form);
}

/**
 * `PUT /listings/{id}/media`. Reorder and/or remove. Each entry sets the
 * position of a surviving media id; any current media id absent from the array
 * is removed. Returns the resulting media set.
 */
export async function updateMedia(
  listingId: string,
  entries: MediaReorderEntry[]
): Promise<MediaRef[]> {
  return backendClient.put<MediaRef[]>(
    `${LISTINGS}/${listingId}/media`,
    entries
  );
}
