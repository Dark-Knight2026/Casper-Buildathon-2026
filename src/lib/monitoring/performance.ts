/**
 * Performance Monitoring Service
 * 
 * This module provides comprehensive performance monitoring including:
 * - Core Web Vitals (LCP, FID, CLS, FCP, TTFB)
 * - API response time tracking
 * - Database query performance
 * - Bundle size monitoring
 * - Custom performance metrics
 * 
 * @module monitoring/performance
 */

import { onCLS, onFCP, onFID, onLCP, onTTFB, Metric } from 'web-vitals';
import { captureMessage, addBreadcrumb } from './sentry';

/**
 * Performance metric thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals (in milliseconds)
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
  
  // Custom metrics
  API_RESPONSE: { good: 500, needsImprovement: 1000 },
  DATABASE_QUERY: { good: 500, needsImprovement: 1000 },
  PAGE_LOAD: { good: 2000, needsImprovement: 3000 },
} as const;

/**
 * Performance metric interface
 */
interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url?: string;
  metadata?: Record<string, any>;
}

/**
 * API performance tracking interface
 */
interface APIPerformance {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
}

/**
 * Database query performance interface
 */
interface QueryPerformance {
  query: string;
  duration: number;
  timestamp: number;
  cached: boolean;
}

/**
 * Performance data store
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIPerformance[] = [];
  private queryMetrics: QueryPerformance[] = [];
  private maxStoredMetrics = 100;

  /**
   * Initialize performance monitoring
   */
  initialize(): void {
    this.initializeCoreWebVitals();
    this.initializeNavigationTiming();
    this.initializeResourceTiming();
    this.setupPeriodicReporting();
  }

  /**
   * Initialize Core Web Vitals tracking
   */
  private initializeCoreWebVitals(): void {
    // Largest Contentful Paint (LCP)
    onLCP((metric) => {
      this.recordMetric({
        name: 'LCP',
        value: metric.value,
        rating: this.getRating(metric.value, PERFORMANCE_THRESHOLDS.LCP),
        timestamp: Date.now(),
        url: window.location.href,
      });
    });

    // First Input Delay (FID)
    onFID((metric) => {
      this.recordMetric({
        name: 'FID',
        value: metric.value,
        rating: this.getRating(metric.value, PERFORMANCE_THRESHOLDS.FID),
        timestamp: Date.now(),
        url: window.location.href,
      });
    });

    // Cumulative Layout Shift (CLS)
    onCLS((metric) => {
      this.recordMetric({
        name: 'CLS',
        value: metric.value,
        rating: this.getRating(metric.value, PERFORMANCE_THRESHOLDS.CLS),
        timestamp: Date.now(),
        url: window.location.href,
      });
    });

    // First Contentful Paint (FCP)
    onFCP((metric) => {
      this.recordMetric({
        name: 'FCP',
        value: metric.value,
        rating: this.getRating(metric.value, PERFORMANCE_THRESHOLDS.FCP),
        timestamp: Date.now(),
        url: window.location.href,
      });
    });

    // Time to First Byte (TTFB)
    onTTFB((metric) => {
      this.recordMetric({
        name: 'TTFB',
        value: metric.value,
        rating: this.getRating(metric.value, PERFORMANCE_THRESHOLDS.TTFB),
        timestamp: Date.now(),
        url: window.location.href,
      });
    });
  }

  /**
   * Initialize Navigation Timing API
   */
  private initializeNavigationTiming(): void {
    if (!('performance' in window)) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (!navigation) return;

        // DNS lookup time
        const dnsTime = navigation.domainLookupEnd - navigation.domainLookupStart;
        this.recordMetric({
          name: 'DNS_LOOKUP',
          value: dnsTime,
          rating: dnsTime < 100 ? 'good' : dnsTime < 300 ? 'needs-improvement' : 'poor',
          timestamp: Date.now(),
        });

        // TCP connection time
        const tcpTime = navigation.connectEnd - navigation.connectStart;
        this.recordMetric({
          name: 'TCP_CONNECTION',
          value: tcpTime,
          rating: tcpTime < 100 ? 'good' : tcpTime < 300 ? 'needs-improvement' : 'poor',
          timestamp: Date.now(),
        });

        // Page load time
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        this.recordMetric({
          name: 'PAGE_LOAD',
          value: loadTime,
          rating: this.getRating(loadTime, PERFORMANCE_THRESHOLDS.PAGE_LOAD),
          timestamp: Date.now(),
          url: window.location.href,
        });

        // DOM content loaded
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        this.recordMetric({
          name: 'DOM_CONTENT_LOADED',
          value: domContentLoaded,
          rating: domContentLoaded < 1500 ? 'good' : domContentLoaded < 2500 ? 'needs-improvement' : 'poor',
          timestamp: Date.now(),
        });
      }, 0);
    });
  }

  /**
   * Initialize Resource Timing API
   */
  private initializeResourceTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          
          // Track slow resources
          if (resource.duration > 1000) {
            addBreadcrumb({
              message: `Slow resource: ${resource.name}`,
              category: 'performance',
              level: 'warning',
              data: {
                duration: resource.duration,
                size: resource.transferSize,
                type: resource.initiatorType,
              },
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  /**
   * Set up periodic performance reporting
   */
  private setupPeriodicReporting(): void {
    // Report metrics every 5 minutes
    setInterval(() => {
      this.reportMetrics();
    }, 5 * 60 * 1000);

    // Report on page unload
    window.addEventListener('beforeunload', () => {
      this.reportMetrics();
    });
  }

  /**
   * Get rating based on threshold
   */
  private getRating(
    value: number,
    threshold: { good: number; needsImprovement: number }
  ): 'good' | 'needs-improvement' | 'poor' {
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics.shift();
    }

    // Alert on poor performance
    if (metric.rating === 'poor') {
      captureMessage(
        `Poor ${metric.name} performance: ${metric.value.toFixed(2)}ms`,
        'warning',
        {
          tags: {
            metric: metric.name,
            rating: metric.rating,
          },
          extra: {
            value: metric.value,
            url: metric.url,
            metadata: metric.metadata,
          },
        }
      );
    }

    // Send to analytics
    this.sendToAnalytics(metric);
  }

  /**
   * Track API request performance
   */
  trackAPIRequest(
    endpoint: string,
    method: string,
    duration: number,
    status: number
  ): void {
    const metric: APIPerformance = {
      endpoint,
      method,
      duration,
      status,
      timestamp: Date.now(),
    };

    this.apiMetrics.push(metric);

    // Keep only recent metrics
    if (this.apiMetrics.length > this.maxStoredMetrics) {
      this.apiMetrics.shift();
    }

    // Alert on slow API requests
    if (duration > PERFORMANCE_THRESHOLDS.API_RESPONSE.needsImprovement) {
      addBreadcrumb({
        message: `Slow API request: ${method} ${endpoint}`,
        category: 'api',
        level: 'warning',
        data: {
          duration,
          status,
        },
      });
    }

    // Send to analytics
    this.sendToAnalytics({
      name: 'API_REQUEST',
      value: duration,
      rating: this.getRating(duration, PERFORMANCE_THRESHOLDS.API_RESPONSE),
      timestamp: Date.now(),
      metadata: { endpoint, method, status },
    });
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(query: string, duration: number, cached: boolean = false): void {
    const metric: QueryPerformance = {
      query,
      duration,
      timestamp: Date.now(),
      cached,
    };

    this.queryMetrics.push(metric);

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxStoredMetrics) {
      this.queryMetrics.shift();
    }

    // Alert on slow queries
    if (!cached && duration > PERFORMANCE_THRESHOLDS.DATABASE_QUERY.needsImprovement) {
      addBreadcrumb({
        message: `Slow database query: ${query.substring(0, 100)}...`,
        category: 'database',
        level: 'warning',
        data: {
          duration,
          cached,
        },
      });
    }

    // Send to analytics
    this.sendToAnalytics({
      name: 'DATABASE_QUERY',
      value: duration,
      rating: this.getRating(duration, PERFORMANCE_THRESHOLDS.DATABASE_QUERY),
      timestamp: Date.now(),
      metadata: { query: query.substring(0, 100), cached },
    });
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    metrics: PerformanceMetric[];
    apiMetrics: APIPerformance[];
    queryMetrics: QueryPerformance[];
    averages: Record<string, number>;
  } {
    const averages: Record<string, number> = {};

    // Calculate averages for each metric type
    const metricTypes = [...new Set(this.metrics.map(m => m.name))];
    metricTypes.forEach(type => {
      const typeMetrics = this.metrics.filter(m => m.name === type);
      const sum = typeMetrics.reduce((acc, m) => acc + m.value, 0);
      averages[type] = sum / typeMetrics.length;
    });

    return {
      metrics: this.metrics,
      apiMetrics: this.apiMetrics,
      queryMetrics: this.queryMetrics,
      averages,
    };
  }

  /**
   * Report metrics to monitoring service
   */
  private reportMetrics(): void {
    const summary = this.getSummary();
    
    // Log summary in development
    if (import.meta.env.DEV) {
      console.group('Performance Summary');
      console.table(summary.averages);
      console.groupEnd();
    }

    // Send to monitoring service (implement based on your service)
    // Example: sendToMonitoringService(summary);
  }

  /**
   * Send metric to analytics
   */
  private sendToAnalytics(metric: PerformanceMetric): void {
    // Send to Vercel Analytics
    if (window.va) {
      window.va('track', `performance_${metric.name.toLowerCase()}`, {
        value: metric.value,
        rating: metric.rating,
      });
    }

    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_rating: metric.rating,
        page_path: metric.url,
      });
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.apiMetrics = [];
    this.queryMetrics = [];
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring(): void {
  performanceMonitor.initialize();
}

/**
 * Track API request performance
 */
export function trackAPIRequest(
  endpoint: string,
  method: string,
  duration: number,
  status: number
): void {
  performanceMonitor.trackAPIRequest(endpoint, method, duration, status);
}

/**
 * Track database query performance
 */
export function trackDatabaseQuery(
  query: string,
  duration: number,
  cached?: boolean
): void {
  performanceMonitor.trackDatabaseQuery(query, duration, cached);
}

/**
 * Get performance summary
 */
export function getPerformanceSummary() {
  return performanceMonitor.getSummary();
}

/**
 * Measure async function performance
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  category: 'api' | 'database' | 'custom' = 'custom'
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    if (category === 'api') {
      trackAPIRequest(name, 'CUSTOM', duration, 200);
    } else if (category === 'database') {
      trackDatabaseQuery(name, duration);
    } else {
      performanceMonitor.recordMetric({
        name: name.toUpperCase().replace(/\s+/g, '_'),
        value: duration,
        rating: duration < 1000 ? 'good' : duration < 2000 ? 'needs-improvement' : 'poor',
        timestamp: Date.now(),
      });
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    
    addBreadcrumb({
      message: `Failed ${category} operation: ${name}`,
      category,
      level: 'error',
      data: { duration },
    });
    
    throw error;
  }
}

/**
 * Measure sync function performance
 */
export function measureSync<T>(
  name: string,
  fn: () => T
): T {
  const start = performance.now();
  
  try {
    const result = fn();
    const duration = performance.now() - start;
    
    performanceMonitor.recordMetric({
      name: name.toUpperCase().replace(/\s+/g, '_'),
      value: duration,
      rating: duration < 100 ? 'good' : duration < 300 ? 'needs-improvement' : 'poor',
      timestamp: Date.now(),
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    
    addBreadcrumb({
      message: `Failed operation: ${name}`,
      category: 'performance',
      level: 'error',
      data: { duration },
    });
    
    throw error;
  }
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics(): void {
  performanceMonitor.clear();
}

/**
 * Example Usage:
 * 
 * // Initialize in main.tsx
 * import { initializePerformanceMonitoring } from '@/lib/monitoring/performance';
 * initializePerformanceMonitoring();
 * 
 * // Track API requests
 * import { trackAPIRequest } from '@/lib/monitoring/performance';
 * 
 * const start = performance.now();
 * const response = await fetch('/api/properties');
 * const duration = performance.now() - start;
 * trackAPIRequest('/api/properties', 'GET', duration, response.status);
 * 
 * // Track database queries
 * import { trackDatabaseQuery } from '@/lib/monitoring/performance';
 * 
 * const start = performance.now();
 * const data = await supabase.from('properties').select('*');
 * const duration = performance.now() - start;
 * trackDatabaseQuery('SELECT * FROM properties', duration, false);
 * 
 * // Measure async operations
 * import { measureAsync } from '@/lib/monitoring/performance';
 * 
 * const data = await measureAsync(
 *   'Fetch user properties',
 *   () => fetchUserProperties(userId),
 *   'api'
 * );
 */

// Type declarations for external libraries
declare global {
  interface Window {
    va?: (event: string, name: string, data?: Record<string, any>) => void;
    gtag?: (event: string, name: string, data?: Record<string, any>) => void;
  }
}