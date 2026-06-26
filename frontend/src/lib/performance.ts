/**
 * Performance Monitoring Utilities
 * Tracks Core Web Vitals and custom performance metrics
 */

import { logger } from '@/utils/logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface WebVitals {
  LCP?: PerformanceMetric; // Largest Contentful Paint
  FID?: PerformanceMetric; // First Input Delay
  CLS?: PerformanceMetric; // Cumulative Layout Shift
  FCP?: PerformanceMetric; // First Contentful Paint
  TTFB?: PerformanceMetric; // Time to First Byte
}

/**
 * Performance thresholds (in milliseconds)
 */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Get rating based on value and thresholds
 */
function getRating(
  value: number,
  thresholds: { good: number; poor: number }
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Performance observer for Web Vitals
 */
class PerformanceMonitor {
  private metrics: WebVitals = {};
  private observers: PerformanceObserver[] = [];
  private callbacks: Array<(metric: PerformanceMetric) => void> = [];

  constructor() {
    if (typeof window === 'undefined') return;

    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeFCP();
    this.observeTTFB();
  }

  /**
   * Observe Largest Contentful Paint (LCP)
   */
  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          renderTime: number;
          loadTime: number;
        };

        const value = lastEntry.renderTime || lastEntry.loadTime;
        const metric: PerformanceMetric = {
          name: 'LCP',
          value,
          rating: getRating(value, THRESHOLDS.LCP),
          timestamp: Date.now(),
        };

        this.metrics.LCP = metric;
        this.notifyCallbacks(metric);
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      logger.warn('LCP observation not supported:', error);
    }
  }

  /**
   * Observe First Input Delay (FID)
   */
  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as PerformanceEntry & {
          processingStart: number;
          startTime: number;
        };

        const value = firstEntry.processingStart - firstEntry.startTime;
        const metric: PerformanceMetric = {
          name: 'FID',
          value,
          rating: getRating(value, THRESHOLDS.FID),
          timestamp: Date.now(),
        };

        this.metrics.FID = metric;
        this.notifyCallbacks(metric);
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      logger.warn('FID observation not supported:', error);
    }
  }

  /**
   * Observe Cumulative Layout Shift (CLS)
   */
  private observeCLS(): void {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };

          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
          }
        }

        const metric: PerformanceMetric = {
          name: 'CLS',
          value: clsValue,
          rating: getRating(clsValue, THRESHOLDS.CLS),
          timestamp: Date.now(),
        };

        this.metrics.CLS = metric;
        this.notifyCallbacks(metric);
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      logger.warn('CLS observation not supported:', error);
    }
  }

  /**
   * Observe First Contentful Paint (FCP)
   */
  private observeFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');

        if (fcpEntry) {
          const value = fcpEntry.startTime;
          const metric: PerformanceMetric = {
            name: 'FCP',
            value,
            rating: getRating(value, THRESHOLDS.FCP),
            timestamp: Date.now(),
          };

          this.metrics.FCP = metric;
          this.notifyCallbacks(metric);
        }
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (error) {
      logger.warn('FCP observation not supported:', error);
    }
  }

  /**
   * Observe Time to First Byte (TTFB)
   */
  private observeTTFB(): void {
    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigationEntry) {
        const value = navigationEntry.responseStart - navigationEntry.requestStart;
        const metric: PerformanceMetric = {
          name: 'TTFB',
          value,
          rating: getRating(value, THRESHOLDS.TTFB),
          timestamp: Date.now(),
        };

        this.metrics.TTFB = metric;
        this.notifyCallbacks(metric);
      }
    } catch (error) {
      logger.warn('TTFB observation not supported:', error);
    }
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): WebVitals {
    return { ...this.metrics };
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(callback: (metric: PerformanceMetric) => void): () => void {
    this.callbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(metric: PerformanceMetric): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(metric);
      } catch (error) {
        logger.error('Error in performance callback:', error);
      }
    });
  }

  /**
   * Log metrics to console (development only)
   */
  logMetrics(): void {
    if (process.env.NODE_ENV !== 'development') return;

    logger.debug('=== Performance Metrics ===');
    
    Object.entries(this.metrics).forEach(([name, metric]) => {
      logger.debug(`${name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
    });
  }

  /**
   * Send metrics to analytics
   */
  sendToAnalytics(endpoint?: string): void {
    if (!endpoint) return;

    const metrics = this.getMetrics();

    // Send metrics to analytics endpoint
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
    }).catch((error) => {
      logger.error('Failed to send metrics to analytics:', error);
    });
  }

  /**
   * Cleanup observers
   */
  disconnect(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.callbacks = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure custom performance metric
 */
export function measurePerformance(name: string, fn: () => void | Promise<void>): void {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = `${name}-measure`;

  performance.mark(startMark);

  const execute = async () => {
    try {
      await fn();
    } finally {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);

      const measure = performance.getEntriesByName(measureName)[0];
      logger.debug(`${name}: ${measure.duration.toFixed(2)}ms`);

      // Cleanup
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(measureName);
    }
  };

  execute();
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Report Web Vitals to console in development
 */
export function reportWebVitals(): void {
  if (process.env.NODE_ENV === 'development') {
    performanceMonitor.subscribe((metric) => {
      logger.debug(`${metric.name}:`, metric.value, `(${metric.rating})`);
    });

    // Log all metrics after page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        performanceMonitor.logMetrics();
      }, 3000);
    });
  }
}