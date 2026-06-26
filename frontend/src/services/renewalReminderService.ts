import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { renewalService } from './renewalService';

class RenewalReminderService {
  /**
   * Check and send reminders for expiring leases
   * This should be run daily (can be triggered via cron job or manually)
   */
  async processReminders(): Promise<{
    reminders_90_day: number;
    reminders_60_day: number;
    reminders_30_day: number;
    errors: string[];
  }> {
    const results = {
      reminders_90_day: 0,
      reminders_60_day: 0,
      reminders_30_day: 0,
      errors: [] as string[],
    };

    try {
      // Get all active leases
      const { data: leases, error } = await supabase
        .from('leases')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const lease of leases || []) {
        try {
          const endDate = new Date(lease.end_date);
          endDate.setHours(0, 0, 0, 0);
          
          const daysUntilExpiration = Math.floor(
            (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Check if we need to send 90-day reminder
          if (daysUntilExpiration === 90) {
            await this.sendReminder(lease.id, '90_day');
            results.reminders_90_day++;
          }
          // Check if we need to send 60-day reminder
          else if (daysUntilExpiration === 60) {
            await this.sendReminder(lease.id, '60_day');
            results.reminders_60_day++;
          }
          // Check if we need to send 30-day reminder
          else if (daysUntilExpiration === 30) {
            await this.sendReminder(lease.id, '30_day');
            results.reminders_30_day++;
          }
        } catch (error) {
          results.errors.push(`Error processing lease ${lease.id}: ${error}`);
        }
      }
    } catch (error) {
      results.errors.push(`Error fetching leases: ${error}`);
    }

    return results;
  }

  /**
   * Send a specific reminder for a lease
   */
  private async sendReminder(
    leaseId: string,
    reminderType: '90_day' | '60_day' | '30_day'
  ): Promise<void> {
    try {
      await renewalService.createReminder(leaseId, reminderType);
    } catch (error) {
      logger.error(`Failed to send ${reminderType} reminder for lease ${leaseId}:`, error);
      throw error;
    }
  }

  /**
   * Check for expired offers and update their status
   */
  async processExpiredOffers(): Promise<{ expired_count: number; errors: string[] }> {
    const results = {
      expired_count: 0,
      errors: [] as string[],
    };

    try {
      const today = new Date().toISOString();

      const { data: expiredOffers, error } = await supabase
        .from('lease_renewals')
        .select('*')
        .in('status', ['pending', 'negotiating'])
        .lt('offer_expiration_date', today);

      if (error) throw error;

      for (const offer of expiredOffers || []) {
        try {
          await supabase
            .from('lease_renewals')
            .update({ status: 'expired' })
            .eq('id', offer.id);

          results.expired_count++;
        } catch (error) {
          results.errors.push(`Error expiring offer ${offer.id}: ${error}`);
        }
      }
    } catch (error) {
      results.errors.push(`Error fetching expired offers: ${error}`);
    }

    return results;
  }

  /**
   * Manual trigger for testing - send reminders for specific lease
   */
  async sendTestReminder(
    leaseId: string,
    reminderType: '90_day' | '60_day' | '30_day'
  ): Promise<void> {
    await renewalService.createReminder(leaseId, reminderType);
  }
}

export const renewalReminderService = new RenewalReminderService();