/**
 * CSPR.cloud Service
 * Provides WebSocket integration with Casper Network blockchain via CSPR.cloud Streaming API
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

// Environment configuration
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

    // Security: This API key is intentionally client-exposed (VITE_* prefix).
    // WebSocket connections cannot use custom headers, so a URL query param
    // is the only available transport mechanism.
    //
    // Mitigations configured in the CSPR.cloud dashboard:
    // - Key is restricted to production domain(s) via origin allowlist
    // - Rate limiting is enforced per-key by CSPR.cloud
    //
    // Verify at: https://console.cspr.cloud → API Keys → [key name] → Restrictions
    const wsApiKey = import.meta.env.VITE_CSPR_CLOUD_API_KEY || '';
    if (wsApiKey) {
      params.append('key', wsApiKey);
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

  /**
   * Get deploy information by hash
   * Uses CSPR.cloud REST API
   */
  async getDeploy(deployHash: string): Promise<{
    status: 'pending' | 'executed' | 'failed';
    confirmations?: number;
    block_number?: number;
    error_message?: string;
  }> {
    // Use proxy in both dev and prod (Vite proxy in dev, Vercel serverless in prod)
    const proxyUrl = import.meta.env.DEV
      ? `/api/cspr-cloud/deploys/${deployHash}`
      : `/api/cspr-cloud?path=${encodeURIComponent(`deploys/${deployHash}`)}`;

    try {
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        if (response.status === 404) {
          // Deploy not found yet - still pending
          return { status: 'pending' };
        }
        throw new Error(`Failed to fetch deploy: ${response.statusText}`);
      }

      const json = await response.json();

      // CSPR Cloud API wraps the response in a `data` field:
      // { "data": { "status": "processed", "error_message": null, ... } }
      const deploy = json.data;

      if (deploy) {
        if (deploy.status === 'processed' && !deploy.error_message) {
          return {
            status: 'executed',
            block_number: deploy.block_height,
          };
        }
        if (deploy.error_message) {
          return {
            status: 'failed',
            error_message: deploy.error_message,
          };
        }
      }

      return { status: 'pending' };
    } catch (err) {
      logger.error('Failed to get deploy status:', err);
      return { status: 'pending' };
    }
  }

  /**
   * Submit a signed deploy to the blockchain
   * Uses CSPR.cloud REST API or direct RPC
   */
  async submitDeploy(signedDeploy: { deploy: Record<string, unknown>; signature: string }): Promise<{
    deploy_hash: string;
  }> {
    const rpcUrl = import.meta.env.VITE_CASPER_RPC_URL || 'https://node.testnet.casper.network/rpc';

    try {
      // Submit via JSON-RPC
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'account_put_deploy',
          params: {
            deploy: signedDeploy.deploy,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`RPC request failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message || 'Deploy submission failed');
      }

      return {
        deploy_hash: result.result.deploy_hash,
      };
    } catch (err) {
      logger.error('Failed to submit deploy:', err);
      throw err;
    }
  }

  /**
   * Fetch CSPR exchange rates from CoinGecko
   */
  async getCSPRRates(
    currencies: string[] = ['USD']
  ): Promise<Record<string, number>> {
    const vsCurrencies = currencies.map((c) => c.toLowerCase()).join(',');
    const url = import.meta.env.DEV
      ? `/api/coingecko/simple/price?ids=casper-network&vs_currencies=${vsCurrencies}`
      : `/api/coingecko?ids=casper-network&vs_currencies=${vsCurrencies}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const rates = data['casper-network'] || {};

    // Map to cspr_xxx format expected by useCSPRPrice
    const result: Record<string, number> = {};
    for (const c of currencies) {
      result[`cspr_${c.toLowerCase()}`] = rates[c.toLowerCase()] ?? 0;
    }
    return result;
  }
}

// Export singleton instance
export const csprCloudService = new CSPRCloudService();