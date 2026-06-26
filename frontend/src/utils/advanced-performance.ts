/**
 * Advanced Performance Utilities
 * Enhanced performance optimization tools and monitoring
 */

import { logger } from './logger';

// ============================================================================
// Performance Observer Utilities
// ============================================================================

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

class PerformanceObserverManager {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initObservers();
  }

  private initObservers() {
    // Observe paint timing
    if ('PerformanceObserver' in window) {
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = entry.startTime;
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      } catch (e) {
        logger.warn('Paint observer not supported');
      }

      // Observe largest contentful paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        logger.warn('LCP observer not supported');
      }

      // Observe first input delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // @ts-expect-error - processingStart exists on PerformanceEventTiming
            this.metrics.fid = entry.processingStart - entry.startTime;
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        logger.warn('FID observer not supported');
      }

      // Observe layout shifts
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // @ts-expect-error - value exists on LayoutShift
            if (!entry.hadRecentInput) {
              // @ts-expect-error - value exists on LayoutShift
              clsValue += entry.value;
              this.metrics.cls = clsValue;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        logger.warn('CLS observer not supported');
      }
    }

    // Get TTFB from navigation timing
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      this.metrics.ttfb = timing.responseStart - timing.requestStart;
    }
  }

  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

export const performanceObserver = new PerformanceObserverManager();

// ============================================================================
// Resource Timing Analysis
// ============================================================================

interface ResourceTiming {
  name: string;
  type: string;
  duration: number;
  size: number;
  cached: boolean;
}

export function analyzeResourceTiming(): ResourceTiming[] {
  if (!window.performance || !window.performance.getEntriesByType) {
    return [];
  }

  const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  return resources.map(resource => ({
    name: resource.name,
    type: resource.initiatorType,
    duration: resource.duration,
    size: resource.transferSize,
    cached: resource.transferSize === 0 && resource.decodedBodySize > 0
  }));
}

export function getSlowResources(threshold = 1000): ResourceTiming[] {
  return analyzeResourceTiming().filter(resource => resource.duration > threshold);
}

export function getLargeResources(threshold = 500000): ResourceTiming[] {
  return analyzeResourceTiming().filter(resource => resource.size > threshold);
}

// ============================================================================
// Long Task Detection
// ============================================================================

interface LongTask {
  name: string;
  duration: number;
  startTime: number;
}

class LongTaskDetector {
  private tasks: LongTask[] = [];
  private observer: PerformanceObserver | null = null;

  start() {
    if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.tasks.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        });
        this.observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        logger.warn('Long task observer not supported');
      }
    }
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  getTasks(): LongTask[] {
    return [...this.tasks];
  }

  clear() {
    this.tasks = [];
  }
}

export const longTaskDetector = new LongTaskDetector();

// ============================================================================
// Memory Leak Detection
// ============================================================================

interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];
  private interval: ReturnType<typeof setInterval> | null = null;

  start(intervalMs = 5000) {
    this.interval = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private takeSnapshot() {
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      this.snapshots.push({
        timestamp: Date.now(),
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      });

      // Keep only last 100 snapshots
      if (this.snapshots.length > 100) {
        this.snapshots.shift();
      }
    }
  }

  detectLeak(): { hasLeak: boolean; trend: number } {
    if (this.snapshots.length < 10) {
      return { hasLeak: false, trend: 0 };
    }

    // Calculate trend over last 10 snapshots
    const recent = this.snapshots.slice(-10);
    const firstUsage = recent[0].usedJSHeapSize;
    const lastUsage = recent[recent.length - 1].usedJSHeapSize;
    const trend = ((lastUsage - firstUsage) / firstUsage) * 100;

    // Consider it a leak if memory increased by more than 20%
    return {
      hasLeak: trend > 20,
      trend
    };
  }

  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  clear() {
    this.snapshots = [];
  }
}

export const memoryLeakDetector = new MemoryLeakDetector();

// ============================================================================
// Frame Rate Monitor
// ============================================================================

class FrameRateMonitor {
  private fps = 0;
  private frameCount = 0;
  private lastTime = performance.now();
  private animationId: number | null = null;
  private history: number[] = [];
  private maxHistory = 60;

  start() {
    const measure = () => {
      const currentTime = performance.now();
      this.frameCount++;

      if (currentTime >= this.lastTime + 1000) {
        this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
        this.history.push(this.fps);
        
        if (this.history.length > this.maxHistory) {
          this.history.shift();
        }

        this.frameCount = 0;
        this.lastTime = currentTime;
      }

      this.animationId = requestAnimationFrame(measure);
    };

    this.animationId = requestAnimationFrame(measure);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getFPS(): number {
    return this.fps;
  }

  getHistory(): number[] {
    return [...this.history];
  }

  getAverageFPS(): number {
    if (this.history.length === 0) return 0;
    return Math.round(this.history.reduce((a, b) => a + b, 0) / this.history.length);
  }

  getMinFPS(): number {
    if (this.history.length === 0) return 0;
    return Math.min(...this.history);
  }

  clear() {
    this.history = [];
    this.fps = 0;
    this.frameCount = 0;
  }
}

export const frameRateMonitor = new FrameRateMonitor();

// ============================================================================
// Bundle Size Analyzer
// ============================================================================

export function analyzeBundleSize(): {
  totalSize: number;
  gzippedSize: number;
  resources: { name: string; size: number }[];
} {
  if (!window.performance || !window.performance.getEntriesByType) {
    return { totalSize: 0, gzippedSize: 0, resources: [] };
  }

  const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const jsResources = resources.filter(r => 
    r.initiatorType === 'script' || r.name.endsWith('.js')
  );

  const totalSize = jsResources.reduce((sum, r) => sum + r.transferSize, 0);
  const gzippedSize = jsResources.reduce((sum, r) => sum + r.encodedBodySize, 0);

  return {
    totalSize,
    gzippedSize,
    resources: jsResources.map(r => ({
      name: r.name,
      size: r.transferSize
    }))
  };
}

// ============================================================================
// Render Blocking Resources
// ============================================================================

export function getRenderBlockingResources(): ResourceTiming[] {
  const resources = analyzeResourceTiming();
  // CSS and synchronous scripts are typically render-blocking
  return resources.filter(r => 
    r.type === 'link' || 
    (r.type === 'script' && !r.name.includes('async') && !r.name.includes('defer'))
  );
}

// ============================================================================
// Performance Budget
// ============================================================================

interface PerformanceBudget {
  fcp: number;
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  bundleSize: number;
}

const DEFAULT_BUDGET: PerformanceBudget = {
  fcp: 1800,      // 1.8s
  lcp: 2500,      // 2.5s
  fid: 100,       // 100ms
  cls: 0.1,       // 0.1
  ttfb: 600,      // 600ms
  bundleSize: 1000000 // 1MB
};

export function checkPerformanceBudget(
  budget: Partial<PerformanceBudget> = {}
): {
  passed: boolean;
  violations: string[];
} {
  const fullBudget = { ...DEFAULT_BUDGET, ...budget };
  const metrics = performanceObserver.getMetrics();
  const bundleSize = analyzeBundleSize().totalSize;
  const violations: string[] = [];

  if (metrics.fcp && metrics.fcp > fullBudget.fcp) {
    violations.push(`FCP: ${metrics.fcp.toFixed(0)}ms (budget: ${fullBudget.fcp}ms)`);
  }

  if (metrics.lcp && metrics.lcp > fullBudget.lcp) {
    violations.push(`LCP: ${metrics.lcp.toFixed(0)}ms (budget: ${fullBudget.lcp}ms)`);
  }

  if (metrics.fid && metrics.fid > fullBudget.fid) {
    violations.push(`FID: ${metrics.fid.toFixed(0)}ms (budget: ${fullBudget.fid}ms)`);
  }

  if (metrics.cls && metrics.cls > fullBudget.cls) {
    violations.push(`CLS: ${metrics.cls.toFixed(3)} (budget: ${fullBudget.cls})`);
  }

  if (metrics.ttfb && metrics.ttfb > fullBudget.ttfb) {
    violations.push(`TTFB: ${metrics.ttfb.toFixed(0)}ms (budget: ${fullBudget.ttfb}ms)`);
  }

  if (bundleSize > fullBudget.bundleSize) {
    violations.push(`Bundle: ${(bundleSize / 1000).toFixed(0)}KB (budget: ${(fullBudget.bundleSize / 1000).toFixed(0)}KB)`);
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

// ============================================================================
// Performance Report Generator
// ============================================================================

export function generatePerformanceReport(): {
  timestamp: Date;
  metrics: Partial<PerformanceMetrics>;
  fps: { current: number; average: number; min: number };
  resources: { total: number; slow: number; large: number };
  longTasks: number;
  memoryLeak: { detected: boolean; trend: number };
  budget: { passed: boolean; violations: string[] };
} {
  const metrics = performanceObserver.getMetrics();
  const slowResources = getSlowResources();
  const largeResources = getLargeResources();
  const longTasks = longTaskDetector.getTasks();
  const memoryLeak = memoryLeakDetector.detectLeak();
  const budget = checkPerformanceBudget();

  return {
    timestamp: new Date(),
    metrics,
    fps: {
      current: frameRateMonitor.getFPS(),
      average: frameRateMonitor.getAverageFPS(),
      min: frameRateMonitor.getMinFPS()
    },
    resources: {
      total: analyzeResourceTiming().length,
      slow: slowResources.length,
      large: largeResources.length
    },
    longTasks: longTasks.length,
    memoryLeak: {
      detected: memoryLeak.hasLeak,
      trend: memoryLeak.trend
    },
    budget: {
      passed: budget.passed,
      violations: budget.violations
    }
  };
}