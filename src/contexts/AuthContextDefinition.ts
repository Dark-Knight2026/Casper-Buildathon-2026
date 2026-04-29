import { createContext } from 'react';
import type { User } from '@/types/user';
import type { ServerUserInfo } from '@/services/ico/backendAuthService';

// Re-export for convenience
export type { User };

// UserProfile is the authenticated user stored in context
export type UserProfile = User;

export interface AuthContextType {
  profile: UserProfile | null;
  loading: boolean;
  /**
   * Hydrate the AuthContext from a successful login response. Tokens are
   * delivered as HttpOnly cookies by the backend, so this only takes the
   * server's `UserInfo` payload.
   */
  setWalletSession: (user: ServerUserInfo) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  walletSignOut: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
