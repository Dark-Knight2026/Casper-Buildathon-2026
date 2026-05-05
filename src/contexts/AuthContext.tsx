import { useCallback, useEffect, useState } from 'react';
import { AuthContext } from './AuthContextDefinition';
import { backendClient } from '@/lib/api-client';
import {
  logoutSession,
  refreshSession,
  type ServerUserInfo,
} from '@/services/ico/backendAuthService';
import type { UserProfile, UserRole } from '@/types/user';

// Non-secret session marker. The actual auth tokens live in HttpOnly cookies
// set by the backend at /auth/login; this localStorage entry is just a hint to
// the UI that a session existed across page reload, so we can render the
// signed-in view without flashing a login screen while the cookie-backed
// refresh round-trip resolves. It carries no secret material.
const SESSION_MARKER_KEY = 'leasefi_session';

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
    walletAddress: info.wallet_address ?? undefined,
    isProfileComplete: info.is_profile_complete,
  };
}

function loadSessionMarker(): UserProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_MARKER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Omit<UserProfile, 'createdAt'> & { createdAt: string };
    return { ...parsed, createdAt: new Date(parsed.createdAt) };
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
    const updated = await backendClient.put<ServerUserInfo>('/api/v1/users/me', updates);
    const mapped = mapServerUserInfo(updated);
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
    <AuthContext.Provider value={{ profile, loading, setWalletSession, updateProfile, walletSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};
