/**
 * Session Manager
 * Handles session timeout, auto-refresh, and activity tracking
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const REMEMBER_ME_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

class SessionManager {
  private inactivityTimer: NodeJS.Timeout | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private rememberMe: boolean = false;

  /**
   * Initialize session manager
   */
  initialize(rememberMe: boolean = false): void {
    this.rememberMe = rememberMe;
    this.startInactivityTimer();
    this.startRefreshTimer();
    this.setupActivityListeners();
  }

  /**
   * Start inactivity timer
   */
  private startInactivityTimer(): void {
    this.clearInactivityTimer();
    
    // Don't set inactivity timer if remember me is enabled
    if (this.rememberMe) {
      return;
    }

    this.inactivityTimer = setTimeout(() => {
      this.handleInactivityTimeout();
    }, INACTIVITY_TIMEOUT);
  }

  /**
   * Clear inactivity timer
   */
  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Handle inactivity timeout
   */
  private async handleInactivityTimeout(): Promise<void> {
    logger.debug('Session expired due to inactivity');
    await this.logout('Session expired due to inactivity');
  }

  /**
   * Start token refresh timer
   */
  private startRefreshTimer(): void {
    this.clearRefreshTimer();

    this.refreshTimer = setInterval(async () => {
      await this.refreshSession();
    }, REFRESH_INTERVAL);
  }

  /**
   * Clear refresh timer
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Refresh session
   */
  private async refreshSession(): Promise<void> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        logger.error('Session refresh failed:', error);
        await this.logout('Session expired');
        return;
      }

      // Check if token is about to expire (within 5 minutes)
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;

      if (timeUntilExpiry < 300) { // Less than 5 minutes
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          logger.error('Token refresh failed:', refreshError);
          await this.logout('Session expired');
        }
      }
    } catch (error) {
      logger.error('Error refreshing session:', error);
    }
  }

  /**
   * Setup activity listeners
   */
  private setupActivityListeners(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, this.handleActivity.bind(this), true);
    });

    // Listen for visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.handleActivity();
      }
    });
  }

  /**
   * Handle user activity
   */
  private handleActivity(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;

    // Only reset timer if enough time has passed (prevent excessive resets)
    if (timeSinceLastActivity > 1000) { // 1 second
      this.lastActivity = now;
      this.startInactivityTimer();
    }
  }

  /**
   * Logout and cleanup
   */
  private async logout(reason: string): Promise<void> {
    this.cleanup();

    await supabase.auth.signOut();

    // Notify user
    const event = new CustomEvent('session-expired', { detail: { reason } });
    window.dispatchEvent(event);

    // Redirect to login
    window.location.href = '/auth/login';
  }

  /**
   * Cleanup timers and listeners
   */
  cleanup(): void {
    this.clearInactivityTimer();
    this.clearRefreshTimer();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.removeEventListener(event, this.handleActivity.bind(this), true);
    });
  }

  /**
   * Set remember me preference
   */
  setRememberMe(rememberMe: boolean): void {
    this.rememberMe = rememberMe;

    if (rememberMe) {
      this.clearInactivityTimer();
      // Store preference
      localStorage.setItem('rememberMe', 'true');
    } else {
      this.startInactivityTimer();
      localStorage.removeItem('rememberMe');
    }
  }

  /**
   * Get remember me preference
   */
  getRememberMe(): boolean {
    return localStorage.getItem('rememberMe') === 'true';
  }

  /**
   * Check if session is active
   */
  async isSessionActive(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session !== null;
    } catch (error) {
      logger.error('Error checking session:', error);
      return false;
    }
  }

  /**
   * Get time until session expires
   */
  async getTimeUntilExpiry(): Promise<number> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.expires_at) {
        return 0;
      }

      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);

      return Math.max(0, expiresAt - now);
    } catch (error) {
      logger.error('Error getting expiry time:', error);
      return 0;
    }
  }
}

export const sessionManager = new SessionManager();