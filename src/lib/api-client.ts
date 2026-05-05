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
  /**
   * Called after a 401 has been observed and the refresh attempt also failed
   * (or refresh is disabled). The default implementation redirects to a login
   * page; supply a no-op when the consumer wants to keep the response and
   * surface the error itself.
   */
  onAuthError?: () => void;
  /**
   * If set, on 401 the client first POSTs here (with credentials) and, on
   * success, replays the original request once. Path is relative to `baseUrl`.
   * Leave undefined to disable transparent refresh entirely.
   */
  refreshPath?: string;
}

export interface RequestOptions extends RequestInit {
  retry?: boolean;
  maxRetries?: number;
  timeout?: number;
  /**
   * Skip the 401 → refresh → replay path for this single call. The
   * refresh and logout endpoints set this so they cannot recursively
   * trigger themselves.
   */
  skipRefresh?: boolean;
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
  private refreshPath?: string;
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || '';
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.onAuthError = options.onAuthError;
    this.refreshPath = options.refreshPath;
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
    const signals = [controller.signal, options.signal].filter(Boolean) as AbortSignal[];
    const combinedSignal =
      signals.length === 1
        ? signals[0]
        : typeof AbortSignal.any === 'function'
          ? AbortSignal.any(signals)
          : signals[0]; // degraded: timeout signal only on Safari < 17.2

    try {
      const response = await fetch(url, {
        // Auth tokens travel as HttpOnly cookies set at /auth/login. Without
        // `credentials: 'include'` the browser strips them on cross-origin
        // calls (Vite dev → backend on a different port), so every request
        // would 401.
        credentials: 'include',
        ...options,
        signal: combinedSignal,
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
   * Try to renew the session via the refresh endpoint. Concurrent callers
   * coalesce on the same in-flight promise so a burst of 401s triggers a
   * single refresh attempt.
   */
  private async tryRefresh(): Promise<boolean> {
    if (!this.refreshPath) return false;
    if (this.refreshInFlight) return this.refreshInFlight;

    const path = this.refreshPath;
    this.refreshInFlight = (async () => {
      try {
        const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          skipRefresh: true,
        });
        return response.ok;
      } catch (err) {
        logger.warn('Token refresh failed:', { error: (err as Error).message });
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle authentication errors
    if (response.status === 401) {
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
   * Wrap a request so a single 401 triggers refresh + replay. On refresh
   * failure (or when `skipRefresh` is set) the original 401 propagates and
   * `onAuthError` fires.
   */
  private async withAuthRetry<T>(
    request: () => Promise<T>,
    options: RequestOptions
  ): Promise<T> {
    try {
      return await request();
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.statusCode === 401 &&
        !options.skipRefresh &&
        this.refreshPath
      ) {
        const refreshed = await this.tryRefresh();
        if (refreshed) {
          return await request();
        }
        if (this.onAuthError) this.onAuthError();
      } else if (err instanceof ApiError && err.statusCode === 401 && this.onAuthError) {
        this.onAuthError();
      }
      throw err;
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
        headers: {
          ...options.headers,
        },
      });
      return this.handleResponse<T>(response);
    };

    const wrapped = () => this.withAuthRetry(makeRequest, options);

    if (shouldRetry) {
      return retryAsync(wrapped, {
        maxAttempts: maxRetries,
        delayMs: this.retryDelay,
        backoff: true,
        onRetry: (attempt, error) => {
          logger.warn(`Retry attempt ${attempt} for GET ${url}:`, { error: error.message });
        },
      });
    }

    return wrapped();
  }

  /**
   * Make POST request
   */
  async post<T>(url: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    // POST is non-idempotent: retry only when explicitly requested to avoid duplicate mutations.
    const shouldRetry = options.retry === true;
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

    const wrapped = () => this.withAuthRetry(makeRequest, options);

    if (shouldRetry) {
      return retryAsync(wrapped, {
        maxAttempts: maxRetries,
        delayMs: this.retryDelay,
        backoff: true,
        onRetry: (attempt, error) => {
          logger.warn(`Retry attempt ${attempt} for POST ${url}:`, { error: error.message });
        },
      });
    }

    return wrapped();
  }

  /**
   * Make PUT request
   */
  async put<T>(url: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    // PUT mutates state: retry only when explicitly requested to avoid unintended repeated writes.
    const shouldRetry = options.retry === true;
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

    const wrapped = () => this.withAuthRetry(makeRequest, options);

    if (shouldRetry) {
      return retryAsync(wrapped, {
        maxAttempts: maxRetries,
        delayMs: this.retryDelay,
        backoff: true,
        onRetry: (attempt, error) => {
          logger.warn(`Retry attempt ${attempt} for PUT ${url}:`, { error: error.message });
        },
      });
    }

    return wrapped();
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
        headers: {
          ...options.headers,
        },
      });
      return this.handleResponse<T>(response);
    };

    const wrapped = () => this.withAuthRetry(makeRequest, options);

    if (shouldRetry) {
      return retryAsync(wrapped, {
        maxAttempts: maxRetries,
        delayMs: this.retryDelay,
        backoff: true,
        onRetry: (attempt, error) => {
          logger.warn(`Retry attempt ${attempt} for DELETE ${url}:`, { error: error.message });
        },
      });
    }

    return wrapped();
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

// LeaseFi backend API client
export const backendClient = new ApiClient({
  baseUrl: import.meta.env.VITE_BACKEND_URL ?? '',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  refreshPath: '/api/v1/auth/refresh',
  onAuthError: () => {
    if (typeof window !== 'undefined') {
      // Strip the legacy localStorage session marker so ProtectedRoute /
      // AuthContext don't show a stale signed-in UI after the cookie was
      // already invalidated server-side.
      try {
        localStorage.removeItem('leasefi_session');
      } catch {
        // localStorage may be disabled (private mode, embedded webview).
      }
      window.location.href = '/auth/login';
    }
  },
});

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
