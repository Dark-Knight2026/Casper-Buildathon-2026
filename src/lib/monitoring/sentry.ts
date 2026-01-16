/**
 * Sentry Error Tracking and Monitoring Configuration
 * 
 * This module configures Sentry for comprehensive error tracking,
 * performance monitoring, and user feedback collection.
 * 
 * Features:
 * - Automatic error capture and reporting
 * - Performance monitoring with transaction tracing
 * - User context and session tracking
 * - Source map support for better stack traces
 * - Custom error boundaries integration
 * - User feedback collection
 * 
 * @module monitoring/sentry
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { useEffect } from 'react';
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';

/**
 * Sentry Configuration Interface
 */
interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  beforeSend?: (event: Sentry.Event, hint: Sentry.EventHint) => Sentry.Event | null;
}

/**
 * Initialize Sentry with production-ready configuration
 * 
 * @param config - Sentry configuration options
 */
export function initializeSentry(config?: Partial<SentryConfig>): void {
  const defaultConfig: SentryConfig = {
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
    environment: import.meta.env.VITE_ENVIRONMENT || 'production',
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    
    // Performance Monitoring
    tracesSampleRate: import.meta.env.VITE_ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Filter sensitive data before sending
    beforeSend: (event, hint) => {
      // Filter out sensitive information
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
      
      // Filter out PII from user data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      
      return event;
    },
  };

  const finalConfig = { ...defaultConfig, ...config };

  if (!finalConfig.dsn) {
    console.warn('Sentry DSN not configured. Error tracking is disabled.');
    return;
  }

  Sentry.init({
    dsn: finalConfig.dsn,
    environment: finalConfig.environment,
    release: finalConfig.release,
    
    // Performance Monitoring
    integrations: [
      new BrowserTracing({
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    tracesSampleRate: finalConfig.tracesSampleRate,
    replaysSessionSampleRate: finalConfig.replaysSessionSampleRate,
    replaysOnErrorSampleRate: finalConfig.replaysOnErrorSampleRate,
    
    beforeSend: finalConfig.beforeSend,
    
    // Ignore common non-critical errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      'AbortError',
    ],
    
    // Deny URLs to prevent tracking
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });
}

/**
 * Set user context for error tracking
 * 
 * @param user - User information
 */
export function setUser(user: {
  id: string;
  role?: string;
  username?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    role: user.role,
    username: user.username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Set custom context for error tracking
 * 
 * @param key - Context key
 * @param value - Context value
 */
export function setContext(key: string, value: Record<string, any>): void {
  Sentry.setContext(key, value);
}

/**
 * Add breadcrumb for debugging
 * 
 * @param breadcrumb - Breadcrumb data
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}): void {
  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category || 'custom',
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture exception manually
 * 
 * @param error - Error to capture
 * @param context - Additional context
 */
export function captureException(
  error: Error,
  context?: {
    level?: Sentry.SeverityLevel;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
): void {
  Sentry.captureException(error, {
    level: context?.level || 'error',
    tags: context?.tags,
    extra: context?.extra,
  });
}

/**
 * Capture message manually
 * 
 * @param message - Message to capture
 * @param level - Severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
): void {
  Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
  });
}

/**
 * Start a new transaction for performance monitoring
 * 
 * @param name - Transaction name
 * @param op - Operation type
 * @returns Transaction object
 */
export function startTransaction(
  name: string,
  op: string = 'custom'
): Sentry.Transaction {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Measure function execution time
 * 
 * @param name - Measurement name
 * @param fn - Function to measure
 * @returns Function result
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(name, 'function');
  
  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * Show user feedback dialog
 * 
 * @param options - Feedback options
 */
export function showFeedbackDialog(options?: {
  eventId?: string;
  title?: string;
  subtitle?: string;
  labelName?: string;
  labelEmail?: string;
  labelComments?: string;
  labelSubmit?: string;
  successMessage?: string;
}): void {
  const eventId = options?.eventId || Sentry.lastEventId();
  
  if (!eventId) {
    console.warn('No event ID available for feedback');
    return;
  }

  Sentry.showReportDialog({
    eventId,
    title: options?.title || 'It looks like we\'re having issues.',
    subtitle: options?.subtitle || 'Our team has been notified. If you\'d like to help, tell us what happened below.',
    labelName: options?.labelName || 'Name',
    labelEmail: options?.labelEmail || 'Email',
    labelComments: options?.labelComments || 'What happened?',
    labelSubmit: options?.labelSubmit || 'Submit',
    successMessage: options?.successMessage || 'Your feedback has been sent. Thank you!',
  });
}

/**
 * Error Boundary Component
 * 
 * Wrap your app or specific components with this to catch React errors
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Error Boundary Fallback Component
 */
export function ErrorFallback({ error, resetError }: {
  error: Error;
  resetError: () => void;
}): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Something went wrong
        </h2>
        
        <p className="text-center text-gray-600 mb-4">
          We've been notified and are working on a fix. Please try again.
        </p>
        
        {import.meta.env.DEV && (
          <div className="bg-gray-100 rounded p-3 mb-4 overflow-auto">
            <code className="text-xs text-red-600 break-all">
              {error.message}
            </code>
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={resetError}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={() => showFeedbackDialog()}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
          >
            Report Issue
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to capture errors in React components
 */
export function useErrorHandler(): (error: Error) => void {
  return (error: Error) => {
    captureException(error, {
      level: 'error',
      tags: { source: 'react-component' },
    });
  };
}

/**
 * Profiler component for performance monitoring
 */
export const Profiler = Sentry.Profiler;

/**
 * Export Sentry for advanced usage
 */
export { Sentry };

/**
 * Example Usage:
 * 
 * // In main.tsx or App.tsx
 * import { initializeSentry, ErrorBoundary, ErrorFallback } from '@/lib/monitoring/sentry';
 * 
 * initializeSentry();
 * 
 * <ErrorBoundary fallback={ErrorFallback}>
 *   <App />
 * </ErrorBoundary>
 * 
 * // In components
 * import { captureException, addBreadcrumb, setUser } from '@/lib/monitoring/sentry';
 * 
 * // Track user
 * setUser({ id: user.id, role: user.role, username: user.username });
 * 
 * // Add breadcrumb
 * addBreadcrumb({
 *   message: 'User clicked submit button',
 *   category: 'user-action',
 *   level: 'info',
 * });
 * 
 * // Capture error
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   captureException(error, {
 *     level: 'error',
 *     tags: { operation: 'async-operation' },
 *     extra: { additionalData: 'value' },
 *   });
 * }
 */