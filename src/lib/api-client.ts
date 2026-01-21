/**
 * API Client with Enhanced Error Handling and Retry Logic
 * Provides robust API communication with automatic retries, timeout handling, and error recovery
 */

import { retryAsync, getUserFriendlyError, isNetworkError, isAuthError } from './validation';
import { logger } from '@/utils/logger';

export interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  onAuthError?: () => void;
}

export interface RequestOptions extends RequestInit {
  retry?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;
  private onAuthError?: () => void;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || '';
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.onAuthError = options.onAuthError;
  }

  /**
   * Make HTTP request with timeout and retry logic
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    const timeout = options.timeout || this.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, error);
      }
      throw error;
    }
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle authentication errors
    if (response.status === 401) {
      if (this.onAuthError) {
        this.onAuthError();
      }
      throw new ApiError('Unauthorized', 401);
    }

    // Handle forbidden errors
    if (response.status === 403) {
      throw new ApiError('Forbidden', 403);
    }

    // Handle not found errors
    if (response.status === 404) {
      throw new ApiError('Not Found', 404);
    }

    // Handle server errors
    if (response.status >= 500) {
      throw new ApiError('Internal Server Error', response.status);
    }

    // Handle client errors
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new ApiError(errorText, response.status);
    }

    // Parse JSON response
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return (await response.text()) as unknown as T;
    } catch (error) {
      throw new ApiError('Failed to parse response', response.status, error);
    }
  }

  /**
   * Make GET request
   */
  async get<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    const shouldRetry = options.retry !== false;
    const maxRetries = options.maxRetries || this.maxRetries;

    const makeRequest = async () => {
      const response = await this.fetchWithTimeout(fullUrl, {
        ...options,
        method: 'GET',
      });
      return this.handleResponse<T>(response);
    };

    if (shouldRetry) {
      return retryAsync(makeRequest, {
        maxAttempts: maxRetries,
        delayMs: this.retryDelay,
        backoff: true,
        onRetry: (attempt, error) => {
          logger.warn(`Retry attempt ${attempt} for GET ${url}:`, error.message);
        },
      });
    }

    return makeRequest();
  }

  /**
   * Make POST request
   */
  async post<T>(url: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    const shouldRetry = options.retry !== false;
    const maxRetries = options.maxRetries || this.maxRetries;

    const makeRequest = async () => {
      const response = await this.fetchWithTimeout(fullUrl, {
        ...options,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      return this.handleResponse<T>(response);
    };

    if (shouldRetry) {
      return retryAsync(makeRequest, {
        maxAttempts: maxRetries,
        delayMs: this.retryDelay,
        backoff: true,
        onRetry: (attempt, error) => {
          logger.warn(`Retry attempt ${attempt} for POST ${url}:`, error.message);
        },
      });
    }

    return makeRequest();
  }

  /**
   * Make PUT request
   */
  async put<T>(url: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    const shouldRetry = options.retry !== false;
    const maxRetries = options.maxRetries || this.maxRetries;

    const makeRequest = async () => {
      const response = await this.fetchWithTimeout(fullUrl, {
        ...options,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      return this.handleResponse<T>(response);
    };

    if (shouldRetry) {
      return retryAsync(makeRequest, {
        maxAttempts: maxRetries,
        delayMs: this.retryDelay,
        backoff: true,
        onRetry: (attempt, error) => {
          logger.warn(`Retry attempt ${attempt} for PUT ${url}:`, error.message);
        },
      });
    }

    return makeRequest();
  }

  /**
   * Make DELETE request
   */
  async delete<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    const shouldRetry = options.retry !== false;
    const maxRetries = options.maxRetries || this.maxRetries;

    const makeRequest = async () => {
      const response = await this.fetchWithTimeout(fullUrl, {
        ...options,
        method: 'DELETE',
      });
      return this.handleResponse<T>(response);
    };

    if (shouldRetry) {
      return retryAsync(makeRequest, {
        maxAttempts: maxRetries,
        delayMs: this.retryDelay,
        backoff: true,
        onRetry: (attempt, error) => {
          logger.warn(`Retry attempt ${attempt} for DELETE ${url}:`, error.message);
        },
      });
    }

    return makeRequest();
  }

  /**
   * Handle API errors and return user-friendly message
   */
  static handleError(error: unknown): string {
    if (error instanceof ApiError) {
      return getUserFriendlyError(error);
    }

    if (isNetworkError(error)) {
      return 'Unable to connect. Please check your internet connection.';
    }

    if (isAuthError(error)) {
      return 'Your session has expired. Please log in again.';
    }

    return getUserFriendlyError(error);
  }
}

// Create default API client instance
export const apiClient = new ApiClient({
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  onAuthError: () => {
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  },
});