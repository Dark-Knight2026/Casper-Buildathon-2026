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
 * `POST /listings/{id}/media`. Uploads a single image under the `file` field
 * and returns the created `MediaRef` (fresh uploads come back `pending`). The
 * browser sets the multipart boundary automatically — do NOT pass a custom
 * `Content-Type`; `buildRequestBody` strips it for FormData.
 */
export async function uploadMediaFile(
  listingId: string,
  file: File
): Promise<MediaRef> {
  const form = new FormData();
  form.append('file', file);
  return backendClient.post<MediaRef>(`${LISTINGS}/${listingId}/media`, form);
}

/**
 * Uploads several images. The endpoint accepts one file per request, so this
 * uploads sequentially (preserving order, which drives `position`) and returns
 * the created refs.
 */
export async function uploadMedia(
  listingId: string,
  files: File[]
): Promise<MediaRef[]> {
  const results: MediaRef[] = [];
  for (const file of files) {
    results.push(await uploadMediaFile(listingId, file));
  }
  return results;
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
