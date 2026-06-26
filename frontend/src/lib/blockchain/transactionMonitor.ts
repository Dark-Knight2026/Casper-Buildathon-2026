/**
 * Transaction Monitor
 * Handles monitoring of blockchain transactions, specifically TTL (Time To Live) expiration.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

// Environment configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class TransactionMonitor {
  /**
   * Checks for pending transactions that have exceeded their TTL and marks them as expired.
   * This method calls the database function `mark_expired_transactions`.
   * 
   * @returns Promise<number> The number of transactions marked as expired.
   */
  async checkAndMarkExpiredTransactions(): Promise<number> {
    try {
      logger.debug('Running Transaction TTL check...');
      
      const { data, error } = await supabase.rpc('mark_expired_transactions');

      if (error) {
        logger.error('Error executing mark_expired_transactions RPC:', error);
        throw error;
      }

      const count = data as number;

      if (count > 0) {
        logger.debug(`Successfully marked ${count} transactions as expired.`);
      } else {
        logger.debug('No expired transactions found.');
      }

      return count;
    } catch (err) {
      logger.error('Failed to run transaction TTL check:', err);
      // Return 0 to indicate no changes were made, but log the error
      return 0;
    }
  }

  /**
   * Sets a timeout to automatically check for expired transactions.
   * Useful for running in a background process or during development.
   * @param intervalMs Interval in milliseconds (default: 60000ms = 1 minute)
   */
  startMonitoring(intervalMs: number = 60000): void {
    logger.debug(`Starting Transaction Monitor with interval ${intervalMs}ms`);
    setInterval(() => {
      this.checkAndMarkExpiredTransactions();
    }, intervalMs);
  }
}

// Export singleton instance
export const transactionMonitor = new TransactionMonitor();