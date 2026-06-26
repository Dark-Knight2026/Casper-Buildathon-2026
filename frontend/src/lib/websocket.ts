/**
 * WebSocket Manager
 * Handles real-time communication with backend
 */

import { logger } from '@/utils/logger';

interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
}

type MessageHandler<T = unknown> = (data: T) => void;

class WebSocketManager {
  private config: WebSocketConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private isConnecting = false;
  private isConnected = false;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = {
      url: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(token?: string): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        const url = token ? `${this.config.url}?token=${token}` : this.config.url;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          logger.debug('[WebSocket] Connected');
          this.isConnecting = false;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.notifyHandlers('connection', { status: 'connected' });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            logger.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          logger.error('[WebSocket] Error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          logger.debug('[WebSocket] Disconnected');
          this.isConnected = false;
          this.stopHeartbeat();
          this.notifyHandlers('connection', { status: 'disconnected' });
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Send message to server
   */
  send<T>(type: string, data: T): boolean {
    if (!this.isConnected || !this.ws) {
      logger.warn('[WebSocket] Cannot send message: not connected');
      return false;
    }

    try {
      const message: WebSocketMessage<T> = {
        type,
        data,
        timestamp: Date.now()
      };

      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error('[WebSocket] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Subscribe to message type
   */
  on<T>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler as MessageHandler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler as MessageHandler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage) {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data);
        } catch (error) {
          logger.error('[WebSocket] Handler error:', error);
        }
      });
    }
  }

  /**
   * Notify handlers
   */
  private notifyHandlers(type: string, data: unknown) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('[WebSocket] Max reconnect attempts reached');
      this.notifyHandlers('connection', { 
        status: 'failed',
        reason: 'Max reconnect attempts reached'
      });
      return;
    }

    this.reconnectAttempts++;
    logger.debug(`[WebSocket] Reconnecting... (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        logger.error('[WebSocket] Reconnect failed:', error);
      });
    }, this.config.reconnectInterval);
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send('ping', { timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();

// Export class for custom instances
export { WebSocketManager };

// Export types
export type { WebSocketConfig, WebSocketMessage, MessageHandler };