import { createContext } from 'react';
import type { UserProfile } from '@/types/user';
import type { ServerUserInfo } from '@/types/serverUser';

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
  /**
   * Re-fetch the authenticated profile from the backend and overwrite the
   * cached state + session marker. Use this after operations that mutate
   * server-side state outside of `updateProfile` (avatar upload, email
   * confirmation, role switch) so consumers like the Navbar pick up fresh
   * fields without a page reload.
   */
  refreshProfile: () => Promise<void>;
  walletSignOut: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
