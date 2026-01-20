/**
 * Health Check API Endpoint
 * 
 * Provides comprehensive health status for:
 * - Application status
 * - Database connectivity
 * - External services
 * - Cache performance
 * - System resources
 * 
 * @module api/health
 */

import { createClient } from '@supabase/supabase-js';
import { getDatabaseHealth } from '../../lib/monitoring/database';
import { getPerformanceSummary } from '../../lib/monitoring/performance';
import { getLogStatistics } from '../../lib/monitoring/logger';

/**
 * Health status levels
 */
enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

/**
 * Component health interface
 */
interface ComponentHealth {
  status: HealthStatus;
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Overall health response interface
 */
interface HealthResponse {
  status: HealthStatus;
  timestamp: number;
  version: string;
  uptime: number;
  components: {
    application: ComponentHealth;
    database: ComponentHealth;
    cache: ComponentHealth;
    externalServices: ComponentHealth;
  };
  metrics: {
    errorRate: number;
    averageResponseTime: number;
    cacheHitRate: number;
    recentErrors: number;
  };
}

/**
 * Application start time
 */
const startTime = Date.now();

/**
 * Check application health
 */
async function checkApplicationHealth(): Promise<ComponentHealth> {
  try {
    const logStats = getLogStatistics();
    const totalLogs = logStats.total;
    const errorLogs = logStats.byLevel.ERROR + logStats.byLevel.FATAL;
    const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

    let status = HealthStatus.HEALTHY;
    let message = 'Application is running normally';

    if (errorRate > 5) {
      status = HealthStatus.UNHEALTHY;
      message = 'High error rate detected';
    } else if (errorRate > 1) {
      status = HealthStatus.DEGRADED;
      message = 'Elevated error rate';
    }

    return {
      status,
      message,
      details: {
        errorRate: errorRate.toFixed(2),
        totalLogs,
        errorLogs,
        recentErrors: logStats.recentErrors,
      },
    };
  } catch (error) {
    return {
      status: HealthStatus.UNHEALTHY,
      message: 'Failed to check application health',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<ComponentHealth> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: 'Database configuration missing',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const health = await getDatabaseHealth(supabase);

    return {
      status: health.status as HealthStatus,
      latency: health.latency,
      message: health.status === 'healthy' 
        ? 'Database is responding normally'
        : health.status === 'degraded'
        ? 'Database performance is degraded'
        : 'Database is experiencing issues',
      details: {
        connectionPool: health.connectionPool,
        cacheStats: health.cacheStats,
        slowQueries: health.slowQueries,
        errors: health.errors,
      },
    };
  } catch (error) {
    return {
      status: HealthStatus.UNHEALTHY,
      latency: 0,
      message: 'Database connection failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Check cache health
 */
async function checkCacheHealth(): Promise<ComponentHealth> {
  try {
    const perfSummary = getPerformanceSummary();
    
    // Estimate cache performance from metrics
    // In a real implementation, you'd query your cache service directly
    const cacheMetrics = {
      hitRate: 88, // Example value, replace with actual cache metrics
      avgLatency: 45, // Example value
    };

    let status = HealthStatus.HEALTHY;
    let message = 'Cache is performing well';

    if (cacheMetrics.hitRate < 50) {
      status = HealthStatus.UNHEALTHY;
      message = 'Cache hit rate is critically low';
    } else if (cacheMetrics.hitRate < 70) {
      status = HealthStatus.DEGRADED;
      message = 'Cache hit rate is below optimal';
    }

    return {
      status,
      latency: cacheMetrics.avgLatency,
      message,
      details: {
        hitRate: cacheMetrics.hitRate,
        avgLatency: cacheMetrics.avgLatency,
      },
    };
  } catch (error) {
    return {
      status: HealthStatus.DEGRADED,
      message: 'Unable to check cache status',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Check external services health
 */
async function checkExternalServicesHealth(): Promise<ComponentHealth> {
  const services = {
    stripe: false,
    resend: false,
    supabaseStorage: false,
  };

  try {
    // Check Stripe
    if (import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      services.stripe = true;
    }

    // Check Resend
    if (import.meta.env.VITE_RESEND_API_KEY) {
      services.resend = true;
    }

    // Check Supabase Storage
    if (import.meta.env.VITE_SUPABASE_URL) {
      services.supabaseStorage = true;
    }

    const configuredServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;

    let status = HealthStatus.HEALTHY;
    let message = 'All external services are configured';

    if (configuredServices === 0) {
      status = HealthStatus.UNHEALTHY;
      message = 'No external services configured';
    } else if (configuredServices < totalServices) {
      status = HealthStatus.DEGRADED;
      message = 'Some external services are not configured';
    }

    return {
      status,
      message,
      details: {
        configured: configuredServices,
        total: totalServices,
        services,
      },
    };
  } catch (error) {
    return {
      status: HealthStatus.DEGRADED,
      message: 'Unable to check external services',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Calculate overall health status
 */
function calculateOverallStatus(components: HealthResponse['components']): HealthStatus {
  const statuses = Object.values(components).map(c => c.status);

  if (statuses.includes(HealthStatus.UNHEALTHY)) {
    return HealthStatus.UNHEALTHY;
  }

  if (statuses.includes(HealthStatus.DEGRADED)) {
    return HealthStatus.DEGRADED;
  }

  return HealthStatus.HEALTHY;
}

/**
 * Health check handler
 */
export async function GET(): Promise<Response> {
  try {
    // Check all components
    const [application, database, cache, externalServices] = await Promise.all([
      checkApplicationHealth(),
      checkDatabaseHealth(),
      checkCacheHealth(),
      checkExternalServicesHealth(),
    ]);

    const components = {
      application,
      database,
      cache,
      externalServices,
    };

    // Calculate metrics
    const logStats = getLogStatistics();
    const perfSummary = getPerformanceSummary();
    
    const totalLogs = logStats.total;
    const errorLogs = logStats.byLevel.ERROR + logStats.byLevel.FATAL;
    const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

    const apiMetrics = perfSummary.apiMetrics;
    const averageResponseTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length
      : 0;

    const cacheHitRate = database.details?.cacheStats?.hitRate * 100 || 0;

    // Build response
    const response: HealthResponse = {
      status: calculateOverallStatus(components),
      timestamp: Date.now(),
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      uptime: Date.now() - startTime,
      components,
      metrics: {
        errorRate: parseFloat(errorRate.toFixed(2)),
        averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
        cacheHitRate: parseFloat(cacheHitRate.toFixed(2)),
        recentErrors: logStats.recentErrors,
      },
    };

    // Set appropriate status code
    const statusCode = response.status === HealthStatus.HEALTHY ? 200
      : response.status === HealthStatus.DEGRADED ? 200
      : 503;

    return new Response(JSON.stringify(response, null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const errorResponse = {
      status: HealthStatus.UNHEALTHY,
      timestamp: Date.now(),
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      uptime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}

/**
 * Example Response:
 * 
 * {
 *   "status": "healthy",
 *   "timestamp": 1704585600000,
 *   "version": "1.0.0",
 *   "uptime": 3600000,
 *   "components": {
 *     "application": {
 *       "status": "healthy",
 *       "message": "Application is running normally",
 *       "details": {
 *         "errorRate": "0.35",
 *         "totalLogs": 1000,
 *         "errorLogs": 3,
 *         "recentErrors": 0
 *       }
 *     },
 *     "database": {
 *       "status": "healthy",
 *       "latency": 45,
 *       "message": "Database is responding normally",
 *       "details": {
 *         "connectionPool": {
 *           "active": 5,
 *           "idle": 5,
 *           "total": 10,
 *           "utilization": 50
 *         },
 *         "cacheStats": {
 *           "hits": 880,
 *           "misses": 120,
 *           "hitRate": 0.88
 *         }
 *       }
 *     },
 *     "cache": {
 *       "status": "healthy",
 *       "latency": 45,
 *       "message": "Cache is performing well",
 *       "details": {
 *         "hitRate": 88,
 *         "avgLatency": 45
 *       }
 *     },
 *     "externalServices": {
 *       "status": "healthy",
 *       "message": "All external services are configured",
 *       "details": {
 *         "configured": 3,
 *         "total": 3,
 *         "services": {
 *           "stripe": true,
 *           "resend": true,
 *           "supabaseStorage": true
 *         }
 *       }
 *     }
 *   },
 *   "metrics": {
 *     "errorRate": 0.35,
 *     "averageResponseTime": 180,
 *     "cacheHitRate": 88,
 *     "recentErrors": 0
 *   }
 * }
 */