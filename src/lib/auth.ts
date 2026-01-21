/**
 * Authentication Manager
 * Handles user authentication, session management, and authorization
 */

import { apiClient } from './api-client';
import { logger } from '@/utils/logger';
import { User, UserRole } from '../types/user';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthManager {
  private state: AuthState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true
  };

  private listeners: Set<(state: AuthState) => void> = new Set();
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize auth manager
   */
  private async initialize() {
    try {
      // Load tokens from storage
      const tokens = this.loadTokens();

      if (tokens) {
        this.state.tokens = tokens;
        // apiClient.setAuthToken(tokens.accessToken);

        // Verify token and load user
        await this.loadUser();

        // Setup token refresh
        this.setupTokenRefresh();
      }
    } catch (error) {
      logger.error('[Auth] Initialization failed:', error);
      this.clearAuth();
    } finally {
      this.state.isLoading = false;
      this.notifyListeners();
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await apiClient.post<{ user: User; tokens: AuthTokens }>(
        '/auth/login',
        credentials
      );

      const { user, tokens } = response as unknown as { user: User; tokens: AuthTokens };

      // Save tokens
      this.saveTokens(tokens, credentials.rememberMe);
      
      // Update state
      this.state.user = user;
      this.state.tokens = tokens;
      this.state.isAuthenticated = true;

      // Set API client token
      // apiClient.setAuthToken(tokens.accessToken);

      // Setup token refresh
      this.setupTokenRefresh();

      this.notifyListeners();

      return user;
    } catch (error) {
      logger.error('[Auth] Login failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<User> {
    try {
      const response = await apiClient.post<{ user: User; tokens: AuthTokens }>(
        '/auth/register',
        data
      );

      const { user, tokens } = response as unknown as { user: User; tokens: AuthTokens };

      this.saveTokens(tokens, true);

      this.state.user = user;
      this.state.tokens = tokens;
      this.state.isAuthenticated = true;

      // apiClient.setAuthToken(tokens.accessToken);
      this.setupTokenRefresh();
      this.notifyListeners();

      return user;
    } catch (error) {
      logger.error('[Auth] Registration failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      // Call logout endpoint
      await apiClient.post('/auth/logout');
    } catch (error) {
      logger.error('[Auth] Logout request failed:', error);
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<boolean> {
    if (!this.state.tokens?.refreshToken) {
      return false;
    }

    try {
      const response = await apiClient.post<{ tokens: AuthTokens }>(
        '/auth/refresh',
        { refreshToken: this.state.tokens.refreshToken }
      );

      const { tokens } = response as unknown as { tokens: AuthTokens };

      // Update tokens
      this.saveTokens(tokens);
      this.state.tokens = tokens;
      // apiClient.setAuthToken(tokens.accessToken);

      // Reset refresh timer
      this.setupTokenRefresh();
      this.notifyListeners();

      return true;
    } catch (error) {
      logger.error('[Auth] Token refresh failed:', error);
      this.clearAuth();
      return false;
    }
  }

  /**
   * Load current user
   */
  private async loadUser(): Promise<void> {
    try {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      this.state.user = (response as unknown as { user: User }).user;
      this.state.isAuthenticated = true;
      this.notifyListeners();
    } catch (error) {
      logger.error('[Auth] Load user failed:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.patch<{ user: User }>(
        '/auth/profile',
        updates
      );

      this.state.user = (response as unknown as { user: User }).user;
      this.notifyListeners();

      return (response as unknown as { user: User }).user;
    } catch (error) {
      logger.error('[Auth] Update profile failed:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
    } catch (error) {
      logger.error('[Auth] Change password failed:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error) {
      logger.error('[Auth] Password reset request failed:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword
      });
    } catch (error) {
      logger.error('[Auth] Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      await apiClient.post('/auth/verify-email', { token });

      if (this.state.user) {
        this.state.user = { ...this.state.user };
        this.notifyListeners();
      }
    } catch (error) {
      logger.error('[Auth] Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.state.tokens) {
      return;
    }

    // Refresh 5 minutes before expiry
    const refreshTime = (this.state.tokens.expiresIn - 300) * 1000;
    
    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshTime);
  }

  /**
   * Save tokens to storage
   */
  private saveTokens(tokens: AuthTokens, persistent: boolean = false) {
    const storage = persistent ? localStorage : sessionStorage;
    storage.setItem('auth_tokens', JSON.stringify(tokens));
  }

  /**
   * Load tokens from storage
   */
  private loadTokens(): AuthTokens | null {
    try {
      const tokens = localStorage.getItem('auth_tokens') || 
                    sessionStorage.getItem('auth_tokens');
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      logger.error('[Auth] Failed to load tokens:', error);
      return null;
    }
  }

  /**
   * Clear authentication state
   */
  private clearAuth() {
    this.state.user = null;
    this.state.tokens = null;
    this.state.isAuthenticated = false;

    localStorage.removeItem('auth_tokens');
    sessionStorage.removeItem('auth_tokens');

    // apiClient.clearAuthToken();

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.notifyListeners();
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.state.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: UserRole): boolean {
    return this.state.user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: UserRole[]): boolean {
    return this.state.user ? roles.includes(this.state.user.role) : false;
  }

  /**
   * Check if auth is loading
   */
  isLoading(): boolean {
    return this.state.isLoading;
  }
}

// Export singleton instance
export const authManager = new AuthManager();

// Export class for custom instances
export { AuthManager };

// Export types
export type { AuthTokens, LoginCredentials, RegisterData, AuthState };