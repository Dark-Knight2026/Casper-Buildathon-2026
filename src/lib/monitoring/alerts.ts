/**
 * Alerting Rules and Notification System
 * 
 * This module provides comprehensive alerting for:
 * - Error rate thresholds
 * - Downtime detection
 * - Performance degradation
 * - Database issues
 * - Security events
 * 
 * @module monitoring/alerts
 */

import { captureMessage } from './sentry';
import { getPerformanceSummary } from './performance';
import { getQueryMetricsSummary, getCacheStatistics } from './database';
import { getLogStatistics, LogLevel } from './logger';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Alert types
 */
export enum AlertType {
  ERROR_RATE = 'error_rate',
  DOWNTIME = 'downtime',
  PERFORMANCE = 'performance',
  DATABASE = 'database',
  SECURITY = 'security',
  RESOURCE = 'resource',
}

/**
 * Alert configuration
 */
interface AlertConfig {
  enabled: boolean;
  threshold: number;
  window: number; // Time window in milliseconds
  cooldown: number; // Cooldown period before re-alerting
}

/**
 * Alert rule interface
 */
interface AlertRule {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  name: string;
  description: string;
  config: AlertConfig;
  check: () => Promise<boolean>;
  message: (data?: any) => string;
}

/**
 * Alert notification interface
 */
interface AlertNotification {
  id: string;
  ruleId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  data?: any;
  acknowledged: boolean;
}

/**
 * Alert thresholds configuration
 */
export const ALERT_THRESHOLDS = {
  // Error rate (percentage)
  ERROR_RATE: {
    WARNING: 1, // 1% error rate
    CRITICAL: 5, // 5% error rate
  },
  
  // Downtime (milliseconds)
  DOWNTIME: {
    WARNING: 60000, // 1 minute
    CRITICAL: 300000, // 5 minutes
  },
  
  // Performance (milliseconds)
  PAGE_LOAD: {
    WARNING: 2000, // 2 seconds
    CRITICAL: 3000, // 3 seconds
  },
  API_RESPONSE: {
    WARNING: 500, // 500ms
    CRITICAL: 1000, // 1 second
  },
  
  // Database
  QUERY_DURATION: {
    WARNING: 500, // 500ms
    CRITICAL: 1000, // 1 second
  },
  CACHE_HIT_RATE: {
    WARNING: 70, // 70%
    CRITICAL: 50, // 50%
  },
  CONNECTION_POOL: {
    WARNING: 80, // 80% utilization
    CRITICAL: 95, // 95% utilization
  },
  
  // Security
  FAILED_LOGIN_ATTEMPTS: {
    WARNING: 5, // 5 attempts in 5 minutes
    CRITICAL: 10, // 10 attempts in 5 minutes
  },
  SUSPICIOUS_ACTIVITY: {
    WARNING: 3, // 3 events in 10 minutes
    CRITICAL: 5, // 5 events in 10 minutes
  },
} as const;

/**
 * Alert manager class
 */
class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private notifications: AlertNotification[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private maxNotifications = 100;
  private checkInterval?: NodeJS.Timeout;

  /**
   * Initialize alert manager
   */
  initialize(): void {
    this.registerDefaultRules();
    this.startMonitoring();
  }

  /**
   * Register default alert rules
   */
  private registerDefaultRules(): void {
    // Error Rate Alert
    this.registerRule({
      id: 'error-rate-warning',
      type: AlertType.ERROR_RATE,
      severity: AlertSeverity.WARNING,
      name: 'High Error Rate',
      description: 'Error rate exceeds warning threshold',
      config: {
        enabled: true,
        threshold: ALERT_THRESHOLDS.ERROR_RATE.WARNING,
        window: 5 * 60 * 1000, // 5 minutes
        cooldown: 15 * 60 * 1000, // 15 minutes
      },
      check: async () => {
        const stats = getLogStatistics();
        const totalLogs = stats.total;
        const errorLogs = stats.byLevel.ERROR + stats.byLevel.FATAL;
        const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;
        return errorRate > ALERT_THRESHOLDS.ERROR_RATE.WARNING;
      },
      message: (data) => `Error rate is ${data?.errorRate?.toFixed(2)}% (threshold: ${ALERT_THRESHOLDS.ERROR_RATE.WARNING}%)`,
    });

    this.registerRule({
      id: 'error-rate-critical',
      type: AlertType.ERROR_RATE,
      severity: AlertSeverity.CRITICAL,
      name: 'Critical Error Rate',
      description: 'Error rate exceeds critical threshold',
      config: {
        enabled: true,
        threshold: ALERT_THRESHOLDS.ERROR_RATE.CRITICAL,
        window: 5 * 60 * 1000,
        cooldown: 10 * 60 * 1000,
      },
      check: async () => {
        const stats = getLogStatistics();
        const totalLogs = stats.total;
        const errorLogs = stats.byLevel.ERROR + stats.byLevel.FATAL;
        const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;
        return errorRate > ALERT_THRESHOLDS.ERROR_RATE.CRITICAL;
      },
      message: (data) => `CRITICAL: Error rate is ${data?.errorRate?.toFixed(2)}% (threshold: ${ALERT_THRESHOLDS.ERROR_RATE.CRITICAL}%)`,
    });

    // Performance Alerts
    this.registerRule({
      id: 'page-load-warning',
      type: AlertType.PERFORMANCE,
      severity: AlertSeverity.WARNING,
      name: 'Slow Page Load',
      description: 'Page load time exceeds warning threshold',
      config: {
        enabled: true,
        threshold: ALERT_THRESHOLDS.PAGE_LOAD.WARNING,
        window: 5 * 60 * 1000,
        cooldown: 15 * 60 * 1000,
      },
      check: async () => {
        const summary = getPerformanceSummary();
        const avgPageLoad = summary.averages.PAGE_LOAD || 0;
        return avgPageLoad > ALERT_THRESHOLDS.PAGE_LOAD.WARNING;
      },
      message: (data) => `Page load time is ${data?.avgPageLoad?.toFixed(0)}ms (threshold: ${ALERT_THRESHOLDS.PAGE_LOAD.WARNING}ms)`,
    });

    this.registerRule({
      id: 'api-response-warning',
      type: AlertType.PERFORMANCE,
      severity: AlertSeverity.WARNING,
      name: 'Slow API Response',
      description: 'API response time exceeds warning threshold',
      config: {
        enabled: true,
        threshold: ALERT_THRESHOLDS.API_RESPONSE.WARNING,
        window: 5 * 60 * 1000,
        cooldown: 15 * 60 * 1000,
      },
      check: async () => {
        const summary = getPerformanceSummary();
        const apiMetrics = summary.apiMetrics;
        if (apiMetrics.length === 0) return false;
        
        const avgDuration = apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length;
        return avgDuration > ALERT_THRESHOLDS.API_RESPONSE.WARNING;
      },
      message: (data) => `API response time is ${data?.avgDuration?.toFixed(0)}ms (threshold: ${ALERT_THRESHOLDS.API_RESPONSE.WARNING}ms)`,
    });

    // Database Alerts
    this.registerRule({
      id: 'slow-query-warning',
      type: AlertType.DATABASE,
      severity: AlertSeverity.WARNING,
      name: 'Slow Database Queries',
      description: 'Database query duration exceeds warning threshold',
      config: {
        enabled: true,
        threshold: ALERT_THRESHOLDS.QUERY_DURATION.WARNING,
        window: 5 * 60 * 1000,
        cooldown: 15 * 60 * 1000,
      },
      check: async () => {
        const summary = getQueryMetricsSummary();
        return summary.averageDuration > ALERT_THRESHOLDS.QUERY_DURATION.WARNING;
      },
      message: (data) => `Average query duration is ${data?.avgDuration?.toFixed(0)}ms (threshold: ${ALERT_THRESHOLDS.QUERY_DURATION.WARNING}ms)`,
    });

    this.registerRule({
      id: 'cache-hit-rate-warning',
      type: AlertType.DATABASE,
      severity: AlertSeverity.WARNING,
      name: 'Low Cache Hit Rate',
      description: 'Cache hit rate below warning threshold',
      config: {
        enabled: true,
        threshold: ALERT_THRESHOLDS.CACHE_HIT_RATE.WARNING,
        window: 10 * 60 * 1000,
        cooldown: 30 * 60 * 1000,
      },
      check: async () => {
        const summary = getQueryMetricsSummary();
        return summary.cacheHitRate < ALERT_THRESHOLDS.CACHE_HIT_RATE.WARNING;
      },
      message: (data) => `Cache hit rate is ${data?.cacheHitRate?.toFixed(1)}% (threshold: ${ALERT_THRESHOLDS.CACHE_HIT_RATE.WARNING}%)`,
    });

    this.registerRule({
      id: 'cache-hit-rate-critical',
      type: AlertType.DATABASE,
      severity: AlertSeverity.CRITICAL,
      name: 'Critical Cache Hit Rate',
      description: 'Cache hit rate below critical threshold',
      config: {
        enabled: true,
        threshold: ALERT_THRESHOLDS.CACHE_HIT_RATE.CRITICAL,
        window: 10 * 60 * 1000,
        cooldown: 20 * 60 * 1000,
      },
      check: async () => {
        const summary = getQueryMetricsSummary();
        return summary.cacheHitRate < ALERT_THRESHOLDS.CACHE_HIT_RATE.CRITICAL;
      },
      message: (data) => `CRITICAL: Cache hit rate is ${data?.cacheHitRate?.toFixed(1)}% (threshold: ${ALERT_THRESHOLDS.CACHE_HIT_RATE.CRITICAL}%)`,
    });
  }

  /**
   * Register a custom alert rule
   */
  registerRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Unregister an alert rule
   */
  unregisterRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.config.enabled = enabled;
    }
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Check alerts every minute
    this.checkInterval = setInterval(() => {
      this.checkAllRules();
    }, 60 * 1000);

    // Initial check
    this.checkAllRules();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  /**
   * Check all alert rules
   */
  private async checkAllRules(): Promise<void> {
    for (const [ruleId, rule] of this.rules) {
      if (!rule.config.enabled) continue;

      // Check cooldown
      const lastAlert = this.lastAlertTime.get(ruleId);
      if (lastAlert && Date.now() - lastAlert < rule.config.cooldown) {
        continue;
      }

      try {
        const triggered = await rule.check();
        
        if (triggered) {
          await this.triggerAlert(rule);
        }
      } catch (error) {
        console.error(`Error checking alert rule ${ruleId}:`, error);
      }
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule, data?: any): Promise<void> {
    const notification: AlertNotification = {
      id: `${rule.id}-${Date.now()}`,
      ruleId: rule.id,
      type: rule.type,
      severity: rule.severity,
      message: rule.message(data),
      timestamp: Date.now(),
      data,
      acknowledged: false,
    };

    // Store notification
    this.notifications.push(notification);
    
    // Keep only recent notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications.shift();
    }

    // Update last alert time
    this.lastAlertTime.set(rule.id, Date.now());

    // Send to monitoring services
    await this.sendNotification(notification);

    // Log alert
    console.warn(`[ALERT] ${rule.name}: ${notification.message}`);
  }

  /**
   * Send notification to monitoring services
   */
  private async sendNotification(notification: AlertNotification): Promise<void> {
    // Send to Sentry
    const sentryLevel = this.getSentryLevel(notification.severity);
    captureMessage(
      `[${notification.type.toUpperCase()}] ${notification.message}`,
      sentryLevel,
      {
        tags: {
          alert_type: notification.type,
          alert_severity: notification.severity,
          rule_id: notification.ruleId,
        },
        extra: {
          notification_id: notification.id,
          timestamp: notification.timestamp,
          data: notification.data,
        },
      }
    );

    // Send to other notification channels (email, Slack, PagerDuty, etc.)
    // Implement based on your notification preferences
    await this.sendToNotificationChannels(notification);
  }

  /**
   * Send to external notification channels
   */
  private async sendToNotificationChannels(notification: AlertNotification): Promise<void> {
    // Example: Send to Slack
    if (notification.severity === AlertSeverity.CRITICAL) {
      // await sendToSlack(notification);
    }

    // Example: Send to PagerDuty
    if (notification.severity === AlertSeverity.CRITICAL) {
      // await sendToPagerDuty(notification);
    }

    // Example: Send email
    if (notification.severity >= AlertSeverity.ERROR) {
      // await sendEmail(notification);
    }
  }

  /**
   * Convert alert severity to Sentry level
   */
  private getSentryLevel(severity: AlertSeverity): 'info' | 'warning' | 'error' | 'fatal' {
    switch (severity) {
      case AlertSeverity.INFO:
        return 'info';
      case AlertSeverity.WARNING:
        return 'warning';
      case AlertSeverity.ERROR:
        return 'error';
      case AlertSeverity.CRITICAL:
        return 'fatal';
      default:
        return 'warning';
    }
  }

  /**
   * Get all notifications
   */
  getNotifications(options?: {
    type?: AlertType;
    severity?: AlertSeverity;
    acknowledged?: boolean;
    startTime?: number;
    endTime?: number;
  }): AlertNotification[] {
    let filtered = [...this.notifications];

    if (options?.type) {
      filtered = filtered.filter(n => n.type === options.type);
    }

    if (options?.severity) {
      filtered = filtered.filter(n => n.severity === options.severity);
    }

    if (options?.acknowledged !== undefined) {
      filtered = filtered.filter(n => n.acknowledged === options.acknowledged);
    }

    if (options?.startTime) {
      filtered = filtered.filter(n => n.timestamp >= options.startTime!);
    }

    if (options?.endTime) {
      filtered = filtered.filter(n => n.timestamp <= options.endTime!);
    }

    return filtered;
  }

  /**
   * Get unacknowledged notifications
   */
  getUnacknowledgedNotifications(): AlertNotification[] {
    return this.notifications.filter(n => !n.acknowledged);
  }

  /**
   * Acknowledge a notification
   */
  acknowledgeNotification(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.acknowledged = true;
    }
  }

  /**
   * Acknowledge all notifications
   */
  acknowledgeAllNotifications(): void {
    this.notifications.forEach(n => n.acknowledged = true);
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications = [];
  }

  /**
   * Get alert statistics
   */
  getStatistics(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    unacknowledged: number;
    recent: number; // Last hour
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let unacknowledged = 0;
    let recent = 0;

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    this.notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
      bySeverity[n.severity] = (bySeverity[n.severity] || 0) + 1;
      
      if (!n.acknowledged) unacknowledged++;
      if (n.timestamp > oneHourAgo) recent++;
    });

    return {
      total: this.notifications.length,
      byType,
      bySeverity,
      unacknowledged,
      recent,
    };
  }
}

// Singleton instance
const alertManager = new AlertManager();

/**
 * Initialize alert manager
 */
export function initializeAlerts(): void {
  alertManager.initialize();
}

/**
 * Register a custom alert rule
 */
export function registerAlertRule(rule: AlertRule): void {
  alertManager.registerRule(rule);
}

/**
 * Unregister an alert rule
 */
export function unregisterAlertRule(ruleId: string): void {
  alertManager.unregisterRule(ruleId);
}

/**
 * Enable/disable an alert rule
 */
export function setAlertRuleEnabled(ruleId: string, enabled: boolean): void {
  alertManager.setRuleEnabled(ruleId, enabled);
}

/**
 * Get all notifications
 */
export function getAlertNotifications(options?: {
  type?: AlertType;
  severity?: AlertSeverity;
  acknowledged?: boolean;
  startTime?: number;
  endTime?: number;
}): AlertNotification[] {
  return alertManager.getNotifications(options);
}

/**
 * Get unacknowledged notifications
 */
export function getUnacknowledgedAlerts(): AlertNotification[] {
  return alertManager.getUnacknowledgedNotifications();
}

/**
 * Acknowledge a notification
 */
export function acknowledgeAlert(notificationId: string): void {
  alertManager.acknowledgeNotification(notificationId);
}

/**
 * Acknowledge all notifications
 */
export function acknowledgeAllAlerts(): void {
  alertManager.acknowledgeAllNotifications();
}

/**
 * Clear all notifications
 */
export function clearAlertNotifications(): void {
  alertManager.clearNotifications();
}

/**
 * Get alert statistics
 */
export function getAlertStatistics() {
  return alertManager.getStatistics();
}

/**
 * Stop monitoring
 */
export function stopAlertMonitoring(): void {
  alertManager.stopMonitoring();
}

/**
 * Example Usage:
 * 
 * // Initialize in main.tsx
 * import { initializeAlerts } from '@/lib/monitoring/alerts';
 * initializeAlerts();
 * 
 * // Register custom alert rule
 * import { registerAlertRule, AlertType, AlertSeverity } from '@/lib/monitoring/alerts';
 * 
 * registerAlertRule({
 *   id: 'custom-alert',
 *   type: AlertType.PERFORMANCE,
 *   severity: AlertSeverity.WARNING,
 *   name: 'Custom Performance Alert',
 *   description: 'Custom performance threshold exceeded',
 *   config: {
 *     enabled: true,
 *     threshold: 1000,
 *     window: 5 * 60 * 1000,
 *     cooldown: 15 * 60 * 1000,
 *   },
 *   check: async () => {
 *     // Your custom check logic
 *     return false;
 *   },
 *   message: (data) => 'Custom alert message',
 * });
 * 
 * // Get notifications
 * import { getAlertNotifications, getUnacknowledgedAlerts } from '@/lib/monitoring/alerts';
 * 
 * const allAlerts = getAlertNotifications();
 * const criticalAlerts = getAlertNotifications({ severity: AlertSeverity.CRITICAL });
 * const unacknowledged = getUnacknowledgedAlerts();
 * 
 * // Acknowledge alerts
 * import { acknowledgeAlert, acknowledgeAllAlerts } from '@/lib/monitoring/alerts';
 * 
 * acknowledgeAlert(notificationId);
 * acknowledgeAllAlerts();
 * 
 * // Get statistics
 * import { getAlertStatistics } from '@/lib/monitoring/alerts';
 * 
 * const stats = getAlertStatistics();
 * console.log('Unacknowledged alerts:', stats.unacknowledged);
 */