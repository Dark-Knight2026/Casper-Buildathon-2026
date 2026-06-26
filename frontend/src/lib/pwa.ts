/**
 * Progressive Web App (PWA) Utilities
 * Handles service worker registration, app installation, and offline capabilities
 */

import { logger } from '@/utils/logger';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAConfig {
  enableServiceWorker: boolean;
  enableOfflineMode: boolean;
  enablePushNotifications: boolean;
  cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;
  private isOnline = navigator.onLine;
  private config: PWAConfig;

  constructor(config: Partial<PWAConfig> = {}) {
    this.config = {
      enableServiceWorker: true,
      enableOfflineMode: true,
      enablePushNotifications: false,
      cacheStrategy: 'network-first',
      ...config
    };
    this.initialize();
  }

  /**
   * Initialize PWA features
   */
  private initialize() {
    // Check if already installed
    this.checkInstallation();
    
    // Listen for install prompt
    this.setupInstallPrompt();
    
    // Setup online/offline listeners
    this.setupNetworkListeners();
    
    // Register service worker
    if (this.config.enableServiceWorker) {
      this.registerServiceWorker();
    }
  }

  /**
   * Check if app is installed
   */
  private checkInstallation() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }
    
    // Check iOS standalone
    if ((navigator as NavigatorStandalone).standalone === true) {
      this.isInstalled = true;
    }
  }

  /**
   * Setup install prompt listener
   */
  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      
      // Dispatch custom event that components can listen to
      window.dispatchEvent(new CustomEvent('pwa-install-available'));
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    });
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      window.dispatchEvent(new CustomEvent('pwa-online'));
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      window.dispatchEvent(new CustomEvent('pwa-offline'));
    });
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        logger.debug('[PWA] Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                window.dispatchEvent(new CustomEvent('pwa-update-available'));
              }
            });
          }
        });

        return registration;
      } catch (error) {
        logger.error('[PWA] Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Prompt user to install app
   */
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      logger.warn('[PWA] Install prompt not available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      this.deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      logger.error('[PWA] Install prompt failed:', error);
      return false;
    }
  }

  /**
   * Check if install is available
   */
  canInstall(): boolean {
    return this.deferredPrompt !== null && !this.isInstalled;
  }

  /**
   * Get installation status
   */
  getIsInstalled(): boolean {
    return this.isInstalled;
  }

  /**
   * Get online status
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Update service worker
   */
  async updateServiceWorker() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    }
  }

  /**
   * Unregister service worker
   */
  async unregisterServiceWorker() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        logger.debug('[PWA] Service Worker unregistered');
      }
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      logger.warn('[PWA] Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Show notification
   */
  async showNotification(title: string, options?: NotificationOptions) {
    if (Notification.permission !== 'granted') {
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification(title, {
            icon: '/images/photo1764585091.jpg',
            badge: '/images/photo1764585091.jpg',
            ...options
          });
        }
      } else {
        new Notification(title, options);
      }
    } catch (error) {
      logger.error('[PWA] Show notification failed:', error);
    }
  }

  /**
   * Clear all caches
   */
  async clearCaches() {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      logger.debug('[PWA] All caches cleared');
    }
  }

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<number> {
    if ('caches' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }
}

// Export singleton instance
export const pwaManager = new PWAManager();

// Export class for custom instances
export { PWAManager };

// Export types
export type { PWAConfig, BeforeInstallPromptEvent };