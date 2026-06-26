/**
 * Supabase Client Configuration
 * Centralized client for all Supabase operations with enhanced error handling and session management
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import type { Database } from '@/types/supabase';
import { getUserFriendlyError, isAuthError } from '@/lib/validation';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'lease-management-system'
    }
  }
});

/**
 * Session management
 */
let sessionCheckInterval: NodeJS.Timeout | null = null;

/**
 * Start monitoring session expiration
 */
export function startSessionMonitoring(onSessionExpired: () => void) {
  // Check session every 5 minutes
  sessionCheckInterval = setInterval(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      onSessionExpired();
      stopSessionMonitoring();
    }
  }, 5 * 60 * 1000);
}

/**
 * Stop monitoring session
 */
export function stopSessionMonitoring() {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
}

/**
 * Refresh session token
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      logger.error('Failed to refresh session:', error);
      return false;
    }
    return !!data.session;
  } catch (error) {
    logger.error('Error refreshing session:', error);
    return false;
  }
}

/**
 * Error handling wrapper for Supabase operations
 * Provides consistent error handling across the application
 */
export async function handleSupabaseError<T>(
  operation: () => Promise<{ data: T | null; error: { message?: string } | null }>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await operation();
    if (error) {
      logger.error('Supabase operation error:', error);
      
      // Handle authentication errors
      if (isAuthError(error)) {
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        return { data: null, error: new Error('Your session has expired. Please log in again.') };
      }
      
      // Handle other errors
      const friendlyMessage = getUserFriendlyError(error);
      return { data: null, error: new Error(friendlyMessage) };
    }
    return { data, error: null };
  } catch (error) {
    logger.error('Unexpected error in Supabase operation:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('An unexpected error occurred') 
    };
  }
}

/**
 * Type-safe query builder helper
 */
export type SupabaseQuery<T> = ReturnType<typeof supabase.from<T>>;

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      logger.error('Error checking authentication:', error);
      return false;
    }
    
    // Check if session is expired
    if (session) {
      const expiresAt = session.expires_at;
      if (expiresAt && expiresAt * 1000 < Date.now()) {
        // Try to refresh
        const refreshed = await refreshSession();
        return refreshed;
      }
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error in isAuthenticated:', error);
    return false;
  }
}

/**
 * Helper to get current user with retry
 */
export async function getCurrentUser(retryOnError = true) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      logger.error('Error getting current user:', error);
      
      // Try to refresh session and retry once
      if (retryOnError && isAuthError(error)) {
        const refreshed = await refreshSession();
        if (refreshed) {
          return getCurrentUser(false); // Retry without further retries
        }
      }
      return null;
    }
    return user;
  } catch (error) {
    logger.error('Unexpected error getting current user:', error);
    return null;
  }
}

/**
 * Helper to get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

/**
 * Helper to safely execute authenticated operations
 */
export async function withAuth<T>(
  operation: (userId: string) => Promise<T>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        data: null,
        error: new Error('You must be logged in to perform this action')
      };
    }
    const data = await operation(userId);
    return { data, error: null };
  } catch (error) {
    logger.error('Error in authenticated operation:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Operation failed')
    };
  }
}

/**
 * Sign out user and clear session
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    stopSessionMonitoring();
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Error signing out:', error);
      return { error: new Error('Failed to sign out') };
    }
    return { error: null };
  } catch (error) {
    logger.error('Unexpected error signing out:', error);
    return {
      error: error instanceof Error ? error : new Error('Failed to sign out')
    };
  }
}

/**
 * Initialize auth listener for session changes
 */
export function initAuthListener(
  onAuthChange: (authenticated: boolean) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    logger.debug('Auth state changed:', event);
    
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      onAuthChange(!!session);
    }
    
    if (event === 'SIGNED_IN') {
      onAuthChange(true);
      startSessionMonitoring(() => {
        onAuthChange(false);
      });
    }
  });
  
  return subscription;
}