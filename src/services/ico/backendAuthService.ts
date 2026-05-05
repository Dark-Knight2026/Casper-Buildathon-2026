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
