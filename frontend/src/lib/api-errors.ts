/**
 * Error contracts for the LeaseFi profile-management API surface.
 *
 * The backend serializes every non-2xx response as `{ "error": string }` (see
 * `crates/api/src/common/errors.rs::ErrorResponse`). The `error` field is
 * sometimes a machine-readable token (e.g. `reauthentication_required`) and
 * sometimes a human-readable message (e.g. `"Avatar payload exceeds 5242880-byte
 * limit"`). UI code maps on the token where one exists, else on HTTP status.
 *
 * This module owns:
 *   - the wire-format type
 *   - the set of known machine-readable error codes
 *   - a status-code helper for endpoints that emit prose
 *   - a safe parser for the JSON body
 *
 * It deliberately does NOT touch `ApiError` in `./api-client.ts`: that class
 * currently throws without reading the response body. Body parsing is plumbed
 * in alongside the profile service that needs it (phase 1 of the integration
 * plan), so the consumer call sites can keep using `parseProfileApiErrorBody`
 * directly on the response text.
 */

/**
 * Wire-format envelope returned by every non-2xx response from the backend.
 * Field names match `crates/api/src/common/errors.rs`.
 */
export interface ProfileApiErrorBody {
  error: string;
}

/**
 * Machine-readable codes the backend emits as the `error` field for the
 * profile-management endpoints. Endpoints that don't have a stable token
 * (e.g. avatar) fall through to status-code-driven handling instead.
 *
 * Sources:
 *   - `crates/api/src/services/users/handlers.rs::patch_me_role`
 *   - `crates/api/src/services/auth/middleware.rs` (recent-auth gate)
 */
export const ProfileApiErrorCode = {
  /**
   * Token's `iat` is older than the recent-auth window (5 min). UI must
   * prompt the user to re-sign with the wallet, then replay the original
   * request. Currently emitted by `PATCH /users/me/role`; will also be
   * emitted by `DELETE /users/me` once the backend ships it.
   * Status: 403.
   */
  ReauthenticationRequired: 'reauthentication_required',

  /**
   * Per-user rate limit exceeded for a sensitive mutation. For role-change
   * the budget is 1 / 24h. UI should surface time-until-retry from the
   * `Retry-After` header when present. Status: 429.
   */
  RateLimited: 'rate_limited',

  /**
   * The user has active leases that block the requested mutation (role
   * switch, account deletion). UI should pivot to a "review your leases"
   * CTA rather than a flat error toast. Status: 409.
   */
  ActiveLeasesBlocking: 'active_leases_blocking',

  /**
   * An opaque single-use token was malformed, expired, or already consumed.
   * Emitted by the password-reset (`POST /auth/password/reset`, status 400)
   * and email verify/change-confirm flows. UI should offer to restart the
   * flow (request a fresh link) rather than retry the same token. The wording
   * is deliberately uniform across malformed/expired/consumed so it leaks
   * nothing about which check failed.
   */
  InvalidOrExpiredToken: 'invalid_or_expired_token',
} as const;

export type ProfileApiErrorCode =
  (typeof ProfileApiErrorCode)[keyof typeof ProfileApiErrorCode];

/**
 * Type guard for a string that the backend uses as a machine-readable code.
 * Use after extracting the `error` field to decide whether to switch on the
 * code or fall back to status-driven copy.
 */
export function isProfileApiErrorCode(value: string): value is ProfileApiErrorCode {
  return (Object.values(ProfileApiErrorCode) as string[]).includes(value);
}

/**
 * Parses the response body of a non-2xx response into the wire envelope.
 * Returns null for empty bodies, malformed JSON, or shapes that don't match
 * `{ error: string }` — callers should fall back to status-driven copy in
 * that case rather than treating the response as authoritative.
 *
 * The function never throws so it's safe to call from inside a `catch`.
 */
export function parseProfileApiErrorBody(rawBody: string): ProfileApiErrorBody | null {
  if (!rawBody) return null;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof (parsed as { error: unknown }).error === 'string'
    ) {
      return { error: (parsed as { error: string }).error };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Status codes the avatar endpoint uses with prose error bodies. These are
 * here because the avatar handler does not emit a stable machine-readable
 * token, so the UI keys on status + status-specific copy instead.
 *
 * Source: `crates/api/src/services/users/handlers.rs::upload_avatar`
 */
export const AvatarStatus = {
  PayloadTooLarge: 413,
  UnsupportedMediaType: 415,
  TooManyRequests: 429,
} as const;

export type AvatarStatus = (typeof AvatarStatus)[keyof typeof AvatarStatus];
