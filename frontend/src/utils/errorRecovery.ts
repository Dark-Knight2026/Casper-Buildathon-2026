/**
 * Error Recovery Utility
 * Provides recovery mechanisms for different error scenarios
 */

import { errorLogger } from './errorLogger';
import { logger } from '@/utils/logger';

export interface RecoveryOptions {
  autoSave?: boolean;
  redirectUrl?: string;
  retryAction?: () => Promise<void>;
  clearState?: boolean;
  showToast?: boolean;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  action?: 'retry' | 'redirect' | 'reload' | 'clear';
}

class ErrorRecovery {
  /**
   * Attempt to recover from an error
   */
  async recover(
    error: Error,
    componentName: string,
    options: RecoveryOptions = {}
  ): Promise<RecoveryResult> {
    const {
      autoSave = false,
      redirectUrl,
      retryAction,
      clearState = false,
      showToast = true
    } = options;

    try {
      // Log the recovery attempt
      errorLogger.log(
        error,
        {
          componentName,
          userAction: 'recovery_attempt',
          additionalInfo: { options }
        },
        'info'
      );

      // Auto-save if enabled
      if (autoSave) {
        await this.saveCurrentState(componentName);
      }

      // Clear state if requested
      if (clearState) {
        this.clearComponentState(componentName);
      }

      // Retry action if provided
      if (retryAction) {
        await retryAction();
        return {
          success: true,
          message: 'Operation completed successfully after retry',
          action: 'retry'
        };
      }

      // Redirect if URL provided
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return {
          success: true,
          message: 'Redirecting to safe page...',
          action: 'redirect'
        };
      }

      // Default: suggest page reload
      return {
        success: false,
        message: 'Please reload the page to continue',
        action: 'reload'
      };
    } catch (recoveryError) {
      errorLogger.log(
        recoveryError as Error,
        {
          componentName,
          userAction: 'recovery_failed',
          additionalInfo: { originalError: error.message }
        },
        'critical'
      );
      return {
        success: false,
        message: 'Recovery failed. Please contact support.',
        action: 'clear'
      };
    }
  }

  /**
   * Save current state to localStorage
   */
  private async saveCurrentState(componentName: string): Promise<void> {
    try {
      const stateKey = `${componentName}_recovery_state`;
      const timestamp = new Date().toISOString();

      // Get current state from sessionStorage or other sources
      const currentState = {
        timestamp,
        componentName,
        // Add any relevant state data here
      };

      localStorage.setItem(stateKey, JSON.stringify(currentState));
    } catch (error) {
      logger.error('Failed to save recovery state:', error);
    }
  }

  /**
   * Restore saved state
   */
  restoreState(componentName: string): Record<string, unknown> | null {
    try {
      const stateKey = `${componentName}_recovery_state`;
      const savedState = localStorage.getItem(stateKey);
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (error) {
      logger.error('Failed to restore state:', error);
    }
    return null;
  }

  /**
   * Clear component state
   */
  private clearComponentState(componentName: string): void {
    try {
      const stateKey = `${componentName}_recovery_state`;
      localStorage.removeItem(stateKey);
    } catch (error) {
      logger.error('Failed to clear component state:', error);
    }
  }

  /**
   * Check if recovery state exists
   */
  hasRecoveryState(componentName: string): boolean {
    try {
      const stateKey = `${componentName}_recovery_state`;
      return localStorage.getItem(stateKey) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff<T>(
    action: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await action();
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Safe navigation with error handling
   */
  safeNavigate(url: string, fallbackUrl: string = '/'): void {
    try {
      window.location.href = url;
    } catch (error) {
      logger.error('Navigation failed, using fallback:', error);
      window.location.href = fallbackUrl;
    }
  }

  /**
   * Clear all recovery states
   */
  clearAllRecoveryStates(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('_recovery_state')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      logger.error('Failed to clear recovery states:', error);
    }
  }
}

// Export singleton instance
export const errorRecovery = new ErrorRecovery();