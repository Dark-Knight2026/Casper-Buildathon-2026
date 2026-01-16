/**
 * Performance Monitoring Hook
 * React hook for tracking page load and API performance metrics
 */

import { useEffect, useRef } from 'react';
import { queryMonitorService } from '@/services/queryMonitorService';
import type { PageLoadMetrics, APIMetrics } from '@/types/performance';

interface UsePerformanceMonitoringOptions {
  trackPageLoad?: boolean;
  trackAPI?: boolean;
  pageName?: string;
}

export function usePerformanceMonitoring(options: UsePerformanceMonitoringOptions = {}) {
  const { trackPageLoad = true, trackAPI = true, pageName = 'unknown' } = options;
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!trackPageLoad) return;

    const measurePageLoad = () => {
      // Use Performance API if available
      if (typeof window !== 'undefined' && window.performance) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        if (navigation) {
          const metrics: PageLoadMetrics = {
            page: pageName,
            loadTime: navigation.loadEventEnd - navigation.fetchStart,
            ttfb: navigation.responseStart - navigation.fetchStart,
            fcp: paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime || 0,
            lcp: 0, // Would need PerformanceObserver for LCP
            tti: navigation.domInteractive - navigation.fetchStart,
            cls: 0, // Would need PerformanceObserver for CLS
            timestamp: new Date().toISOString(),
          };

          // Log page load metrics
          console.log('Page Load Metrics:', metrics);
        }
      }
    };

    // Measure after page load
    if (document.readyState === 'complete') {
      measurePageLoad();
    } else {
      window.addEventListener('load', measurePageLoad);
      return () => window.removeEventListener('load', measurePageLoad);
    }
  }, [trackPageLoad, pageName]);

  const trackAPICall = (endpoint: string, method: string, startTime: number, statusCode: number, cached: boolean = false, error?: string) => {
    if (!trackAPI) return;

    const responseTime = Date.now() - startTime;

    const metrics: APIMetrics = {
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp: new Date().toISOString(),
      cached,
      error,
    };

    // Log to query monitor if it's a slow API call
    if (responseTime > 500) {
      queryMonitorService.logQuery({
        query: `API: ${method} ${endpoint}`,
        executionTime: responseTime,
        operation: method as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
        cached,
        error,
      });
    }

    console.log('API Metrics:', metrics);
  };

  return {
    trackAPICall,
    startTime: startTimeRef.current,
  };
}