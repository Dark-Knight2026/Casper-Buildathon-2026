import { backendClient } from '@/lib/api-client';

export interface NonceResponse {
  nonce: string;
  message: string;
}

/**
 * Server-shape of the authenticated user, mirroring backend
 * `crates/api/src/services/auth/models.rs::UserInfo`.
 *
 * Snake-case fields match the JSON wire format. Map to the frontend
 * `User` type at the call site (see `mapServerUserInfo` below).
 */
export interface ServerUserInfo {
  id: string;
  role: string;
  wallet_address: string | null;
  status: string | null;
  email: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_profile_complete: boolean;
  active_leases_count: number;
  created_at: string;
  updated_at: string;
  // Email-verification flow. Known values: 'none' | 'email_verified'.
  // Optional because /users/me and /auth/login responses may omit the field
  // for legacy sessions; treat absence as unverified.
  verification_level?: string;
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

/**
 * Roles the backend accepts during self-registration. Mirrors
 * `UserRole::is_self_registerable` in `crates/api/src/common/models.rs` —
 * any other value would be rejected with 400. The field is honored only on
 * first INSERT; on subsequent logins the backend ignores it.
 */
export type SelfRegisterableRole = 'tenant' | 'landlord' | 'agent';

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
 * Errors:
 *   400 `bad_token_format`        — token is not a 43-char base64url string
 *   401/404 `invalid_or_expired_token` — already consumed, expired, or wrong
 */
export async function confirmEmailVerification(
  token: string,
): Promise<VerifyEmailConfirmResponse> {
  return backendClient.post<VerifyEmailConfirmResponse>(
    '/api/v1/auth/verify/email/confirm',
    { token },
    { retry: false },
  );
}
