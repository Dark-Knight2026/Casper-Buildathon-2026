/**
 * Centralized Logging Service
 * Provides environment-aware logging with different log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class LoggingService {
  private isDevelopment: boolean;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      this.log('debug', message, context);
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context || '');
    } else {
      // In production, send to monitoring service
      this.sendToMonitoring('warn', message, context);
    }
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
    
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error || '', context || '');
    } else {
      // In production, send to monitoring service
      this.sendToMonitoring('error', message, { ...context, error: error?.message });
    }
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    this.logHistory.push(entry);

    // Maintain max history size
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  /**
   * Send logs to monitoring service (placeholder for production)
   */
  private sendToMonitoring(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    // TODO: Integrate with monitoring service (Sentry, LogRocket, etc.)
    // For now, just store in history
    if (level === 'error' || level === 'warn') {
      // Could send to backend API endpoint for logging
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          context,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silently fail if logging endpoint is not available
      });
    }
  }

  /**
   * Get log history (useful for debugging)
   */
  getHistory(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logHistory.filter((entry) => entry.level === level);
    }
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }
}

// Export singleton instance
export const logger = new LoggingService();