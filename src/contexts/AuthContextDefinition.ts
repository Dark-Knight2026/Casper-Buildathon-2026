import { createContext } from 'react';
import type { UserProfile } from '@/types/user';
import type { ServerUserInfo } from '@/types/serverUser';

export interface AuthContextType {
  profile: UserProfile | null;
  loading: boolean;
  /**
   * Hydrate the AuthContext from a successful auth response (email/password
   * login, registration, wallet login, or a token-confirm flow). Tokens are
   * delivered as HttpOnly cookies by the backend, so this only takes the
   * server's `UserInfo` payload.
   */
  setSession: (user: ServerUserInfo) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  /**
   * Re-fetch the authenticated profile from the backend and overwrite the
   * cached state + session marker. Use this after operations that mutate
   * server-side state outside of `updateProfile` (avatar upload, email
   * confirmation, role switch, wallet linking) so consumers like the Navbar
   * pick up fresh fields without a page reload.
   */
  refreshProfile: () => Promise<void>;
  /** Clear the local session and best-effort revoke it server-side. */
  signOut: () => void;
  /**
   * @deprecated Use {@link setSession}. Alias kept during the auth refactor so
   * existing call sites keep compiling; remove once all consumers migrate.
   */
  setWalletSession: (user: ServerUserInfo) => void;
  /**
   * @deprecated Use {@link signOut}. Alias kept during the auth refactor; remove
   * once all consumers migrate.
   */
  walletSignOut: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
