/**
 * Performance Types
 * Types for Redis caching, query monitoring, and performance optimization
 */

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: number; // Default TTL in seconds
  maxRetries: number;
  retryDelay: number;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl: number;
  createdAt: string;
  expiresAt: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  avgResponseTime: number;
  cacheSize: number;
  evictions: number;
}

export interface CacheStrategy {
  type: 'ttl' | 'lru' | 'lfu';
  maxSize?: number;
  ttl?: number;
}

export interface QueryLog {
  id: string;
  query: string;
  params?: Record<string, unknown>;
  executionTime: number;
  timestamp: string;
  table?: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  rowsAffected?: number;
  cached: boolean;
  error?: string;
}

export interface QueryMetrics {
  totalQueries: number;
  slowQueries: number;
  avgExecutionTime: number;
  maxExecutionTime: number;
  minExecutionTime: number;
  cachedQueries: number;
  cacheHitRate: number;
}

export interface SlowQuery {
  id: string;
  query: string;
  executionTime: number;
  timestamp: string;
  table: string;
  operation: string;
  frequency: number;
  suggestions: string[];
}

export interface QueryPattern {
  pattern: string;
  count: number;
  avgExecutionTime: number;
  tables: string[];
  operations: string[];
}

export interface DatabaseMetrics {
  connectionPoolSize: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  avgQueryTime: number;
  queriesPerSecond: number;
  cacheHitRate: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'slow_query' | 'high_load' | 'cache_miss' | 'connection_pool';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: string;
  priority: 'low' | 'medium' | 'high';
}

export interface OptimizationReport {
  id: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalQueries: number;
    slowQueries: number;
    avgResponseTime: number;
    cacheHitRate: number;
    improvements: string[];
  };
  slowQueries: SlowQuery[];
  indexSuggestions: IndexSuggestion[];
  queryPatterns: QueryPattern[];
  alerts: PerformanceAlert[];
}

export interface PageLoadMetrics {
  page: string;
  loadTime: number;
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  tti: number; // Time to Interactive
  cls: number; // Cumulative Layout Shift
  timestamp: string;
}

export interface APIMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: string;
  cached: boolean;
  error?: string;
}