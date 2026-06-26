/**
 * Wire-format shapes for the LeaseFi REST API's user surface.
 *
 * These describe the JSON envelope the backend returns (snake_case fields),
 * not anything Casper-specific — they live here, in a neutral location, so
 * both the auth service (`services/backendAuthService.ts`) and the profile
 * service (`services/userProfileService.ts`) can share them without coupling.
 * Domain-level camelCase translation belongs at the call site (see
 * `AuthContext.mapServerUserInfo`).
 */

/**
 * Server-shape of the authenticated user, mirroring the backend
 * `UserInfo` (`crates/api/src/common/models.rs`).
 *
 * Snake-case fields match the JSON wire format. Map to the frontend
 * `UserProfile` type at the call site (see `mapServerUserInfo`).
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
  // Email-verification level. Ordered enum (snake_case):
  // 'none' | 'email' | 'identity' | 'full' — email is verified at 'email'+.
  // Optional because legacy sessions may omit it; treat absence as unverified.
  verification_level?: string;
  // Contract-assigned on-chain user id (`UserRegistry`), serialized as a
  // decimal string because it is a U256 that does not fit a JSON number.
  // `null` until the indexer observes the `UserCreated` event for this user's
  // linked wallet. Used to gate wallet/on-chain dependent actions.
  onchain_user_id: string | null;
}

/**
 * Roles the backend accepts during self-registration. Mirrors
 * `UserRole::is_self_registerable` in `crates/api/src/common/models.rs` —
 * any other value is rejected with 400. On the wallet-login path the field is
 * honored only on the very first login; on `POST /auth/register` it sets the
 * new user's role.
 */
export type SelfRegisterableRole = 'tenant' | 'landlord' | 'agent';
