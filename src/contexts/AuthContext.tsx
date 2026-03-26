import React, { useCallback, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { AuthContext, UserProfile } from './AuthContextDefinition';
import { applyToken } from '@/services/ico/backendAuthService';
import { logger } from '@/utils/logger';

const WALLET_JWT_KEY = 'leasefi_jwt';

function decodeWalletProfile(token: string): UserProfile | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { sub: string; role: string; exp: number };
    if (Date.now() / 1000 > payload.exp) {
      localStorage.removeItem(WALLET_JWT_KEY);
      return null;
    }
    const role = payload.role as UserProfile['role'];
    return { id: payload.sub, role, email: '' };
  } catch {
    localStorage.removeItem(WALLET_JWT_KEY);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Wallet JWT auth state — initialized from localStorage on mount
  const [walletProfile, setWalletProfile] = useState<UserProfile | null>(() => {
    const token = localStorage.getItem(WALLET_JWT_KEY);
    if (!token) return null;
    const decoded = decodeWalletProfile(token);
    if (decoded) applyToken(token);
    return decoded;
  });

  const fetchProfile = useCallback(async (userId: string, retries = 3): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116' && retries > 0) {
          logger.warn(`Profile not found, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(userId, retries - 1);
        }
        if (retries > 0) {
          logger.warn(`Error fetching profile, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(userId, retries - 1);
        }
        throw error;
      }

      if (!data) {
        logger.error('Profile data is null for user:', userId);
        setProfile(null);
        setLoading(false);
        return;
      }

      logger.info('Profile fetched successfully for user');
      setProfile(data as UserProfile);
    } catch (error) {
      logger.error('Error fetching profile after all retries:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else if (!walletProfile) {
        // Only set loading=false if there's no wallet session either
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, walletProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, role: 'landlord' | 'tenant') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    });
    if (error) throw error;

    if (data.user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase.from('profiles') as any).insert({
        id: data.user.id,
        email,
        role,
      });
      if (profileError) throw profileError;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any)
      .update(updates)
      .eq('id', user.id);
    if (error) throw error;
    await fetchProfile(user.id);
  };

  const setWalletSession = (token: string, userId: string, role: string) => {
    localStorage.setItem(WALLET_JWT_KEY, token);
    applyToken(token);
    setWalletProfile({
      id: userId,
      role: role as UserProfile['role'],
      email: '',
    });
  };

  const walletSignOut = () => {
    localStorage.removeItem(WALLET_JWT_KEY);
    applyToken(null);
    setWalletProfile(null);
  };

  const value = {
    user,
    profile,
    walletProfile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    setWalletSession,
    walletSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
