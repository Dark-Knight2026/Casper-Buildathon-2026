import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContextDefinition';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const isAuthenticated = (!!context.user && !!context.profile) || !!context.walletProfile;
  // Wallet profile takes priority only when there's no Supabase profile
  const profile = context.profile ?? context.walletProfile;

  return {
    ...context,
    profile,
    isAuthenticated,
  };
};