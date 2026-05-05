/**
 * Centralized logging service with environment-aware log levels
 * 
 * Usage:
 * import { logger } from '@/utils/logger';
 * 
 * logger.debug('Debug message', { data });
 * logger.info('Info message');
 * logger.warn('Warning message');
 * logger.error('Error message', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
}

class Logger {
  private config: LoggerConfig;
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    const isDevelopment = import.meta.env.DEV;
    const isProduction = import.meta.env.PROD;

    this.config = {
      enabled: true,
      level: isDevelopment ? 'debug' : 'warn',
      enableConsole: isDevelopment,
      enableRemote: isProduction,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return this.logLevels[level] >= this.logLevels[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  private sendToRemote(_level: LogLevel, _message: string, _data?: Record<string, unknown>): void {
    if (!this.config.enableRemote) return;

    // TODO: Integrate with error tracking service (e.g., Sentry).
    // Example: Sentry.captureMessage(_message, { level: _level, extra: _data });
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;

    if (this.config.enableConsole) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;

    if (this.config.enableConsole) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;

    if (this.config.enableConsole) {
      console.warn(this.formatMessage('warn', message, data));
    }

    this.sendToRemote('warn', message, data);
  }

  error(message: string, error?: Error | unknown): void {
    if (!this.shouldLog('error')) return;

    const errorData: Record<string, unknown> | undefined =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error !== undefined
          ? { value: error }
          : undefined;

    if (this.config.enableConsole) {
      console.error(this.formatMessage('error', message, errorData));
    }

    this.sendToRemote('error', message, errorData);
  }

  // Utility method to log API calls
  logApiCall(method: string, url: string, status?: number, error?: Error | unknown): void {
    const message = `API ${method} ${url}`;
    
    if (error) {
      this.error(`${message} failed`, error);
    } else if (status && status >= 400) {
      this.warn(`${message} returned ${status}`);
    } else {
      this.debug(`${message} succeeded`, { status });
    }
  }

  // Utility method to log user actions
  logUserAction(action: string, details?: Record<string, unknown>): void {
    this.info(`User action: ${action}`, details);
  }

  // Method to temporarily enable/disable logging
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  // Method to change log level at runtime
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for external use
export type { LogLevel };