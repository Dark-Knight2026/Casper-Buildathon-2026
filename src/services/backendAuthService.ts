import { backendClient } from '@/lib/api-client';
import type { ServerUserInfo, SelfRegisterableRole } from '@/types/serverUser';

// Re-exported for back-compat: `ServerUserInfo` and `SelfRegisterableRole` now
// live in the neutral `@/types/serverUser`, but some call sites still import
// them from here. New code should import from `@/types/serverUser` directly.
export type { ServerUserInfo, SelfRegisterableRole } from '@/types/serverUser';

export interface NonceResponse {
  nonce: string;
  message: string;
}

export interface LoginResponse {
  user: ServerUserInfo;
}

export async function getNonce(publicKey: string): Promise<NonceResponse> {
  // The API parameter is named wallet_address, but the value is a Casper public key
  // (hex string with a 1-byte algorithm prefix: 01 = Ed25519, 02 = Secp256k1).
  return backendClient.get<NonceResponse>(
    `/api/v1/auth/nonce?wallet_address=${encodeURIComponent(publicKey)}`,
    { retry: false },
  );
}

export async function loginWithSignature(
  publicKey: string,
  signatureHex: string,
  role?: SelfRegisterableRole,
): Promise<LoginResponse> {
  // casper_types::Signature::from_hex expects a 1-byte algorithm prefix:
  //   01 = Ed25519, 02 = Secp256k1
  // Per the Casper account-key format spec, account addresses are derived from
  // the public key with the same prefix byte prepended — so the address prefix
  // reliably identifies the signing algorithm. Reference:
  // https://docs.casper.network/concepts/accounts-and-keys/#account-keys
  const prefix = publicKey.startsWith('02') ? '02' : '01';
  const signature = signatureHex.startsWith(prefix) ? signatureHex : `${prefix}${signatureHex}`;

  // Tokens travel as HttpOnly cookies set by the response — the request must
  // therefore opt into credentialed mode so the browser stores Set-Cookie.
  return backendClient.post<LoginResponse>(
    '/api/v1/auth/login',
    {
      wallet_address: publicKey,
      signature,
      // Only include role when explicitly provided; backend defaults to
      // `tenant` and the field is honored only on the very first login.
      ...(role !== undefined ? { role } : {}),
    },
    { retry: false },
  );
}

// ─── Email + password auth ──────────────────────────────────────────────────

export interface RegisterBody {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  // Honored only on this INSERT; backend defaults to `tenant` when omitted.
  role?: SelfRegisterableRole;
}

/**
 * Register a new email + password user. The backend creates the account with
 * `primary_auth_method = 'password'`, `verification_level = 'none'`, no wallet,
 * and auto-logs the user in: the access + refresh tokens arrive as HttpOnly
 * cookies and the body carries only the profile — the same shape as login.
 *
 * The verification email is NOT sent here; trigger it separately via
 * `sendVerificationEmail()` once the user is signed in.
 *
 * Errors (switch on `ApiError.statusCode`):
 *   400 — invalid email, weak password, disallowed role, or empty name
 *   409 — email already registered
 *   429 — too many registration attempts from this client
 */
export async function register(body: RegisterBody): Promise<LoginResponse> {
  return backendClient.post<LoginResponse>('/api/v1/auth/register', body, {
    retry: false,
  });
}

/**
 * Authenticate an email + password user. On success the backend sets the
 * access + refresh cookies and returns the profile.
 *
 * Anti-enumeration: every authentication failure (unknown email, wrong
 * password, wallet-only account) collapses to one generic `401` — the UI must
 * NOT distinguish them or reveal whether the email exists.
 *
 * Errors:
 *   401 — invalid credentials (generic; do not leak which check failed)
 *   403 — account suspended or inactive
 *   429 — too many failed attempts for this email
 */
export async function loginWithPassword(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return backendClient.post<LoginResponse>(
    '/api/v1/auth/login/password',
    { email, password },
    { retry: false },
  );
}

export interface ForgotPasswordResponse {
  status: 'sent';
}

/**
 * Start the forgotten-password flow. The backend always answers
 * `{ status: 'sent' }` regardless of whether the email maps to a reset-eligible
 * account (anti-enumeration), so the UI must show a neutral "if that address
 * exists, a link was sent" message and never branch on the result.
 *
 * Unauthenticated.
 */
export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return backendClient.post<ForgotPasswordResponse>(
    '/api/v1/auth/password/forgot',
    { email },
    { retry: false },
  );
}

/**
 * Complete the forgotten-password flow with the opaque token from the reset
 * email (43-char base64url, delivered as `?token=` on the reset link). On
 * success the backend invalidates ALL sessions, sets the new password, and
 * auto-logs the user in via fresh cookies.
 *
 * Errors:
 *   400 `invalid_or_expired_token` — malformed/expired/consumed token, or weak
 *                                    new password
 *   404 — account no longer exists
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<LoginResponse> {
  return backendClient.post<LoginResponse>(
    '/api/v1/auth/password/reset',
    { token, new_password: newPassword },
    { retry: false },
  );
}

/**
 * Trade the `refresh_token` cookie for a fresh `access_token`.
 *
 * The backend reads the opaque refresh token from the (cookie-only) request
 * and rotates both cookies on success. The frontend never sees either token —
 * the browser handles the cookie swap transparently.
 *
 * Returns `true` on success, `false` if the refresh cookie is missing/expired.
 * Network errors propagate so the caller can distinguish "logged out" from
 * "backend down" and avoid wiping the session on transient failures.
 */
export async function refreshSession(): Promise<boolean> {
  try {
    await backendClient.post<void>('/api/v1/auth/refresh', undefined, {
      retry: false,
      // Refresh must not itself trigger the 401-refresh loop in the client.
      skipRefresh: true,
    });
    return true;
  } catch (err) {
    if (err instanceof Error && 'statusCode' in err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 401 || status === 403 || status === 404) {
        return false;
      }
    }
    throw err;
  }
}

/**
 * Best-effort server-side logout: clears `access_token` + `refresh_token`
 * cookies and revokes the refresh-token family on the backend. Never throws —
 * callers should also clear local session state regardless of the result.
 */
export async function logoutSession(): Promise<void> {
  try {
    await backendClient.post<void>('/api/v1/auth/logout', undefined, {
      retry: false,
      skipRefresh: true,
    });
  } catch {
    // Logout is best-effort — even if the backend rejects (already-expired
    // refresh, network down), the client will still clear its local state.
  }
}

// ─── Email verification ─────────────────────────────────────────────────────

export interface VerifyEmailSendResponse {
  status: 'sent';
  // Dev/MVP escape hatch — populated ONLY while POSTMARK_SERVER_TOKEN is not
  // configured on the backend, so the frontend can confirm without a real
  // inbox. Disappears automatically once Postmark is wired. Frontend MUST NOT
  // rely on this in production.
  dev_verification_token?: string;
}

export interface VerifyEmailConfirmResponse {
  user: ServerUserInfo;
}

/**
 * Request a verification email be sent to the authenticated user's address.
 * Resolves with `{ status: 'sent' }` even when delivery is deferred to the
 * retry queue — the UI should signal "request accepted", not "delivered".
 *
 * Errors:
 *   400 `email_not_set`   — user has no real email yet (e.g. wallet-only)
 *   429 `rate_limited`    — 1/min, 5/hour per user
 */
export async function sendVerificationEmail(): Promise<VerifyEmailSendResponse> {
  return backendClient.post<VerifyEmailSendResponse>(
    '/api/v1/auth/verify/email/send',
    undefined,
    { retry: false },
  );
}

/**
 * Same contract as `sendVerificationEmail` — backend exposes a separate
 * endpoint so we can attribute resend metrics distinctly from first-send.
 */
export async function resendVerificationEmail(): Promise<VerifyEmailSendResponse> {
  return backendClient.post<VerifyEmailSendResponse>(
    '/api/v1/auth/verify/email/resend',
    undefined,
    { retry: false },
  );
}

/**
 * Exchange the email-verification token for an upgraded session. On success
 * the backend rotates both access and refresh cookies via Set-Cookie and
 * returns the fresh `UserInfo` with the upgraded `verification_level` — the
 * caller should feed that into AuthContext directly and NOT follow up with
 * `GET /users/me` (per backend notes: re-fetch is a redundant round-trip and
 * a race risk against the freshly rotated cookies).
 *
 * Errors (the endpoint requires auth, so 401 is overloaded):
 *   400 `bad_token_format`            — token is not a 43-char base64url string
 *   401 `invalid_token`/`missing_access_token` — caller not logged in (middleware)
 *   401 `invalid_or_expired_token`    — token hash mismatch (handler)
 *   404 `invalid_or_expired_token`    — token slot consumed/expired/never issued
 * Callers must switch on `ApiError.code`, not status, to tell "needs login" from
 * "bad token".
 */
export async function confirmEmailVerification(
  token: string,
): Promise<VerifyEmailConfirmResponse> {
  return backendClient.post<VerifyEmailConfirmResponse>(
    '/api/v1/auth/verify/email/confirm',
    { token },
    // skipAuthError: a 401 here is classified in-page (needs_login vs bad token);
    // don't let the global handler hard-redirect to /auth/login. Refresh-and-replay
    // still runs, so an expired-access link transparently re-auths.
    { retry: false, skipAuthError: true },
  );
}
