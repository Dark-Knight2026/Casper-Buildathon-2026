import { createContext } from 'react';
import type { User } from '@/types/user';

// Re-export for convenience
export type { User };

// UserProfile is the authenticated user stored in context
export type UserProfile = User;

export interface AuthContextType {
  profile: UserProfile | null;
  loading: boolean;
  setWalletSession: (token: string, userId: string, role: string) => void; // sync — profile hydrates in background
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  walletSignOut: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
