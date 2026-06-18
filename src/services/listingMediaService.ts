import { backendClient } from '@/lib/api-client';
import type { MediaRef, MediaReorderBody } from '@/types/listingContract';

/**
 * Listing media API surface.
 *
 * Upload is not a plain put: each image is EXIF/GPS-stripped, IPFS-pinned and
 * moderation-stamped. In the hackathon build uploads are **auto-approved**, so a
 * fresh upload is publicly visible immediately; the owner always sees every
 * status. The agent-only moderation endpoint (`PUT /media/{mediaId}/moderation`)
 * is intentionally not exposed here — it is outside the landlord/tenant surface.
 *
 * Backend stubs in MVP: the EXIF stripper is a no-op, the pinner returns a
 * synthetic `cid` (bytes are not actually stored), and moderation auto-approves.
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
  // Fresh uploads come back `approved` (auto-approve, hackathon).
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
 * `PUT /listings/{id}/media`. Reorder and/or remove in one call. `order` is the
 * surviving media ids in the desired order (each id's index becomes its
 * position); `remove` is the ids to delete (the blob is dropped too). The
 * backend removes first, then reorders. Returns the resulting media set (all
 * statuses — owner view).
 */
export async function updateMedia(
  listingId: string,
  body: MediaReorderBody
): Promise<MediaRef[]> {
  return backendClient.put<MediaRef[]>(`${LISTINGS}/${listingId}/media`, body);
}
