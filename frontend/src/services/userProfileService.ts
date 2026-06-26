import { backendClient } from '@/lib/api-client';
import type { ServerUserInfo, SelfRegisterableRole } from '@/types/serverUser';

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

/**
 * `POST /users/me/email/confirm`. Returns the updated profile.
 *
 * Errors (endpoint requires auth, so 401 is overloaded):
 *   400                                  — malformed token
 *   401 `invalid_token`/`missing_access_token` — caller not logged in (middleware)
 *   401 `invalid_email_change_token`     — token missing/consumed or hash mismatch
 *   404 / 409                            — user soft-deleted / email taken in a race
 * Callers must switch on `ApiError.code`, not status, to tell "needs login" from
 * "bad token". `skipAuthError` keeps the 401 in-page instead of hard-redirecting.
 */
export async function confirmEmailChange(token: string): Promise<ServerUserInfo> {
  return backendClient.post<ServerUserInfo>(
    `${USERS_ME}/email/confirm`,
    { token } satisfies EmailChangeConfirmationBody,
    { skipAuthError: true },
  );
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

/**
 * Body for `POST /users/me/password`. One endpoint serves two cases, resolved
 * server-side by whether the account already has a password hash:
 *   - change: `current_password` required, verified before the rewrite.
 *   - first-set (wallet-only / OAuth-only account): omit `current_password`;
 *     the backend instead requires a freshly authenticated session.
 */
export interface ChangePasswordBody {
  /** Omit (or set undefined) on the first-set path. */
  current_password?: string;
  new_password: string;
}

/**
 * `POST /users/me/password`. Returns `204` (no body): the backend revokes all
 * OTHER sessions and rotates the current one, so the active device stays
 * logged in via freshly set cookies.
 *
 * Errors:
 *   400 — weak new password, or missing current password on the change path
 *   401 — current password incorrect
 *   403 `reauthentication_required` — first-set path without a recent auth
 *   404 — user no longer exists
 */
export async function changePassword(body: ChangePasswordBody): Promise<void> {
  await backendClient.post<void>(`${USERS_ME}/password`, body);
}

/**
 * `POST /users/me/wallet`. Links a Casper wallet to the logged-in account via
 * a nonce + signature ownership proof — the caller must first fetch a nonce
 * from `GET /auth/nonce?wallet_address=<pubkey>`, sign its `message`, and pass
 * the resulting signature here. The newly linked wallet becomes primary; the
 * updated profile (with `wallet_address` populated) is returned.
 *
 * `signature` must carry the 1-byte algorithm prefix (01 = Ed25519,
 * 02 = Secp256k1) — see `loginWithSignature` for the prefixing rule.
 *
 * Errors:
 *   401 — signature did not prove ownership of the wallet
 *   409 — that wallet is already linked (to this or another account)
 */
export async function linkWallet(
  walletAddress: string,
  signature: string,
): Promise<ServerUserInfo> {
  return backendClient.post<ServerUserInfo>(`${USERS_ME}/wallet`, {
    wallet_address: walletAddress,
    signature,
  });
}

/**
 * Response of `GET /users/me/onchain-registration` — the two `create_user`
 * arguments the frontend cannot derive itself (the third, the wallet address,
 * it already holds).
 *
 * HACK (hackathon bridge): this endpoint exists only while the frontend calls
 * `UserRegistry::create_user` from the user's own wallet. It is retired once
 * the backend signs the deploy itself.
 */
export interface OnchainRegistrationResponse {
  /** Lowercase hex of the 32-byte identity hash; decode to `[u8; 32]`. */
  identity_hash: string;
  /** Role-flags bitmask: TENANT=1, LANDLORD=2, PROPERTY_MANAGER=4, else 0. */
  role_flags: number;
}

/**
 * `GET /users/me/onchain-registration`. Requires a linked wallet.
 *
 * Errors:
 *   409 — no wallet linked yet (link one via `linkWallet` first)
 */
export async function getOnchainRegistration(): Promise<OnchainRegistrationResponse> {
  return backendClient.get<OnchainRegistrationResponse>(
    `${USERS_ME}/onchain-registration`,
    { retry: false },
  );
}
