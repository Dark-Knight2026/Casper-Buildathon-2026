/**
 * Query Monitor Service
 * Track and monitor database query performance
 */

import type {
  QueryLog,
  QueryMetrics,
  SlowQuery,
  QueryPattern,
  DatabaseMetrics,
  PerformanceAlert,
  IndexSuggestion,
  OptimizationReport,
} from '@/types/performance';

class QueryMonitorService {
  private queryLogs: QueryLog[] = [];
  private slowQueries: Map<string, SlowQuery> = new Map();
  private alerts: PerformanceAlert[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly MAX_LOGS = 1000; // Keep last 1000 queries

  /**
   * Log a query execution
   */
  logQuery(log: Omit<QueryLog, 'id' | 'timestamp'>): void {
    const queryLog: QueryLog = {
      ...log,
      id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.queryLogs.push(queryLog);

    // Keep only last MAX_LOGS entries
    if (this.queryLogs.length > this.MAX_LOGS) {
      this.queryLogs = this.queryLogs.slice(-this.MAX_LOGS);
    }

    // Track slow queries
    if (queryLog.executionTime > this.SLOW_QUERY_THRESHOLD) {
      this.trackSlowQuery(queryLog);
      this.createAlert('slow_query', 'high', `Slow query detected: ${queryLog.executionTime}ms`, {
        query: queryLog.query,
        executionTime: queryLog.executionTime,
      });
    }
  }

  /**
   * Track slow query
   */
  private trackSlowQuery(log: QueryLog): void {
    const existing = this.slowQueries.get(log.query);

    if (existing) {
      existing.frequency++;
      existing.executionTime = Math.max(existing.executionTime, log.executionTime);
    } else {
      const slowQuery: SlowQuery = {
        id: log.id,
        query: log.query,
        executionTime: log.executionTime,
        timestamp: log.timestamp,
        table: log.table || 'unknown',
        operation: log.operation,
        frequency: 1,
        suggestions: this.generateOptimizationSuggestions(log),
      };
      this.slowQueries.set(log.query, slowQuery);
    }
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(log: QueryLog): string[] {
    const suggestions: string[] = [];

    if (log.executionTime > 5000) {
      suggestions.push('Consider adding database indexes');
      suggestions.push('Review query complexity and optimize JOINs');
    }

    if (log.operation === 'SELECT' && !log.cached) {
      suggestions.push('Enable caching for this query');
    }

    if (log.query.includes('SELECT *')) {
      suggestions.push('Select only required columns instead of using SELECT *');
    }

    if (log.query.toLowerCase().includes('join') && log.executionTime > 2000) {
      suggestions.push('Optimize JOIN operations with proper indexes');
    }

    return suggestions;
  }

  /**
   * Get query metrics
   */
  getMetrics(): QueryMetrics {
    const executionTimes = this.queryLogs.map((log) => log.executionTime);
    const cachedQueries = this.queryLogs.filter((log) => log.cached).length;

    return {
      totalQueries: this.queryLogs.length,
      slowQueries: this.slowQueries.size,
      avgExecutionTime: executionTimes.length > 0 ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length : 0,
      maxExecutionTime: executionTimes.length > 0 ? Math.max(...executionTimes) : 0,
      minExecutionTime: executionTimes.length > 0 ? Math.min(...executionTimes) : 0,
      cachedQueries,
      cacheHitRate: this.queryLogs.length > 0 ? (cachedQueries / this.queryLogs.length) * 100 : 0,
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 10): SlowQuery[] {
    return Array.from(this.slowQueries.values())
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * Get query patterns
   */
  getQueryPatterns(): QueryPattern[] {
    const patterns = new Map<string, QueryPattern>();

    this.queryLogs.forEach((log) => {
      // Normalize query to identify patterns
      const pattern = this.normalizeQuery(log.query);

      if (patterns.has(pattern)) {
        const existing = patterns.get(pattern)!;
        existing.count++;
        existing.avgExecutionTime = (existing.avgExecutionTime * (existing.count - 1) + log.executionTime) / existing.count;
        if (log.table && !existing.tables.includes(log.table)) {
          existing.tables.push(log.table);
        }
        if (!existing.operations.includes(log.operation)) {
          existing.operations.push(log.operation);
        }
      } else {
        patterns.set(pattern, {
          pattern,
          count: 1,
          avgExecutionTime: log.executionTime,
          tables: log.table ? [log.table] : [],
          operations: [log.operation],
        });
      }
    });

    return Array.from(patterns.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * Normalize query to identify patterns
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\d+/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get database metrics
   */
  getDatabaseMetrics(): DatabaseMetrics {
    const metrics = this.getMetrics();
    const recentQueries = this.queryLogs.slice(-100);
    const timeWindow = 60000; // 1 minute

    const now = Date.now();
    const recentQueriesInWindow = recentQueries.filter(
      (log) => now - new Date(log.timestamp).getTime() < timeWindow
    );

    return {
      connectionPoolSize: 20,
      activeConnections: 5,
      idleConnections: 15,
      waitingConnections: 0,
      avgQueryTime: metrics.avgExecutionTime,
      queriesPerSecond: (recentQueriesInWindow.length / (timeWindow / 1000)),
      cacheHitRate: metrics.cacheHitRate,
    };
  }

  /**
   * Create performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    details: Record<string, unknown>
  ): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}`,
      type,
      severity,
      message,
      details,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Get active alerts
   */
  getAlerts(includeResolved: boolean = false): PerformanceAlert[] {
    return includeResolved ? this.alerts : this.alerts.filter((alert) => !alert.resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
    }
  }

  /**
   * Generate index suggestions
   */
  generateIndexSuggestions(): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    const slowQueries = this.getSlowQueries(20);

    slowQueries.forEach((query) => {
      // Analyze query for potential index opportunities
      if (query.query.toLowerCase().includes('where')) {
        const whereMatch = query.query.match(/WHERE\s+(\w+)\s*=/i);
        if (whereMatch && query.table) {
          suggestions.push({
            table: query.table,
            columns: [whereMatch[1]],
            type: 'btree',
            reason: `Frequently used in WHERE clause (${query.frequency} times)`,
            estimatedImprovement: `${Math.min(90, Math.floor(query.executionTime / 100))}% faster`,
            priority: query.executionTime > 3000 ? 'high' : 'medium',
          });
        }
      }

      if (query.query.toLowerCase().includes('join')) {
        const joinMatch = query.query.match(/JOIN\s+(\w+)\s+ON\s+\w+\.(\w+)/i);
        if (joinMatch) {
          suggestions.push({
            table: joinMatch[1],
            columns: [joinMatch[2]],
            type: 'btree',
            reason: 'Used in JOIN operation',
            estimatedImprovement: '50-70% faster',
            priority: 'high',
          });
        }
      }
    });

    // Remove duplicates
    const uniqueSuggestions = suggestions.filter(
      (suggestion, index, self) =>
        index === self.findIndex((s) => s.table === suggestion.table && s.columns.join(',') === suggestion.columns.join(','))
    );

    return uniqueSuggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate optimization report
   */
  generateOptimizationReport(startDate: string, endDate: string): OptimizationReport {
    const metrics = this.getMetrics();
    const slowQueries = this.getSlowQueries(10);
    const indexSuggestions = this.generateIndexSuggestions();
    const queryPatterns = this.getQueryPatterns().slice(0, 10);
    const alerts = this.getAlerts(true);

    const improvements: string[] = [];
    if (metrics.cacheHitRate < 80) {
      improvements.push('Increase cache hit rate by caching more frequently accessed data');
    }
    if (metrics.slowQueries > 5) {
      improvements.push('Optimize slow queries by adding indexes or refactoring');
    }
    if (indexSuggestions.length > 0) {
      improvements.push(`Add ${indexSuggestions.length} suggested indexes to improve query performance`);
    }

    return {
      id: `report_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      period: { start: startDate, end: endDate },
      summary: {
        totalQueries: metrics.totalQueries,
        slowQueries: metrics.slowQueries,
        avgResponseTime: metrics.avgExecutionTime,
        cacheHitRate: metrics.cacheHitRate,
        improvements,
      },
      slowQueries,
      indexSuggestions,
      queryPatterns,
      alerts,
    };
  }

  /**
   * Get recent query logs
   */
  getRecentLogs(limit: number = 50): QueryLog[] {
    return this.queryLogs.slice(-limit).reverse();
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.queryLogs = [];
    this.slowQueries.clear();
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }
}

export const queryMonitorService = new QueryMonitorService();