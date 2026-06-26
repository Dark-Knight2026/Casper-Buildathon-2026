/**
 * Authentication Service
 * Handles all authentication operations with Supabase Auth
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'tenant' | 'landlord' | 'vendor' | 'admin' | 'both';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  acceptTerms: boolean;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface MFASetupData {
  type: 'sms' | 'totp';
  phoneNumber?: string;
}

export interface MFAVerifyData {
  factorId: string;
  code: string;
}

interface AuditLogChanges {
  email?: string;
  role?: UserRole;
  [key: string]: unknown;
}

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<{ user: User; session: Session | null }> {
    try {
      if (!data.acceptTerms) {
        throw new Error('You must accept the terms of service');
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`,
          data: {
            full_name: data.fullName,
            phone: data.phone,
            role: data.role
          }
        }
      });

      if (authError) {
        logger.error('Registration error:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: data.email,
          full_name: data.fullName,
          phone: data.phone || null,
          role: data.role,
          email_verified: false,
          is_active: true
        });

      if (profileError) {
        logger.error('Profile creation error:', profileError);
        // Don't throw here, user is created in auth
      }

      // Log audit trail
      const auditChanges: AuditLogChanges = { email: data.email, role: data.role };
      await supabase.from('audit_logs').insert({
        user_id: authData.user.id,
        action: 'user_register',
        resource_type: 'user',
        resource_id: authData.user.id,
        changes: auditChanges
      });

      return { user: authData.user, session: authData.session };
    } catch (error) {
      logger.error('Error in register:', error);
      throw error instanceof Error ? error : new Error('Failed to register');
    }
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<{ user: User; session: Session }> {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (error) {
        logger.error('Login error:', error);
        throw new Error(error.message);
      }

      if (!authData.user || !authData.session) {
        throw new Error('Login failed');
      }

      // Update last login time
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', authData.user.id);

      // Log audit trail
      await supabase.from('audit_logs').insert({
        user_id: authData.user.id,
        action: 'user_login',
        resource_type: 'user',
        resource_id: authData.user.id,
        changes: null
      });

      return { user: authData.user, session: authData.session };
    } catch (error) {
      logger.error('Error in login:', error);
      throw error instanceof Error ? error : new Error('Failed to login');
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('Logout error:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Error in logout:', error);
      throw error instanceof Error ? error : new Error('Failed to logout');
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      logger.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      logger.error('Error getting current session:', error);
      return null;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logger.error('Error fetching user profile:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
        avatarUrl: data.avatar_url,
        role: data.role as UserRole,
        isActive: data.is_active,
        emailVerified: data.email_verified,
        phoneVerified: data.phone_verified,
        lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : null,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      logger.error('Error in getUserProfile:', error);
      return null;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        logger.error('Password reset error:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Error in sendPasswordResetEmail:', error);
      throw error instanceof Error ? error : new Error('Failed to send password reset email');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        logger.error('Password update error:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Error in resetPassword:', error);
      throw error instanceof Error ? error : new Error('Failed to reset password');
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`
        }
      });

      if (error) {
        logger.error('Resend verification error:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Error in resendVerificationEmail:', error);
      throw error instanceof Error ? error : new Error('Failed to resend verification email');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const profileUpdates: Record<string, unknown> = {};
      
      if (updates.fullName !== undefined) profileUpdates.full_name = updates.fullName;
      if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
      if (updates.avatarUrl !== undefined) profileUpdates.avatar_url = updates.avatarUrl;
      if (updates.role !== undefined) profileUpdates.role = updates.role;
      profileUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('users')
        .update(profileUpdates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Profile update error:', error);
        throw new Error('Failed to update profile');
      }

      if (!data) {
        throw new Error('Profile not found');
      }

      // Log audit trail
      const auditChanges: Record<string, unknown> = { ...updates };
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'update_profile',
        resource_type: 'user',
        resource_id: userId,
        changes: auditChanges
      });

      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
        avatarUrl: data.avatar_url,
        role: data.role as UserRole,
        isActive: data.is_active,
        emailVerified: data.email_verified,
        phoneVerified: data.phone_verified,
        lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : null,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      logger.error('Error in updateProfile:', error);
      throw error instanceof Error ? error : new Error('Failed to update profile');
    }
  }

  /**
   * Check if user has specific role
   */
  hasRole(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    // 'both' role has access to both tenant and landlord features
    if (userRole === 'both' && (roles.includes('tenant') || roles.includes('landlord'))) {
      return true;
    }

    // Admin has access to everything
    if (userRole === 'admin') {
      return true;
    }

    return roles.includes(userRole);
  }

  /**
   * Get redirect path based on user role
   */
  getRedirectPath(role: UserRole): string {
    switch (role) {
      case 'tenant':
        return '/tenant/dashboard';
      case 'landlord':
        return '/landlord/dashboard';
      case 'both':
        return '/tenant/dashboard'; // Default to tenant dashboard
      case 'admin':
        return '/admin/dashboard';
      case 'vendor':
        return '/vendor/dashboard';
      default:
        return '/';
    }
  }
}

export const authService = new AuthService();