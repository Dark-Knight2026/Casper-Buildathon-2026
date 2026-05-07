import { backendClient } from '@/lib/api-client';
import { type ServerUserInfo, type SelfRegisterableRole } from './backendAuthService';

/**
 * Profile-management API surface.
 *
 * Each function is a thin wrapper around the LeaseFi `/api/v1/users/me` family
 * that takes and returns wire-format (snake_case) shapes. Domain-level
 * camelCase translation belongs at the call site (see
 * `AuthContext.updateProfile` for the canonical example) so the service does
 * not have to know about `UserProfile` and stays trivially mockable.
 *
 * Errors propagate as `ApiError`. When the backend emitted a machine-readable
 * envelope (`{ "error": "reauthentication_required" }` etc.), the token is on
 * `error.code` — see `src/lib/api-errors.ts` for the constant set.
 */

const USERS_ME = '/api/v1/users/me';

/**
 * Body for `PATCH /users/me`. Every field is optional; missing fields keep
 * the stored value. Writing a `phone` that differs from the stored one
 * resets `phone_verified` to `false` server-side.
 *
 * Avatar is intentionally NOT writable here — the canonical (and only) write
 * path is `POST /users/me/avatar` (multipart). The server rejects requests
 * that include `avatar_url` in this payload.
 */
export interface PatchProfileBody {
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
}

export interface EmailChangeRequestBody {
  new_email: string;
}

export interface EmailChangeConfirmationBody {
  /** 43 base64url-no-pad characters; backend validates shape. */
  token: string;
}

export interface UpdateRoleBody {
  role: SelfRegisterableRole;
}

export interface AvatarUploadResponse {
  avatar_url: string;
}

/** `GET /users/me`. */
export async function getMe(): Promise<ServerUserInfo> {
  return backendClient.get<ServerUserInfo>(USERS_ME);
}

/** `PATCH /users/me`. Caller is responsible for sending only changed fields. */
export async function patchMe(body: PatchProfileBody): Promise<ServerUserInfo> {
  return backendClient.patch<ServerUserInfo>(USERS_ME, body);
}

/**
 * `POST /users/me/email`. Backend returns 202 with no body when the
 * confirmation email has been queued. The promise resolves to `void` to
 * signal "queued", not "applied" — the change only takes effect after
 * `confirmEmailChange` succeeds.
 */
export async function requestEmailChange(newEmail: string): Promise<void> {
  await backendClient.post<void>(`${USERS_ME}/email`, {
    new_email: newEmail,
  } satisfies EmailChangeRequestBody);
}

/** `POST /users/me/email/confirm`. Returns the updated profile. */
export async function confirmEmailChange(token: string): Promise<ServerUserInfo> {
  return backendClient.post<ServerUserInfo>(`${USERS_ME}/email/confirm`, {
    token,
  } satisfies EmailChangeConfirmationBody);
}

/**
 * `PATCH /users/me/role`. On 200 the backend clears both auth cookies
 * server-side; the caller must redirect the user to the login flow because
 * any subsequent request will 401. The 5-minute recent-auth gate produces
 * `403 reauthentication_required` (see `ProfileApiErrorCode`).
 */
export async function patchMyRole(role: SelfRegisterableRole): Promise<ServerUserInfo> {
  return backendClient.patch<ServerUserInfo>(`${USERS_ME}/role`, {
    role,
  } satisfies UpdateRoleBody);
}

/**
 * `POST /users/me/avatar`. The browser sets the multipart boundary on the
 * `Content-Type` header automatically; do NOT pass a custom `Content-Type`
 * via options — `buildRequestBody` in `api-client` strips it for FormData
 * but a downstream caller could re-introduce it.
 *
 * Pre-flight constraints (mirror server enforcement, but client-side rejection
 * avoids a wasted round-trip):
 *   - Accepts: PNG, JPEG, WebP
 *   - Max size: 5 MB
 * The server does magic-byte sniffing the client cannot fully replicate, so
 * a successful client-side check is necessary but not sufficient.
 */
export async function uploadAvatar(file: File): Promise<AvatarUploadResponse> {
  const form = new FormData();
  form.append('file', file);
  return backendClient.post<AvatarUploadResponse>(`${USERS_ME}/avatar`, form);
}
