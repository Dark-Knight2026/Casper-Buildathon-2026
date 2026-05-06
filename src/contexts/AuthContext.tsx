import { useCallback, useEffect, useState } from 'react';
import { AuthContext } from './AuthContextDefinition';
import {
  logoutSession,
  refreshSession,
  type ServerUserInfo,
} from '@/services/ico/backendAuthService';
import { getMe, patchMe, type PatchProfileBody } from '@/services/ico/userProfileService';
import type { UserProfile, UserRole, UserStatus } from '@/types/user';

// Non-secret session marker. The actual auth tokens live in HttpOnly cookies
// set by the backend at /auth/login; this localStorage entry is just a hint to
// the UI that a session existed across page reload, so we can render the
// signed-in view without flashing a login screen while the cookie-backed
// refresh round-trip resolves. It carries no secret material.
const SESSION_MARKER_KEY = 'leasefi_session';

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

/**
 * Inverse of `mapServerUserInfo` for the subset of fields that
 * `PATCH /users/me` accepts. Only writes a key when the caller actually
 * supplied one, so a partial update never accidentally clears a stored
 * field by sending `undefined`.
 */
function toPatchProfileBody(updates: Partial<UserProfile>): PatchProfileBody {
  const body: PatchProfileBody = {};
  if (updates.firstName !== undefined) body.first_name = updates.firstName;
  if (updates.lastName !== undefined) body.last_name = updates.lastName;
  if (updates.phone !== undefined) body.phone = updates.phone;
  if (updates.bio !== undefined) body.bio = updates.bio;
  // `avatar` is the camelCase alias used across the UI; map it to the
  // wire-format `avatar_url` so callers that already have a URL (e.g. a
  // previously-uploaded asset being re-applied) can use the same patch path.
  if (updates.avatar !== undefined) body.avatar_url = updates.avatar;
  return body;
}

function mapServerUserInfo(info: ServerUserInfo): UserProfile {
  return {
    id: info.id,
    role: info.role as UserRole,
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
    const parsed = JSON.parse(raw) as Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
      createdAt: string;
      updatedAt?: string;
    };
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : undefined,
    };
  } catch {
    localStorage.removeItem(SESSION_MARKER_KEY);
    return null;
  }
}

function saveSessionMarker(profile: UserProfile): void {
  try {
    localStorage.setItem(SESSION_MARKER_KEY, JSON.stringify(profile));
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
