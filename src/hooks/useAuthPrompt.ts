/**
 * useAuthPrompt Hook
 * 
 * Manages authentication prompts for guest users attempting restricted actions.
 * Provides a seamless way to trigger sign-up modals when users try to save/edit content.
 * 
 * Features:
 * - Detects guest vs authenticated state
 * - Triggers authentication modal for restricted actions
 * - Preserves user intent (redirect after login)
 * - Manages modal visibility state
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface AuthPromptOptions {
  action: string; // Description of what user was trying to do
  redirectPath?: string; // Where to redirect after successful auth
  onSuccess?: () => void; // Callback after successful authentication
}

export function useAuthPrompt() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptContext, setPromptContext] = useState<AuthPromptOptions | null>(null);

  /**
   * Check if user needs authentication and trigger prompt if needed
   * Returns true if action can proceed, false if auth is required
   */
  const requireAuth = useCallback((options: AuthPromptOptions): boolean => {
    if (isAuthenticated) {
      // User is authenticated, allow action
      return true;
    }

    // User is not authenticated, show prompt
    setPromptContext(options);
    setIsPromptOpen(true);

    // Save intent to localStorage for post-login redirect
    if (options.redirectPath) {
      localStorage.setItem('auth_redirect_intent', options.redirectPath);
    }
    if (options.action) {
      localStorage.setItem('auth_action_intent', options.action);
    }

    return false;
  }, [isAuthenticated]);

  /**
   * Close the authentication prompt modal
   */
  const closePrompt = useCallback(() => {
    setIsPromptOpen(false);
    setPromptContext(null);
  }, []);

  /**
   * Handle successful authentication
   * Executes callback and redirects if specified
   */
  const handleAuthSuccess = useCallback(() => {
    const redirectPath = localStorage.getItem('auth_redirect_intent');
    
    // Execute success callback if provided
    if (promptContext?.onSuccess) {
      promptContext.onSuccess();
    }

    // Clear stored intent
    localStorage.removeItem('auth_redirect_intent');
    localStorage.removeItem('auth_action_intent');

    // Close prompt
    closePrompt();

    // Redirect if path was specified
    if (redirectPath) {
      navigate(redirectPath);
    }
  }, [promptContext, navigate, closePrompt]);

  /**
   * Navigate to sign up page with context
   */
  const goToSignUp = useCallback(() => {
    const action = promptContext?.action || 'continue';
    navigate(`/auth/signup?intent=${encodeURIComponent(action)}`);
  }, [promptContext, navigate]);

  /**
   * Navigate to login page with context
   */
  const goToLogin = useCallback(() => {
    const action = promptContext?.action || 'continue';
    navigate(`/auth/login?intent=${encodeURIComponent(action)}`);
  }, [promptContext, navigate]);

  return {
    // State
    isAuthenticated,
    isPromptOpen,
    promptContext,
    
    // Methods
    requireAuth,
    closePrompt,
    handleAuthSuccess,
    goToSignUp,
    goToLogin,
  };
}

/**
 * Hook for saving guest progress to localStorage
 * Useful for preserving form data, favorites, etc. before authentication
 */
export function useGuestProgress<T = unknown>(key: string) {
  const { isAuthenticated } = useAuth();

  const saveProgress = useCallback((data: T) => {
    if (!isAuthenticated) {
      localStorage.setItem(`guest_progress_${key}`, JSON.stringify(data));
    }
  }, [isAuthenticated, key]);

  const loadProgress = useCallback((): T | null => {
    const stored = localStorage.getItem(`guest_progress_${key}`);
    if (stored) {
      try {
        return JSON.parse(stored) as T;
      } catch (e) {
        console.error('Failed to parse guest progress:', e);
        return null;
      }
    }
    return null;
  }, [key]);

  const clearProgress = useCallback(() => {
    localStorage.removeItem(`guest_progress_${key}`);
  }, [key]);

  return {
    saveProgress,
    loadProgress,
    clearProgress,
  };
}