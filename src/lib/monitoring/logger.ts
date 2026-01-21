/**
 * Centralized Logging Service
 * 
 * This module provides a comprehensive logging infrastructure with:
 * - Multiple log levels (debug, info, warn, error, fatal)
 * - Structured logging with context
 * - Log retention policies
 * - Integration with monitoring services
 * - Development and production modes
 * 
 * @module monitoring/logger
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * Log level names
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

/**
 * Log entry interface
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
  error?: Error;
  stack?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStoredLogs: number;
  retentionDays: {
    debug: number;
    info: number;
    warn: number;
    error: number;
    fatal: number;
  };
}

/**
 * Logger class
 */
class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private userId?: string;
  private sessionId: string;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      maxStoredLogs: 1000,
      retentionDays: {
        debug: 1,
        info: 7,
        warn: 14,
        error: 30,
        fatal: 90,
      },
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.initializeStorage();
    this.setupPeriodicCleanup();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Initialize log storage
   */
  private initializeStorage(): void {
    if (!this.config.enableStorage) return;

    try {
      const stored = localStorage.getItem('app_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
        this.cleanupOldLogs();
      }
    } catch (error) {
      console.warn('Failed to load stored logs:', error);
    }
  }

  /**
   * Set user context
   */
  setUser(userId: string): void {
    this.userId = userId;
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    this.userId = undefined;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log fatal error
   */
  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    // Check if level is enabled
    if (level < this.config.minLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      error,
      stack: error?.stack,
      userId: this.userId,
      sessionId: this.sessionId,
    };

    // Store log
    if (this.config.enableStorage) {
      this.storeLogs(entry);
    }

    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }
  }

  /**
   * Store log entry
   */
  private storeLogs(entry: LogEntry): void {
    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.config.maxStoredLogs) {
      this.logs.shift();
    }

    // Persist to localStorage
    try {
      localStorage.setItem('app_logs', JSON.stringify(this.logs));
    } catch (error) {
      // Storage quota exceeded, clear old logs
      this.logs = this.logs.slice(-100);
      try {
        localStorage.setItem('app_logs', JSON.stringify(this.logs));
      } catch {
        // Still failing, disable storage
        this.config.enableStorage = false;
      }
    }
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry): void {
    const levelName = LOG_LEVEL_NAMES[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${levelName}]`;

    const logData: unknown[] = [prefix, entry.message];

    if (entry.context) {
      logData.push('\nContext:', entry.context);
    }

    if (entry.error) {
      logData.push('\nError:', entry.error);
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(...logData);
        break;
      case LogLevel.INFO:
        console.info(...logData);
        break;
      case LogLevel.WARN:
        console.warn(...logData);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(...logData);
        break;
    }
  }

  /**
   * Get all logs
   */
  getLogs(options?: {
    level?: LogLevel;
    startTime?: number;
    endTime?: number;
    userId?: string;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (options?.level !== undefined) {
      filtered = filtered.filter(log => log.level >= options.level!);
    }

    if (options?.startTime) {
      filtered = filtered.filter(log => log.timestamp >= options.startTime!);
    }

    if (options?.endTime) {
      filtered = filtered.filter(log => log.timestamp <= options.endTime!);
    }

    if (options?.userId) {
      filtered = filtered.filter(log => log.userId === options.userId);
    }

    return filtered;
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): LogEntry[] {
    return this.logs
      .filter(log => log.level >= LogLevel.ERROR)
      .slice(-count);
  }

  /**
   * Export logs
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'level', 'message', 'userId', 'sessionId', 'context'];
    const rows = this.logs.map(log => [
      new Date(log.timestamp).toISOString(),
      LOG_LEVEL_NAMES[log.level],
      log.message,
      log.userId || '',
      log.sessionId,
      JSON.stringify(log.context || {}),
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    try {
      localStorage.removeItem('app_logs');
    } catch (error) {
      console.warn('Failed to clear stored logs:', error);
    }
  }

  /**
   * Clean up old logs based on retention policy
   */
  private cleanupOldLogs(): void {
    const now = Date.now();
    const retentionMs = {
      [LogLevel.DEBUG]: this.config.retentionDays.debug * 24 * 60 * 60 * 1000,
      [LogLevel.INFO]: this.config.retentionDays.info * 24 * 60 * 60 * 1000,
      [LogLevel.WARN]: this.config.retentionDays.warn * 24 * 60 * 60 * 1000,
      [LogLevel.ERROR]: this.config.retentionDays.error * 24 * 60 * 60 * 1000,
      [LogLevel.FATAL]: this.config.retentionDays.fatal * 24 * 60 * 60 * 1000,
    };

    this.logs = this.logs.filter(log => {
      const age = now - log.timestamp;
      return age < retentionMs[log.level];
    });

    // Persist cleaned logs
    if (this.config.enableStorage) {
      try {
        localStorage.setItem('app_logs', JSON.stringify(this.logs));
      } catch (error) {
        console.warn('Failed to persist cleaned logs:', error);
      }
    }
  }

  /**
   * Set up periodic cleanup
   */
  private setupPeriodicCleanup(): void {
    // Clean up old logs every hour
    setInterval(() => {
      this.cleanupOldLogs();
    }, 60 * 60 * 1000);
  }

  /**
   * Get log statistics
   */
  getStatistics(): {
    total: number;
    byLevel: Record<string, number>;
    recentErrors: number;
    oldestLog?: number;
    newestLog?: number;
  } {
    const byLevel: Record<string, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      FATAL: 0,
    };

    this.logs.forEach(log => {
      byLevel[LOG_LEVEL_NAMES[log.level]]++;
    });

    const recentErrors = this.logs.filter(
      log => log.level >= LogLevel.ERROR && Date.now() - log.timestamp < 60 * 60 * 1000
    ).length;

    return {
      total: this.logs.length,
      byLevel,
      recentErrors,
      oldestLog: this.logs[0]?.timestamp,
      newestLog: this.logs[this.logs.length - 1]?.timestamp,
    };
  }
}

// Singleton instance
const logger = new Logger();

/**
 * Initialize logger with custom configuration
 */
export function initializeLogger(config?: Partial<LoggerConfig>): void {
  // Logger is already initialized, this is for custom configuration
  if (config) {
    Object.assign(logger['config'], config);
  }
}

/**
 * Set user context
 */
export function setLogUser(userId: string): void {
  logger.setUser(userId);
}

/**
 * Clear user context
 */
export function clearLogUser(): void {
  logger.clearUser();
}

/**
 * Log debug message
 */
export function debug(message: string, context?: Record<string, unknown>): void {
  logger.debug(message, context);
}

/**
 * Log info message
 */
export function info(message: string, context?: Record<string, unknown>): void {
  logger.info(message, context);
}

/**
 * Log warning message
 */
export function warn(message: string, context?: Record<string, unknown>): void {
  logger.warn(message, context);
}

/**
 * Log error message
 */
export function error(message: string, err?: Error, context?: Record<string, unknown>): void {
  logger.error(message, err, context);
}

/**
 * Log fatal error
 */
export function fatal(message: string, err?: Error, context?: Record<string, unknown>): void {
  logger.fatal(message, err, context);
}

/**
 * Get all logs
 */
export function getLogs(options?: {
  level?: LogLevel;
  startTime?: number;
  endTime?: number;
  userId?: string;
}): LogEntry[] {
  return logger.getLogs(options);
}

/**
 * Get recent errors
 */
export function getRecentErrors(count?: number): LogEntry[] {
  return logger.getRecentErrors(count);
}

/**
 * Export logs
 */
export function exportLogs(format?: 'json' | 'csv'): string {
  return logger.exportLogs(format);
}

/**
 * Clear all logs
 */
export function clearLogs(): void {
  logger.clearLogs();
}

/**
 * Get log statistics
 */
export function getLogStatistics() {
  return logger.getStatistics();
}

/**
 * Export logger instance for advanced usage
 */
export { logger };

/**
 * Example Usage:
 * 
 * // Initialize in main.tsx
 * import { initializeLogger } from '@/lib/monitoring/logger';
 * initializeLogger();
 * 
 * // Set user context
 * import { setLogUser } from '@/lib/monitoring/logger';
 * setLogUser(user.id);
 * 
 * // Log messages
 * import { debug, info, warn, error, fatal } from '@/lib/monitoring/logger';
 * 
 * debug('User clicked button', { buttonId: 'submit' });
 * info('User logged in', { userId: user.id, timestamp: Date.now() });
 * warn('API rate limit approaching', { remaining: 10, limit: 100 });
 * error('Failed to save data', new Error('Network error'), { userId: user.id });
 * fatal('Critical system error', new Error('Database connection lost'));
 * 
 * // Get logs
 * import { getLogs, getRecentErrors, LogLevel } from '@/lib/monitoring/logger';
 * 
 * const allLogs = getLogs();
 * const errorLogs = getLogs({ level: LogLevel.ERROR });
 * const recentErrors = getRecentErrors(5);
 * 
 * // Export logs
 * import { exportLogs } from '@/lib/monitoring/logger';
 * 
 * const jsonLogs = exportLogs('json');
 * const csvLogs = exportLogs('csv');
 * 
 * // Download logs
 * const blob = new Blob([jsonLogs], { type: 'application/json' });
 * const url = URL.createObjectURL(blob);
 * const a = document.createElement('a');
 * a.href = url;
 * a.download = 'logs.json';
 * a.click();
 */