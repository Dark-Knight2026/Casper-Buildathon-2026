import { createContext } from 'react';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  role: 'landlord' | 'tenant' | 'admin';
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  walletProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: 'landlord' | 'tenant') => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  setWalletSession: (token: string, userId: string, role: string) => void;
  walletSignOut: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);