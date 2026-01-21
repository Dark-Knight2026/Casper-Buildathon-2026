/**
 * Data Synchronization Manager
 * Handles offline data storage and sync with backend
 */

import { logger } from '@/utils/logger';

interface SyncConfig {
  enableOfflineStorage: boolean;
  syncInterval: number;
  maxRetries: number;
  conflictResolution: 'client-wins' | 'server-wins' | 'manual';
}

interface SyncItem<T> {
  id: string;
  type: string;
  action: 'create' | 'update' | 'delete';
  data: T;
  timestamp: number;
  synced: boolean;
  retries: number;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: SyncError[];
}

interface SyncError {
  id: string;
  type: string;
  error: string;
}

class DataSyncManager {
  private config: SyncConfig;
  private syncQueue: Map<string, SyncItem<unknown>>;
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      enableOfflineStorage: true,
      syncInterval: 30000, // 30 seconds
      maxRetries: 3,
      conflictResolution: 'server-wins',
      ...config
    };

    this.syncQueue = new Map();
    this.initialize();
  }

  /**
   * Initialize sync manager
   */
  private initialize() {
    // Load pending items from localStorage
    this.loadPendingItems();

    // Setup auto-sync
    this.startAutoSync();

    // Listen for online/offline events
    this.setupNetworkListeners();
  }

  /**
   * Load pending items from localStorage
   */
  private loadPendingItems() {
    if (!this.config.enableOfflineStorage) {
      return;
    }

    try {
      const stored = localStorage.getItem('sync-queue');
      if (stored) {
        const items = JSON.parse(stored) as SyncItem<unknown>[];
        items.forEach(item => {
          this.syncQueue.set(item.id, item);
        });
      }
    } catch (error) {
      logger.error('[DataSync] Failed to load pending items:', error);
    }
  }

  /**
   * Save pending items to localStorage
   */
  private savePendingItems() {
    try {
      const items = Array.from(this.syncQueue.values());
      localStorage.setItem('sync-queue', JSON.stringify(items));
    } catch (error) {
      logger.error('[DataSync] Failed to save pending items:', error);
    }
  }

  /**
   * Setup network listeners
   */
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      logger.debug('[DataSync] Network online, triggering sync...');
      this.sync();
    });
  }

  /**
   * Start auto-sync
   */
  private startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.sync();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop auto-sync
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Add item to sync queue
   */
  addToQueue<T>(
    id: string,
    type: string,
    action: 'create' | 'update' | 'delete',
    data: T
  ) {
    const item: SyncItem<T> = {
      id,
      type,
      action,
      data,
      timestamp: Date.now(),
      synced: false,
      retries: 0
    };

    this.syncQueue.set(id, item);
    this.savePendingItems();

    // Trigger immediate sync if online
    if (navigator.onLine) {
      this.sync();
    }
  }

  /**
   * Remove item from sync queue
   */
  removeFromQueue(id: string) {
    this.syncQueue.delete(id);
    this.savePendingItems();
  }

  /**
   * Get pending items count
   */
  getPendingCount(): number {
    return this.syncQueue.size;
  }

  /**
   * Get pending items
   */
  getPendingItems(): SyncItem<unknown>[] {
    return Array.from(this.syncQueue.values());
  }

  /**
   * Sync all pending items
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      logger.debug('[DataSync] Sync already in progress');
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [{ id: 'sync', type: 'general', error: 'Sync already in progress' }]
      };
    }

    if (!navigator.onLine) {
      logger.debug('[DataSync] Cannot sync while offline');
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [{ id: 'sync', type: 'general', error: 'Device is offline' }]
      };
    }

    this.isSyncing = true;

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      const items = Array.from(this.syncQueue.values());
      
      for (const item of items) {
        try {
          await this.syncItem(item);
          this.removeFromQueue(item.id);
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            id: item.id,
            type: item.type,
            error: (error as Error).message
          });

          // Increment retry count
          item.retries++;

          if (item.retries >= this.config.maxRetries) {
            logger.error(`[DataSync] Max retries reached for item ${item.id}`);
            this.removeFromQueue(item.id);
          }
        }
      }

      this.savePendingItems();
    } finally {
      this.isSyncing = false;
    }

    // Dispatch sync complete event
    window.dispatchEvent(new CustomEvent('data-sync-complete', { detail: result }));

    return result;
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: SyncItem<unknown>): Promise<void> {
    // This is a placeholder - implement actual API calls
    logger.debug(`[DataSync] Syncing ${item.action} ${item.type} ${item.id}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));

    // In real implementation, make API call based on action:
    // - create: POST /api/{type}
    // - update: PUT /api/{type}/{id}
    // - delete: DELETE /api/{type}/{id}
  }

  /**
   * Clear all pending items
   */
  clearQueue() {
    this.syncQueue.clear();
    this.savePendingItems();
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      pendingCount: this.syncQueue.size,
      isOnline: navigator.onLine
    };
  }
}

// Export singleton instance
export const dataSyncManager = new DataSyncManager();

// Export class for custom instances
export { DataSyncManager };

// Export types
export type { SyncConfig, SyncItem, SyncResult, SyncError };