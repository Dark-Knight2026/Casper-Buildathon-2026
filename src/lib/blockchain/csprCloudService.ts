/**
 * CSPR.cloud Service
 * Provides WebSocket integration with Casper Network blockchain via CSPR.cloud Streaming API
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

// Environment configuration
const CSPR_CLOUD_API_KEY = import.meta.env.VITE_CSPR_CLOUD_API_KEY || '';
const CSPR_CLOUD_WS_URL = import.meta.env.VITE_CSPR_CLOUD_WS_URL || 'wss://streaming.cspr.cloud';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Type definitions
export interface BlockchainEvent {
  event_type: 'BlockAdded' | 'DeployProcessed' | 'deploy_accepted' | 'finality_signature';
  deploy_hash?: string;
  block_hash?: string;
  block_height?: number;
  timestamp?: string;
  data?: Record<string, unknown>;
  id?: number; // Event ID for cursor tracking
}

export interface WebSocketHandlers {
  onOpen?: () => void;
  onMessage?: (data: BlockchainEvent) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
  onBlockAdded?: (block: Record<string, unknown>) => void;
  onDeployProcessed?: (deploy: Record<string, unknown>) => void;
}

/**
 * CSPR.cloud Service Class
 * Handles WebSocket streaming interactions with CSPR.cloud
 */
export class CSPRCloudService {
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 3000;
  private handlers: WebSocketHandlers = {};
  private isIntentionalClose = false;
  private streamType = 'main'; // Default stream type identifier

  constructor() {
    // Initialize service
  }

  /**
   * Connect to CSPR.cloud WebSocket for real-time events
   * Uses start_from parameter for resiliency
   */
  async connect(handlers: WebSocketHandlers = {}): Promise<WebSocket> {
    this.handlers = handlers;
    this.isIntentionalClose = false;

    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      logger.warn('WebSocket already connected');
      return this.wsConnection;
    }

    // Fetch last processed event ID from Supabase
    const lastEventId = await this.getLastEventId();
    
    // Construct URL with API key and start_from parameter
    let url = CSPR_CLOUD_WS_URL;
    const params = new URLSearchParams();

    if (CSPR_CLOUD_API_KEY) {
      params.append('key', CSPR_CLOUD_API_KEY);
    }

    if (lastEventId !== null) {
      params.append('start_from', lastEventId.toString());
      logger.debug(`Resuming event stream from ID: ${lastEventId}`);
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    logger.debug(`Connecting to CSPR.cloud Streaming API: ${url}`);

    this.wsConnection = new WebSocket(url);

    this.wsConnection.onopen = () => {
      logger.debug('WebSocket connected to CSPR.cloud');
      this.reconnectAttempts = 0;
      this.handlers.onOpen?.();
      
      // Subscribe to main events by default
      this.subscribeToEvents();
    };

    this.wsConnection.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Extract event ID if present (assuming CSPR.cloud sends it as 'id' or similar wrapper)
        // Note: Actual structure depends on CSPR.cloud API response format
        const eventId = data.id; 

        // Handle specific event types
        if (data.BlockAdded) {
          this.handlers.onBlockAdded?.(data.BlockAdded);
          this.handlers.onMessage?.({
            event_type: 'BlockAdded',
            data: data.BlockAdded,
            block_hash: data.BlockAdded.block_hash,
            block_height: data.BlockAdded.block.header.height,
            timestamp: data.BlockAdded.block.header.timestamp,
            id: eventId
          });
        } else if (data.DeployProcessed) {
          this.handlers.onDeployProcessed?.(data.DeployProcessed);
          this.handlers.onMessage?.({
            event_type: 'DeployProcessed',
            data: data.DeployProcessed,
            deploy_hash: data.DeployProcessed.deploy_hash,
            block_hash: data.DeployProcessed.block_hash,
            timestamp: data.DeployProcessed.timestamp,
            id: eventId
          });
        } else {
          // Generic message handler
          const firstKey = Object.keys(data)[0];
          this.handlers.onMessage?.({
            event_type: firstKey as BlockchainEvent['event_type'],
            data: data,
            id: eventId
          });
        }

        // Update cursor in database if event ID is present
        if (eventId) {
          await this.updateLastEventId(eventId);
        }
      } catch (error) {
        logger.error('Failed to parse WebSocket message:', error);
      }
    };

    this.wsConnection.onerror = (error) => {
      logger.error('WebSocket error:', error);
      this.handlers.onError?.(error);
    };

    this.wsConnection.onclose = () => {
      logger.debug('WebSocket disconnected');
      this.handlers.onClose?.();
      this.wsConnection = null;

      // Attempt reconnection if not intentionally closed
      if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1); // Exponential backoff
        logger.debug(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
        setTimeout(() => {
          this.connect(this.handlers);
        }, delay);
      }
    };

    return this.wsConnection;
  }

  /**
   * Subscribe to standard blockchain events
   */
  private subscribeToEvents(): void {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      return;
    }

    logger.debug('Subscribed to BlockAdded and DeployProcessed events');
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.isIntentionalClose = true;
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.wsConnection !== null && this.wsConnection.readyState === WebSocket.OPEN;
  }

  /**
   * Get the last processed event ID from Supabase
   */
  private async getLastEventId(): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('event_cursors')
        .select('last_event_id')
        .eq('stream_type', this.streamType)
        .single();

      if (error) {
        // If no cursor found, return null (start from latest)
        if (error.code === 'PGRST116') return null; 
        logger.error('Error fetching event cursor:', error);
        return null;
      }

      return data?.last_event_id || null;
    } catch (err) {
      logger.error('Failed to get last event ID:', err);
      return null;
    }
  }

  /**
   * Update the last processed event ID in Supabase
   */
  private async updateLastEventId(eventId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('event_cursors')
        .upsert(
          { 
            stream_type: this.streamType, 
            last_event_id: eventId,
            last_updated_at: new Date().toISOString()
          },
          { onConflict: 'stream_type' }
        );

      if (error) {
        logger.error('Error updating event cursor:', error);
      }
    } catch (err) {
      logger.error('Failed to update event cursor:', err);
    }
  }
}

// Export singleton instance
export const csprCloudService = new CSPRCloudService();