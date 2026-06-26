/**
 * Database Monitoring Service
 * 
 * This module provides comprehensive database monitoring including:
 * - Query performance tracking
 * - Connection pool monitoring
 * - Slow query detection and alerting
 * - Cache hit rate tracking
 * - Database health checks
 * 
 * @module monitoring/database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { trackDatabaseQuery } from './performance';

/**
 * Database monitoring configuration
 */
export const DATABASE_THRESHOLDS = {
  SLOW_QUERY_MS: 500,
  VERY_SLOW_QUERY_MS: 1000,
  CONNECTION_POOL_WARNING: 80, // 80% utilization
  CONNECTION_POOL_CRITICAL: 95, // 95% utilization
  CACHE_HIT_RATE_WARNING: 70, // Below 70%
  CACHE_HIT_RATE_CRITICAL: 50, // Below 50%
} as const;

/**
 * Query performance metric interface
 */
interface QueryMetric {
  query: string;
  duration: number;
  timestamp: number;
  cached: boolean;
  table?: string;
  operation?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  rowCount?: number;
  error?: string;
}

/**
 * Connection pool status interface
 */
interface ConnectionPoolStatus {
  active: number;
  idle: number;
  total: number;
  waiting: number;
  utilization: number;
  timestamp: number;
}

/**
 * Cache statistics interface
 */
interface CacheStatistics {
  hits: number;
  misses: number;
  hitRate: number;
  timestamp: number;
}

/**
 * Database health status
 */
interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  connectionPool: ConnectionPoolStatus;
  cacheStats: CacheStatistics;
  slowQueries: number;
  errors: number;
  timestamp: number;
}

/**
 * Database monitoring class
 */
class DatabaseMonitor {
  private queryMetrics: QueryMetric[] = [];
  private connectionPoolHistory: ConnectionPoolStatus[] = [];
  private cacheStats: CacheStatistics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    timestamp: Date.now(),
  };
  private maxStoredMetrics = 100;
  private slowQueryCount = 0;
  private errorCount = 0;

  /**
   * Initialize database monitoring
   */
  initialize(): void {
    this.setupPeriodicHealthCheck();
    this.setupMetricsReporting();
  }

  /**
   * Track a database query
   */
  trackQuery(metric: QueryMetric): void {
    // Store metric
    this.queryMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxStoredMetrics) {
      this.queryMetrics.shift();
    }

    // Update cache statistics
    if (metric.cached) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }
    this.cacheStats.hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses);
    this.cacheStats.timestamp = Date.now();

    // Track in performance monitoring
    trackDatabaseQuery(metric.query, metric.duration, metric.cached);

    // Alert on slow queries
    if (metric.duration > DATABASE_THRESHOLDS.SLOW_QUERY_MS) {
      this.slowQueryCount++;

      const severity = metric.duration > DATABASE_THRESHOLDS.VERY_SLOW_QUERY_MS ? 'error' : 'warning';

      // Log slow query
      console.warn(`[DATABASE] Slow query detected: ${metric.query.substring(0, 100)}...`, {
        duration: metric.duration,
        table: metric.table,
        operation: metric.operation,
        cached: metric.cached,
        severity,
      });
    }

    // Track errors
    if (metric.error) {
      this.errorCount++;

      console.error(`[DATABASE] Query error: ${metric.error}`, {
        query: metric.query,
        operation: metric.operation,
        table: metric.table,
      });
    }
  }

  /**
   * Update connection pool status
   */
  updateConnectionPool(status: Omit<ConnectionPoolStatus, 'utilization' | 'timestamp'>): void {
    const utilization = (status.active / status.total) * 100;
    
    const poolStatus: ConnectionPoolStatus = {
      ...status,
      utilization,
      timestamp: Date.now(),
    };

    this.connectionPoolHistory.push(poolStatus);
    
    // Keep only recent history
    if (this.connectionPoolHistory.length > this.maxStoredMetrics) {
      this.connectionPoolHistory.shift();
    }

    // Alert on high utilization
    if (utilization >= DATABASE_THRESHOLDS.CONNECTION_POOL_CRITICAL) {
      console.error(`[DATABASE] Critical connection pool utilization: ${utilization.toFixed(1)}%`, poolStatus);
    } else if (utilization >= DATABASE_THRESHOLDS.CONNECTION_POOL_WARNING) {
      console.warn(`[DATABASE] High connection pool utilization: ${utilization.toFixed(1)}%`, poolStatus);
    }
  }

  /**
   * Get current cache statistics
   */
  getCacheStatistics(): CacheStatistics {
    return { ...this.cacheStats };
  }

  /**
   * Get slow query count
   */
  getSlowQueryCount(): number {
    return this.slowQueryCount;
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.errorCount;
  }

  /**
   * Get query metrics summary
   */
  getQueryMetricsSummary(): {
    total: number;
    cached: number;
    slow: number;
    errors: number;
    averageDuration: number;
    cacheHitRate: number;
  } {
    const total = this.queryMetrics.length;
    const cached = this.queryMetrics.filter(m => m.cached).length;
    const slow = this.queryMetrics.filter(m => m.duration > DATABASE_THRESHOLDS.SLOW_QUERY_MS).length;
    const errors = this.queryMetrics.filter(m => m.error).length;
    const averageDuration = total > 0
      ? this.queryMetrics.reduce((sum, m) => sum + m.duration, 0) / total
      : 0;
    const cacheHitRate = this.cacheStats.hitRate * 100;

    return {
      total,
      cached,
      slow,
      errors,
      averageDuration,
      cacheHitRate,
    };
  }

  /**
   * Get database health status
   */
  async getHealthStatus(supabase: SupabaseClient): Promise<DatabaseHealth> {
    const start = performance.now();
    
    try {
      // Simple health check query
      await supabase.from('properties').select('count').limit(1).single();
      
      const latency = performance.now() - start;
      
      // Get latest connection pool status
      const latestPool = this.connectionPoolHistory[this.connectionPoolHistory.length - 1] || {
        active: 0,
        idle: 0,
        total: 10,
        waiting: 0,
        utilization: 0,
        timestamp: Date.now(),
      };

      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (
        latency > 1000 ||
        latestPool.utilization > DATABASE_THRESHOLDS.CONNECTION_POOL_CRITICAL ||
        this.cacheStats.hitRate < DATABASE_THRESHOLDS.CACHE_HIT_RATE_CRITICAL / 100 ||
        this.errorCount > 10
      ) {
        status = 'unhealthy';
      } else if (
        latency > 500 ||
        latestPool.utilization > DATABASE_THRESHOLDS.CONNECTION_POOL_WARNING ||
        this.cacheStats.hitRate < DATABASE_THRESHOLDS.CACHE_HIT_RATE_WARNING / 100 ||
        this.slowQueryCount > 5
      ) {
        status = 'degraded';
      }

      return {
        status,
        latency,
        connectionPool: latestPool,
        cacheStats: this.cacheStats,
        slowQueries: this.slowQueryCount,
        errors: this.errorCount,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.errorCount++;
      
      return {
        status: 'unhealthy',
        latency: performance.now() - start,
        connectionPool: {
          active: 0,
          idle: 0,
          total: 0,
          waiting: 0,
          utilization: 0,
          timestamp: Date.now(),
        },
        cacheStats: this.cacheStats,
        slowQueries: this.slowQueryCount,
        errors: this.errorCount,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Set up periodic health checks
   */
  private setupPeriodicHealthCheck(): void {
    // Check health every minute
    setInterval(async () => {
      // Health check will be performed by the application
      // This is a placeholder for periodic checks
    }, 60 * 1000);
  }

  /**
   * Set up metrics reporting
   */
  private setupMetricsReporting(): void {
    // Report metrics every 5 minutes
    setInterval(() => {
      this.reportMetrics();
    }, 5 * 60 * 1000);

    // Reset counters every hour
    setInterval(() => {
      this.slowQueryCount = 0;
      this.errorCount = 0;
    }, 60 * 60 * 1000);
  }

  /**
   * Report metrics to monitoring service
   */
  private reportMetrics(): void {
    const summary = this.getQueryMetricsSummary();
    
    // Log in development
    if (import.meta.env.DEV) {
      console.group('Database Metrics Summary');
      console.table(summary);
      console.groupEnd();
    }

    // Alert on poor cache hit rate
    if (summary.cacheHitRate < DATABASE_THRESHOLDS.CACHE_HIT_RATE_WARNING) {
      const logMethod = summary.cacheHitRate < DATABASE_THRESHOLDS.CACHE_HIT_RATE_CRITICAL
        ? console.error
        : console.warn;

      logMethod(`Low cache hit rate: ${summary.cacheHitRate.toFixed(1)}%`, {
        alert_type: 'cache_performance',
        ...summary,
      });
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.queryMetrics = [];
    this.connectionPoolHistory = [];
    this.cacheStats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      timestamp: Date.now(),
    };
    this.slowQueryCount = 0;
    this.errorCount = 0;
  }
}

// Singleton instance
const databaseMonitor = new DatabaseMonitor();

/**
 * Initialize database monitoring
 */
export function initializeDatabaseMonitoring(): void {
  databaseMonitor.initialize();
}

/**
 * Create monitored Supabase client
 * 
 * Wraps Supabase client methods to track query performance
 */
export function createMonitoredSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string
): SupabaseClient {
  const client = createClient(supabaseUrl, supabaseKey);
  
  // Wrap the from method to track queries
  const originalFrom = client.from.bind(client);

  client.from = function(table: string) {
    const query = originalFrom(table);

    // Wrap query methods
    // Note: Supabase query builder methods have complex generic types that are difficult to type correctly
    // when creating wrapper functions. Using Function type with explicit assertions for practical reasons.
    type QueryMethod = (...args: never[]) => unknown;

    const wrapQueryMethod = <T extends QueryMethod>(
      method: T,
      operation: QueryMetric['operation']
    ): T => {
      const wrapped = async function(this: unknown, ...args: unknown[]) {
        const start = performance.now();
        const queryString = `${operation} FROM ${table}`;

        try {
          const result = await (method as unknown as (...args: unknown[]) => Promise<unknown>).apply(this, args) as { data: unknown; error: unknown };
          const duration = performance.now() - start;

          databaseMonitor.trackQuery({
            query: queryString,
            duration,
            timestamp: Date.now(),
            cached: false, // Supabase doesn't expose cache info directly
            table,
            operation,
            rowCount: Array.isArray(result.data) ? result.data.length : 1,
          });

          return result;
        } catch (error) {
          const duration = performance.now() - start;
          const errorMessage = error instanceof Error ? error.message : String(error);

          databaseMonitor.trackQuery({
            query: queryString,
            duration,
            timestamp: Date.now(),
            cached: false,
            table,
            operation,
            error: errorMessage,
          });

          throw error;
        }
      };
      return wrapped as unknown as T;
    };

    // Wrap common query methods
    if (query.select) {
      query.select = wrapQueryMethod(query.select.bind(query), 'SELECT');
    }
    if (query.insert) {
      query.insert = wrapQueryMethod(query.insert.bind(query), 'INSERT');
    }
    if (query.update) {
      query.update = wrapQueryMethod(query.update.bind(query), 'UPDATE');
    }
    if (query.delete) {
      query.delete = wrapQueryMethod(query.delete.bind(query), 'DELETE');
    }

    return query;
  };

  return client;
}

/**
 * Track a database query manually
 */
export function trackQuery(metric: QueryMetric): void {
  databaseMonitor.trackQuery(metric);
}

/**
 * Update connection pool status
 */
export function updateConnectionPool(
  status: Omit<ConnectionPoolStatus, 'utilization' | 'timestamp'>
): void {
  databaseMonitor.updateConnectionPool(status);
}

/**
 * Get cache statistics
 */
export function getCacheStatistics(): CacheStatistics {
  return databaseMonitor.getCacheStatistics();
}

/**
 * Get query metrics summary
 */
export function getQueryMetricsSummary() {
  return databaseMonitor.getQueryMetricsSummary();
}

/**
 * Get database health status
 */
export async function getDatabaseHealth(supabase: SupabaseClient): Promise<DatabaseHealth> {
  return databaseMonitor.getHealthStatus(supabase);
}

/**
 * Clear database metrics
 */
export function clearDatabaseMetrics(): void {
  databaseMonitor.clear();
}

/**
 * Utility: Analyze slow queries
 */
export function analyzeSlowQueries(queries: QueryMetric[]): {
  byTable: Record<string, number>;
  byOperation: Record<string, number>;
  slowest: QueryMetric[];
} {
  const slowQueries = queries.filter(q => q.duration > DATABASE_THRESHOLDS.SLOW_QUERY_MS);
  
  const byTable: Record<string, number> = {};
  const byOperation: Record<string, number> = {};
  
  slowQueries.forEach(q => {
    if (q.table) {
      byTable[q.table] = (byTable[q.table] || 0) + 1;
    }
    if (q.operation) {
      byOperation[q.operation] = (byOperation[q.operation] || 0) + 1;
    }
  });
  
  const slowest = [...slowQueries]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);
  
  return { byTable, byOperation, slowest };
}

/**
 * Example Usage:
 * 
 * // Initialize in main.tsx
 * import { initializeDatabaseMonitoring } from '@/lib/monitoring/database';
 * initializeDatabaseMonitoring();
 * 
 * // Create monitored Supabase client
 * import { createMonitoredSupabaseClient } from '@/lib/monitoring/database';
 * 
 * const supabase = createMonitoredSupabaseClient(
 *   import.meta.env.VITE_SUPABASE_URL,
 *   import.meta.env.VITE_SUPABASE_ANON_KEY
 * );
 * 
 * // All queries are automatically tracked
 * const { data } = await supabase.from('properties').select('*');
 * 
 * // Track queries manually
 * import { trackQuery } from '@/lib/monitoring/database';
 * 
 * const start = performance.now();
 * const result = await customDatabaseOperation();
 * const duration = performance.now() - start;
 * 
 * trackQuery({
 *   query: 'CUSTOM OPERATION',
 *   duration,
 *   timestamp: Date.now(),
 *   cached: false,
 *   table: 'custom',
 *   operation: 'SELECT',
 * });
 * 
 * // Get health status
 * import { getDatabaseHealth } from '@/lib/monitoring/database';
 * 
 * const health = await getDatabaseHealth(supabase);
 * console.log('Database health:', health.status);
 * 
 * // Get metrics summary
 * import { getQueryMetricsSummary } from '@/lib/monitoring/database';
 * 
 * const summary = getQueryMetricsSummary();
 * console.log('Cache hit rate:', summary.cacheHitRate);
 */