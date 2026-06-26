import { logger } from '@/utils/logger';

/**
 * Error Logging Utility
 * Centralized error logging with context capture
 */

export interface ErrorContext {
  componentName?: string;
  userId?: string;
  timestamp: string;
  userAction?: string;
  formData?: Record<string, unknown>;
  url?: string;
  userAgent?: string;
  additionalInfo?: Record<string, unknown>;
}

export interface ErrorLog {
  error: Error;
  context: ErrorContext;
  severity: 'critical' | 'warning' | 'info';
  stackTrace?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100;

  /**
   * Log an error with context
   */
  log(error: Error, context: Partial<ErrorContext>, severity: 'critical' | 'warning' | 'info' = 'warning'): void {
    const errorLog: ErrorLog = {
      error,
      context: {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context
      },
      severity,
      stackTrace: error.stack
    };

    this.logs.push(errorLog);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to console based on severity
    this.logToConsole(errorLog);

    // Optional: Send to error tracking service
    this.sendToTrackingService(errorLog);
  }

  /**
   * Log to console with appropriate level
   */
  private logToConsole(errorLog: ErrorLog): void {
    const { error, context, severity } = errorLog;
    
    const logMessage = `[${severity.toUpperCase()}] ${error.message}`;
    const logData = {
      context,
      stackTrace: errorLog.stackTrace
    };

    switch (severity) {
      case 'critical':
        logger.error(logMessage, logData);
        break;
      case 'warning':
        logger.warn(logMessage, logData);
        break;
      case 'info':
        logger.info(logMessage, logData);
        break;
    }
  }

  /**
   * Send error to tracking service (e.g., Sentry, LogRocket)
   */
  private sendToTrackingService(errorLog: ErrorLog): void {
    // TODO: Integrate with error tracking service
    // Example: Sentry.captureException(errorLog.error, { contexts: { custom: errorLog.context } });
    // For now, just store locally
    try {
      const storedErrors = localStorage.getItem('error_logs');
      const errors = storedErrors ? JSON.parse(storedErrors) : [];
      errors.push({
        message: errorLog.error.message,
        context: errorLog.context,
        severity: errorLog.severity,
        timestamp: errorLog.context.timestamp
      });
      
      // Keep only last 50 errors in localStorage
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }

      localStorage.setItem('error_logs', JSON.stringify(errors));
    } catch (e) {
      logger.error('Failed to store error log:', e);
    }
  }

  /**
   * Get all logged errors
   */
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  /**
   * Get errors by severity
   */
  getLogsBySeverity(severity: 'critical' | 'warning' | 'info'): ErrorLog[] {
    return this.logs.filter(log => log.severity === severity);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number;
    critical: number;
    warning: number;
    info: number;
    byComponent: Record<string, number>;
  } {
    const stats = {
      total: this.logs.length,
      critical: 0,
      warning: 0,
      info: 0,
      byComponent: {} as Record<string, number>
    };

    this.logs.forEach(log => {
      stats[log.severity]++;
      if (log.context.componentName) {
        stats.byComponent[log.context.componentName] = 
          (stats.byComponent[log.context.componentName] || 0) + 1;
      }
    });

    return stats;
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

/**
 * Helper function to create user-friendly error messages
 */
export function getUserFriendlyMessage(error: Error): string {
  const errorMessage = error.message.toLowerCase();

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  // Authentication errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
    return 'Your session has expired. Please log in again.';
  }

  // Validation errors
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return 'Some information is missing or invalid. Please check your input and try again.';
  }

  // Permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
    return 'You don\'t have permission to perform this action.';
  }

  // Not found errors
  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return 'The requested resource could not be found.';
  }

  // Server errors
  if (errorMessage.includes('500') || errorMessage.includes('server error')) {
    return 'A server error occurred. Our team has been notified and is working on it.';
  }

  // Timeout errors
  if (errorMessage.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }

  // Default message
  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}

/**
 * Helper function to determine error severity
 */
export function getErrorSeverity(error: Error): 'critical' | 'warning' | 'info' {
  const errorMessage = error.message.toLowerCase();

  // Critical errors
  if (
    errorMessage.includes('fatal') ||
    errorMessage.includes('crash') ||
    errorMessage.includes('cannot read') ||
    errorMessage.includes('undefined is not')
  ) {
    return 'critical';
  }

  // Warning errors
  if (
    errorMessage.includes('failed') ||
    errorMessage.includes('error') ||
    errorMessage.includes('invalid')
  ) {
    return 'warning';
  }

  // Info level
  return 'info';
}