/**
 * Cache Service
 * Redis-based caching layer for performance optimization
 */

import type { CacheConfig, CacheEntry, CacheMetrics } from '@/types/performance';

interface CacheableEntity {
  id: string;
  [key: string]: unknown;
}

class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
    avgResponseTime: 0,
    cacheSize: 0,
    evictions: 0,
  };

  private config: CacheConfig = {
    host: 'localhost',
    port: 6379,
    db: 0,
    ttl: 3600, // 1 hour default
    maxRetries: 3,
    retryDelay: 1000,
  };

  // Cache key prefixes for different data types
  private readonly PREFIXES = {
    PROPERTY: 'property:',
    TENANT: 'tenant:',
    LEASE: 'lease:',
    PAYMENT: 'payment:',
    DASHBOARD: 'dashboard:',
    ANALYTICS: 'analytics:',
    USER: 'user:',
  };

  // TTL configurations for different data types (in seconds)
  private readonly TTL_CONFIG = {
    PROPERTY: 3600, // 1 hour
    TENANT: 1800, // 30 minutes
    LEASE: 1800, // 30 minutes
    PAYMENT: 300, // 5 minutes
    DASHBOARD: 300, // 5 minutes
    ANALYTICS: 600, // 10 minutes
    USER: 1800, // 30 minutes
  };

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      this.updateMetrics(Date.now() - startTime);
      return null;
    }

    // Check if entry has expired
    if (new Date(entry.expiresAt) < new Date()) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateMetrics(Date.now() - startTime);
      return null;
    }

    this.metrics.hits++;
    this.updateMetrics(Date.now() - startTime);
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const effectiveTTL = ttl || this.config.ttl;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + effectiveTTL * 1000);

    const entry: CacheEntry<T> = {
      key,
      value,
      ttl: effectiveTTL,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.cache.set(key, entry);
    this.metrics.cacheSize = this.cache.size;
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.metrics.cacheSize = this.cache.size;
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    let deleted = 0;
    const regex = new RegExp(pattern.replace('*', '.*'));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    this.metrics.cacheSize = this.cache.size;
    return deleted;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.metrics.cacheSize = 0;
  }

  /**
   * Get or set cache value
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Cache property data
   */
  async cacheProperty(propertyId: string, data: unknown): Promise<void> {
    const key = `${this.PREFIXES.PROPERTY}${propertyId}`;
    await this.set(key, data, this.TTL_CONFIG.PROPERTY);
  }

  /**
   * Get cached property data
   */
  async getProperty<T>(propertyId: string): Promise<T | null> {
    const key = `${this.PREFIXES.PROPERTY}${propertyId}`;
    return this.get<T>(key);
  }

  /**
   * Invalidate property cache
   */
  async invalidateProperty(propertyId: string): Promise<void> {
    const key = `${this.PREFIXES.PROPERTY}${propertyId}`;
    await this.delete(key);
  }

  /**
   * Cache tenant data
   */
  async cacheTenant(tenantId: string, data: unknown): Promise<void> {
    const key = `${this.PREFIXES.TENANT}${tenantId}`;
    await this.set(key, data, this.TTL_CONFIG.TENANT);
  }

  /**
   * Get cached tenant data
   */
  async getTenant<T>(tenantId: string): Promise<T | null> {
    const key = `${this.PREFIXES.TENANT}${tenantId}`;
    return this.get<T>(key);
  }

  /**
   * Cache lease data
   */
  async cacheLease(leaseId: string, data: unknown): Promise<void> {
    const key = `${this.PREFIXES.LEASE}${leaseId}`;
    await this.set(key, data, this.TTL_CONFIG.LEASE);
  }

  /**
   * Get cached lease data
   */
  async getLease<T>(leaseId: string): Promise<T | null> {
    const key = `${this.PREFIXES.LEASE}${leaseId}`;
    return this.get<T>(key);
  }

  /**
   * Cache payment history
   */
  async cachePaymentHistory(tenantId: string, data: unknown): Promise<void> {
    const key = `${this.PREFIXES.PAYMENT}history:${tenantId}`;
    await this.set(key, data, this.TTL_CONFIG.PAYMENT);
  }

  /**
   * Get cached payment history
   */
  async getPaymentHistory<T>(tenantId: string): Promise<T | null> {
    const key = `${this.PREFIXES.PAYMENT}history:${tenantId}`;
    return this.get<T>(key);
  }

  /**
   * Cache dashboard metrics
   */
  async cacheDashboardMetrics(userId: string, data: unknown): Promise<void> {
    const key = `${this.PREFIXES.DASHBOARD}${userId}`;
    await this.set(key, data, this.TTL_CONFIG.DASHBOARD);
  }

  /**
   * Get cached dashboard metrics
   */
  async getDashboardMetrics<T>(userId: string): Promise<T | null> {
    const key = `${this.PREFIXES.DASHBOARD}${userId}`;
    return this.get<T>(key);
  }

  /**
   * Cache analytics data
   */
  async cacheAnalytics(reportId: string, data: unknown): Promise<void> {
    const key = `${this.PREFIXES.ANALYTICS}${reportId}`;
    await this.set(key, data, this.TTL_CONFIG.ANALYTICS);
  }

  /**
   * Get cached analytics data
   */
  async getAnalytics<T>(reportId: string): Promise<T | null> {
    const key = `${this.PREFIXES.ANALYTICS}${reportId}`;
    return this.get<T>(key);
  }

  /**
   * Warm cache with critical data
   */
  async warmCache(data: { properties?: CacheableEntity[]; tenants?: CacheableEntity[]; leases?: CacheableEntity[] }): Promise<void> {
    const promises: Promise<void>[] = [];

    if (data.properties) {
      data.properties.forEach((property: CacheableEntity) => {
        promises.push(this.cacheProperty(property.id, property));
      });
    }

    if (data.tenants) {
      data.tenants.forEach((tenant: CacheableEntity) => {
        promises.push(this.cacheTenant(tenant.id, tenant));
      });
    }

    if (data.leases) {
      data.leases.forEach((lease: CacheableEntity) => {
        promises.push(this.cacheLease(lease.id, lease));
      });
    }

    await Promise.all(promises);
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      cacheSize: this.cache.size,
      evictions: 0,
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(responseTime: number): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 ? (this.metrics.hits / this.metrics.totalRequests) * 100 : 0;

    // Update average response time
    const totalTime = this.metrics.avgResponseTime * (this.metrics.totalRequests - 1) + responseTime;
    this.metrics.avgResponseTime = totalTime / this.metrics.totalRequests;
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<number> {
    let cleaned = 0;
    const now = new Date();

    for (const [key, entry] of this.cache.entries()) {
      if (new Date(entry.expiresAt) < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    this.metrics.cacheSize = this.cache.size;
    this.metrics.evictions += cleaned;
    return cleaned;
  }
}

export const cacheService = new CacheService();