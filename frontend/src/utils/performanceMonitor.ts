import { logger } from '@/utils/logger';

/**
 * Performance Monitoring Utilities
 * Track and measure component performance
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100;

  /**
   * Start measuring performance
   */
  startMeasure(name: string): (metadata?: Record<string, unknown>) => void {
    const startTime = performance.now();
    return (metadata?: Record<string, unknown>) => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata
      });
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
    // Log slow operations in development
    if (process.env.NODE_ENV === 'development' && metric.duration > 100) {
      logger.warn(
        `[Performance] Slow operation detected: ${metric.name} took ${metric.duration.toFixed(2)}ms`,
        metric.metadata
      );
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get average duration for a metric
   */
  getAverageDuration(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Get performance statistics
   */
  getStatistics(): {
    total: number;
    byName: Record<string, { count: number; avgDuration: number; maxDuration: number }>;
  } {
    const stats: Record<string, { count: number; totalDuration: number; maxDuration: number }> = {};
    this.metrics.forEach(metric => {
      if (!stats[metric.name]) {
        stats[metric.name] = { count: 0, totalDuration: 0, maxDuration: 0 };
      }
      stats[metric.name].count++;
      stats[metric.name].totalDuration += metric.duration;
      stats[metric.name].maxDuration = Math.max(stats[metric.name].maxDuration, metric.duration);
    });

    const byName: Record<string, { count: number; avgDuration: number; maxDuration: number }> = {};
    Object.entries(stats).forEach(([name, data]) => {
      byName[name] = {
        count: data.count,
        avgDuration: data.totalDuration / data.count,
        maxDuration: data.maxDuration
      };
    });

    return {
      total: this.metrics.length,
      byName
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render time
 */
export function usePerformanceMonitor(componentName: string) {
  const endMeasure = performanceMonitor.startMeasure(`${componentName}_render`);
  return () => {
    endMeasure();
  };
}

/**
 * Measure async operation performance
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const endMeasure = performanceMonitor.startMeasure(name);
  try {
    const result = await operation();
    endMeasure(metadata);
    return result;
  } catch (error) {
    endMeasure({ ...metadata, error: true });
    throw error;
  }
}

/**
 * Measure sync operation performance
 */
export function measureSync<T>(
  name: string,
  operation: () => T,
  metadata?: Record<string, unknown>
): T {
  const endMeasure = performanceMonitor.startMeasure(name);
  try {
    const result = operation();
    endMeasure(metadata);
    return result;
  } catch (error) {
    endMeasure({ ...metadata, error: true });
    throw error;
  }
}

/**
 * Get Web Vitals metrics
 */
export function getWebVitals(): Promise<{
  FCP?: number;
  LCP?: number;
  FID?: number;
  CLS?: number;
  TTFB?: number;
}> {
  return new Promise((resolve) => {
    const metrics: Record<string, number> = {};

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          metrics.FCP = entry.startTime;
        }
      });
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      metrics.LCP = lastEntry.startTime;
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEventTiming;
        metrics.FID = fidEntry.processingStart - fidEntry.startTime;
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const layoutShiftEntry = entry as LayoutShift;
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
        }
      });
      metrics.CLS = clsValue;
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Time to First Byte
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
      metrics.TTFB = navEntry.responseStart - navEntry.requestStart;
    }

    // Return metrics after a short delay
    setTimeout(() => {
      resolve(metrics);
    }, 3000);
  });
}

export default performanceMonitor;