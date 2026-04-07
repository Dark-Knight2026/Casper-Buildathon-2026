import { useCallback, useState } from 'react';
import { AuthContext, UserProfile } from './AuthContextDefinition';
import { applyToken } from '@/services/ico/backendAuthService';
import { backendClient } from '@/lib/api-client';

const WALLET_JWT_KEY = 'leasefi_jwt';

function decodeJwt(token: string): { sub: string; role: string; exp: number } | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (Date.now() / 1000 > payload.exp) {
      localStorage.removeItem(WALLET_JWT_KEY);
      return null;
    }
    return payload;
  } catch {
    localStorage.removeItem(WALLET_JWT_KEY);
    return null;
  }
}

function buildMinimalProfile(sub: string, role: string): UserProfile {
  return {
    id: sub,
    role: role as UserProfile['role'],
    email: '',
    firstName: 'User',
    lastName: '',
    createdAt: new Date(),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Single source of truth — initialized synchronously from JWT, no async fetch on mount.
  // When GET /api/v1/users/me is ready on the backend, call updateProfile() after login
  // to hydrate the full profile.
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const token = localStorage.getItem(WALLET_JWT_KEY);
    if (!token) return null;
    const payload = decodeJwt(token);
    if (!payload) return null;
    applyToken(token);
    return buildMinimalProfile(payload.sub, payload.role);
  });

  const [loading] = useState(false);

  const setWalletSession = useCallback((token: string, userId: string, role: string) => {
    localStorage.setItem(WALLET_JWT_KEY, token);
    applyToken(token);
    setProfile(buildMinimalProfile(userId, role));
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const updated = await backendClient.put<UserProfile>('/api/v1/users/me', updates);
    setProfile(updated);
  }, []);

  const walletSignOut = useCallback(() => {
    localStorage.removeItem(WALLET_JWT_KEY);
    applyToken(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ profile, loading, setWalletSession, updateProfile, walletSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};
