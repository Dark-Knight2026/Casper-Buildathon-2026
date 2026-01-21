/**
 * Centralized Error Handling Service
 * Provides consistent error handling across the application
 */

import { logger } from './loggingService';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', 401, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, context);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 503, context);
    this.name = 'NetworkError';
  }
}

interface ErrorResponse {
  message: string;
  code: string;
  statusCode: number;
  userMessage: string;
}

class ErrorHandlingService {
  /**
   * Handle errors and return user-friendly messages
   */
  handleError(error: unknown, context?: Record<string, unknown>): ErrorResponse {
    // Log the error
    if (error instanceof Error) {
      logger.error(error.message, error, context);
    } else {
      logger.error('Unknown error occurred', undefined, { error, ...context });
    }

    // Convert to AppError if not already
    const appError = this.normalizeError(error);

    return {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      userMessage: this.getUserFriendlyMessage(appError),
    };
  }

  /**
   * Normalize any error to AppError
   */
  private normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('auth')) {
        return new AuthenticationError(error.message);
      }
      if (error.message.includes('permission') || error.message.includes('forbidden')) {
        return new AuthorizationError(error.message);
      }
      if (error.message.includes('not found')) {
        return new NotFoundError('Resource');
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return new NetworkError(error.message);
      }

      return new AppError(error.message, 'UNKNOWN_ERROR', 500);
    }

    return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 500);
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: AppError): string {
    const messageMap: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again.',
      AUTH_ERROR: 'Please sign in to continue.',
      AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
      NOT_FOUND: 'The requested resource could not be found.',
      NETWORK_ERROR: 'Network connection issue. Please check your internet connection.',
      UNKNOWN_ERROR: 'Something went wrong. Please try again later.',
    };

    return messageMap[error.code] || error.message;
  }

  /**
   * Handle async operations with error handling
   */
  async handleAsync<T>(
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<{ data: T | null; error: ErrorResponse | null }> {
    try {
      const data = await operation();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error, context) };
    }
  }

  /**
   * Wrap a function with error handling
   */
  wrap<T extends (...args: never[]) => Promise<unknown>>(
    fn: T,
    context?: Record<string, unknown>
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        throw this.normalizeError(error);
      }
    }) as T;
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlingService();

// Export utility function for easy use
export const handleError = (error: unknown, context?: Record<string, unknown>) =>
  errorHandler.handleError(error, context);