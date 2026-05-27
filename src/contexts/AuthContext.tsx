import { useCallback, useEffect, useState } from 'react';
import { AuthContext } from './AuthContextDefinition';
import {
  logoutSession,
  refreshSession,
  type ServerUserInfo,
} from '@/services/ico/backendAuthService';
import { getMe, patchMe, type PatchProfileBody } from '@/services/userProfileService';
import type { UserProfile, UserRole, UserStatus } from '@/types/user';
import { logger } from '@/utils/logger';

// Non-secret session marker. The actual auth tokens live in HttpOnly cookies
// set by the backend at /auth/login; this localStorage entry is just a hint to
// the UI that a session existed across page reload, so we can render the
// signed-in view without flashing a login screen while the cookie-backed
// refresh round-trip resolves. It carries no secret material.
const SESSION_MARKER_KEY = 'leasefi_session';

// Persisted shape of the session marker — deliberately narrow. localStorage is
// readable by any same-origin script (browser extensions with storage perms,
// XSS payloads) and survives browser restart, so PII (email, phone, names,
// bio) must not be cached there. The four fields below are the minimum needed
// to render the signed-in shell (role for routing, isProfileComplete for the
// nudge, status for moderation banners) until /auth/refresh resolves and
// populates the full profile via refreshProfile().
interface SessionHint {
  id: string;
  role: UserRole;
  isProfileComplete?: boolean;
  status?: UserStatus;
}

// Whitelist of `users.status` values the UI knows how to render. An unknown
// value is dropped to `undefined` so consumers fall through to the safe
// default branch instead of trying to switch on a string we have no copy for.
const KNOWN_USER_STATUSES: ReadonlySet<UserStatus> = new Set<UserStatus>([
  'active',
  'inactive',
  'suspended',
  'pending_verification',
]);

function mapUserStatus(raw: string | null): UserStatus | undefined {
  if (raw === null) return undefined;
  return KNOWN_USER_STATUSES.has(raw as UserStatus) ? (raw as UserStatus) : undefined;
}

// Whitelist of `users.role` values the UI knows how to route. An unknown
// value (new backend role, tampered payload) returns `undefined` so the
// caller can refuse to seat the profile rather than letting ProtectedRoute
// branch on a string with no defined behaviour.
const KNOWN_USER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'buyer', 'seller', 'agent', 'broker', 'landlord', 'tenant',
  'mortgage_broker', 'cpa', 'real_estate_attorney', 'insurance_agent',
  'stager', 'photographer', 'contractor', 'listing_attorney', 'hoa_manager',
  'appraiser', 'home_inspector', 'pest_inspector', 'surveyor',
  'environmental_specialist', 'buyer_attorney', 'seller_attorney',
  'title_officer', 'escrow_officer', 'notary', 'admin',
]);

function mapUserRole(raw: string | null | undefined): UserRole | undefined {
  if (raw == null) return undefined;
  return KNOWN_USER_ROLES.has(raw as UserRole) ? (raw as UserRole) : undefined;
}

/**
 * Inverse of `mapServerUserInfo` for the subset of fields that
 * `PATCH /users/me` accepts. Only writes a key when the caller actually
 * supplied one, so a partial update never accidentally clears a stored
 * field by sending `undefined`.
 *
 * Avatar updates do NOT flow through here — the server rejects `avatar_url`
 * in this payload. Use `uploadAvatar` (multipart) instead.
 */
function toPatchProfileBody(updates: Partial<UserProfile>): PatchProfileBody {
  const body: PatchProfileBody = {};
  if (updates.firstName !== undefined) body.first_name = updates.firstName;
  if (updates.lastName !== undefined) body.last_name = updates.lastName;
  if (updates.phone !== undefined) body.phone = updates.phone;
  if (updates.bio !== undefined) body.bio = updates.bio;
  return body;
}

function mapServerUserInfo(info: ServerUserInfo): UserProfile {
  const role = mapUserRole(info.role);
  if (!role) {
    logger.error('[AuthContext] Unrecognized role from backend:', info.role);
    throw new Error(`Unrecognized user role: ${info.role}`);
  }
  return {
    id: info.id,
    role,
    email: info.email ?? '',
    firstName: info.first_name,
    lastName: info.last_name,
    name: `${info.first_name} ${info.last_name}`.trim() || undefined,
    phone: info.phone ?? undefined,
    avatar: info.avatar_url ?? undefined,
    profileImage: info.avatar_url ?? undefined,
    bio: info.bio ?? undefined,
    createdAt: new Date(info.created_at),
    updatedAt: new Date(info.updated_at),
    walletAddress: info.wallet_address ?? undefined,
    isProfileComplete: info.is_profile_complete,
    status: mapUserStatus(info.status),
    activeLeasesCount: info.active_leases_count,
  };
}

function loadSessionMarker(): UserProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_MARKER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionHint>;
    // Validate id + role before any routing decision — a tampered or
    // outdated marker must not seat the profile with a role ProtectedRoute
    // can't reason about, or without a stable id consumers can key off.
    const role = mapUserRole(parsed.role);
    if (!role || typeof parsed.id !== 'string' || parsed.id.length === 0) {
      localStorage.removeItem(SESSION_MARKER_KEY);
      return null;
    }
    // Construct a skeleton UserProfile from the hint. PII fields (email,
    // names, phone, bio, walletAddress, avatar) intentionally stay empty
    // until refreshProfile() populates them — consumers should gate any PII
    // display on `loading === false`.
    return {
      id: parsed.id,
      role,
      isProfileComplete: parsed.isProfileComplete,
      status: parsed.status,
      email: '',
      firstName: '',
      lastName: '',
      createdAt: new Date(0),
    };
  } catch {
    localStorage.removeItem(SESSION_MARKER_KEY);
    return null;
  }
}

function saveSessionMarker(profile: UserProfile): void {
  try {
    // Persist only the narrow SessionHint — see SESSION_MARKER_KEY comment.
    const hint: SessionHint = {
      id: profile.id,
      role: profile.role,
      isProfileComplete: profile.isProfileComplete,
      status: profile.status,
    };
    localStorage.setItem(SESSION_MARKER_KEY, JSON.stringify(hint));
  } catch {
    // Quota or private-mode failure — non-fatal.
  }
}

function clearSessionMarker(): void {
  try {
    localStorage.removeItem(SESSION_MARKER_KEY);
  } catch {
    // see saveSessionMarker
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Optimistically restore the marker; the cookie-backed session is verified
  // below via /auth/refresh on mount.
  const [profile, setProfile] = useState<UserProfile | null>(loadSessionMarker);
  const [loading, setLoading] = useState<boolean>(profile !== null);

  // On mount, if we have a marker, ping the backend for a fresh access cookie
  // so subsequent calls don't 401 mid-flow. If refresh fails, we clear the
  // stale marker and treat the user as logged out.
  useEffect(() => {
    let cancelled = false;
    if (profile === null) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const ok = await refreshSession();
        if (cancelled) return;
        if (!ok) {
          clearSessionMarker();
          setProfile(null);
        }
      } catch {
        // network blip — leave the marker in place; per-request 401 retry
        // will deal with it later.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once at mount; subsequent profile changes don't re-trigger refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setWalletSession = useCallback((info: ServerUserInfo) => {
    const next = mapServerUserInfo(info);
    saveSessionMarker(next);
    setProfile(next);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const updated = await patchMe(toPatchProfileBody(updates));
    const mapped = mapServerUserInfo(updated);
    saveSessionMarker(mapped);
    setProfile(mapped);
  }, []);

  const refreshProfile = useCallback(async () => {
    const fresh = await getMe();
    const mapped = mapServerUserInfo(fresh);
    saveSessionMarker(mapped);
    setProfile(mapped);
  }, []);

  const walletSignOut = useCallback(() => {
    clearSessionMarker();
    setProfile(null);
    // Best-effort server-side revocation; never throws.
    void logoutSession();
  }, []);

  return (
    <AuthContext.Provider value={{ profile, loading, setWalletSession, updateProfile, refreshProfile, walletSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};
