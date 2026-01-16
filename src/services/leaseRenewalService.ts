import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { emailService } from './emailService';
import { smsService } from './smsService';
import { eSignatureService } from './eSignatureService';
import { documentStorageService } from './documentStorageService';
import { leaseManagementService } from './leaseManagementService';

export interface LeaseRenewal {
  id: string;
  lease_id: string;
  status: 'pending' | 'offer-sent' | 'negotiating' | 'accepted' | 'declined' | 'completed';
  original_rent: number;
  proposed_rent: number;
  proposed_term_months: number;
  proposed_start_date: string;
  proposed_end_date: string;
  offer_sent_date: string | null;
  response_deadline: string | null;
  tenant_response: string | null;
  tenant_response_date: string | null;
  counter_offer_rent: number | null;
  counter_offer_terms: string | null;
  negotiation_notes: string | null;
  new_lease_id: string | null;
  offer_document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenewalReminder {
  id: string;
  lease_id: string;
  reminder_type: '90_days' | '60_days' | '30_days';
  sent_date: string;
  email_sent: boolean;
  sms_sent: boolean;
}

export interface RenewalOffer {
  lease_id: string;
  proposed_rent: number;
  proposed_term_months: number;
  proposed_start_date: string;
  market_rate_adjustment: number;
  updated_clauses?: string[];
  special_terms?: string;
}

export interface RenewalNegotiation {
  renewal_id: string;
  sender_type: 'tenant' | 'landlord';
  message: string;
  counter_offer_rent?: number;
  counter_offer_terms?: string;
}

interface LeaseWithDetails {
  id: string;
  tenant_id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  status: string;
  payment_due_day: number;
  terms: string;
  properties: {
    address: string;
    city: string;
    state: string;
    landlord_id: string;
    landlords: {
      full_name: string;
      email: string;
      phone: string;
    };
  };
  tenants: {
    full_name: string;
    email: string;
    phone: string;
  };
}

interface RenewalWithLease extends LeaseRenewal {
  leases: LeaseWithDetails;
}

class LeaseRenewalService {
  /**
   * Check for leases expiring soon and send reminders
   */
  async checkAndSendReminders(): Promise<void> {
    try {
      const today = new Date();
      const reminderDays = [90, 60, 30];

      for (const days of reminderDays) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + days);

        // Get leases expiring on target date
        const { data: leases, error } = await supabase
          .from('leases')
          .select(`
            *,
            properties (
              address,
              city,
              state,
              landlord_id,
              landlords (
                full_name,
                email,
                phone
              )
            ),
            tenants (
              full_name,
              email,
              phone
            )
          `)
          .eq('status', 'active')
          .gte('end_date', targetDate.toISOString().split('T')[0])
          .lte('end_date', targetDate.toISOString().split('T')[0]);

        if (error) throw error;

        for (const lease of leases || []) {
          await this.sendRenewalReminder(lease as LeaseWithDetails, days);
        }
      }
    } catch (error) {
      logger.error('Error checking and sending reminders:', error);
      throw error;
    }
  }

  /**
   * Send renewal reminder to tenant
   */
  private async sendRenewalReminder(lease: LeaseWithDetails, daysUntilExpiry: number): Promise<void> {
    try {
      // Check if reminder already sent
      const reminderType = `${daysUntilExpiry}_days` as '90_days' | '60_days' | '30_days';
      const { data: existingReminder } = await supabase
        .from('renewal_reminders')
        .select('id')
        .eq('lease_id', lease.id)
        .eq('reminder_type', reminderType)
        .single();

      if (existingReminder) return;

      const tenantEmail = lease.tenants?.email;
      const tenantPhone = lease.tenants?.phone;
      const propertyAddress = `${lease.properties?.address}, ${lease.properties?.city}, ${lease.properties?.state}`;

      let emailSent = false;
      let smsSent = false;

      // Send email reminder
      if (tenantEmail) {
        try {
          await emailService.sendEmail({
            to: tenantEmail,
            subject: `Lease Renewal Reminder - ${daysUntilExpiry} Days`,
            html: `
              <h2>Lease Renewal Reminder</h2>
              <p>Dear ${lease.tenants?.full_name},</p>
              <p>This is a reminder that your lease for <strong>${propertyAddress}</strong> will expire in <strong>${daysUntilExpiry} days</strong>.</p>
              <p><strong>Current Lease End Date:</strong> ${new Date(lease.end_date).toLocaleDateString()}</p>
              <p><strong>Monthly Rent:</strong> $${lease.monthly_rent.toLocaleString()}</p>
              <p>We will be sending you a renewal offer soon. Please log in to your dashboard to review the offer when it becomes available.</p>
              <p>If you have any questions or would like to discuss your renewal options, please don't hesitate to contact us.</p>
              <p>Best regards,<br>Property Management Team</p>
            `,
          });
          emailSent = true;
        } catch (error) {
          logger.error('Error sending renewal reminder email:', error);
        }
      }

      // Send SMS reminder for 30-day notice
      if (tenantPhone && daysUntilExpiry === 30) {
        try {
          await smsService.sendSMS({
            to: tenantPhone,
            message: `Lease Renewal Reminder: Your lease at ${propertyAddress} expires in 30 days (${new Date(lease.end_date).toLocaleDateString()}). A renewal offer will be sent soon. Check your dashboard for details.`,
          });
          smsSent = true;
        } catch (error) {
          logger.error('Error sending renewal reminder SMS:', error);
        }
      }

      // Record reminder
      await supabase
        .from('renewal_reminders')
        .insert({
          lease_id: lease.id,
          reminder_type: reminderType,
          sent_date: new Date().toISOString(),
          email_sent: emailSent,
          sms_sent: smsSent,
        });

      // Notify landlord
      const landlordEmail = lease.properties?.landlords?.email;
      if (landlordEmail) {
        await emailService.sendEmail({
          to: landlordEmail,
          subject: `Lease Expiring Soon - ${daysUntilExpiry} Days`,
          html: `
            <h2>Lease Expiration Notice</h2>
            <p>The lease for <strong>${propertyAddress}</strong> will expire in <strong>${daysUntilExpiry} days</strong>.</p>
            <p><strong>Tenant:</strong> ${lease.tenants?.full_name}</p>
            <p><strong>Current Rent:</strong> $${lease.monthly_rent.toLocaleString()}</p>
            <p><strong>Lease End Date:</strong> ${new Date(lease.end_date).toLocaleDateString()}</p>
            <p>Please log in to your dashboard to create a renewal offer for this tenant.</p>
          `,
        });
      }
    } catch (error) {
      logger.error('Error sending renewal reminder:', error);
    }
  }

  /**
   * Create renewal offer
   */
  async createRenewalOffer(offerData: RenewalOffer): Promise<LeaseRenewal> {
    try {
      // Get lease details
      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select(`
          *,
          properties (
            address,
            city,
            state,
            landlord_id,
            landlords (
              full_name,
              email,
              phone
            )
          ),
          tenants (
            full_name,
            email,
            phone
          )
        `)
        .eq('id', offerData.lease_id)
        .single();

      if (leaseError) throw leaseError;

      const leaseWithDetails = lease as unknown as LeaseWithDetails;

      // Calculate response deadline (14 days from now)
      const responseDeadline = new Date();
      responseDeadline.setDate(responseDeadline.getDate() + 14);

      // Create renewal record
      const { data: renewal, error: renewalError } = await supabase
        .from('lease_renewals')
        .insert({
          lease_id: offerData.lease_id,
          status: 'offer-sent',
          original_rent: leaseWithDetails.monthly_rent,
          proposed_rent: offerData.proposed_rent,
          proposed_term_months: offerData.proposed_term_months,
          proposed_start_date: offerData.proposed_start_date,
          proposed_end_date: this.calculateEndDate(offerData.proposed_start_date, offerData.proposed_term_months),
          offer_sent_date: new Date().toISOString(),
          response_deadline: responseDeadline.toISOString(),
        })
        .select()
        .single();

      if (renewalError) throw renewalError;

      // Generate renewal offer document
      const offerDocumentUrl = await this.generateRenewalOfferDocument(renewal, leaseWithDetails, offerData);

      // Update renewal with document URL
      await supabase
        .from('lease_renewals')
        .update({ offer_document_url: offerDocumentUrl })
        .eq('id', renewal.id);

      // Send notification to tenant
      const tenantEmail = leaseWithDetails.tenants?.email;
      if (tenantEmail) {
        await emailService.sendEmail({
          to: tenantEmail,
          subject: 'Lease Renewal Offer Available',
          html: `
            <h2>Lease Renewal Offer</h2>
            <p>Dear ${leaseWithDetails.tenants?.full_name},</p>
            <p>We are pleased to offer you a lease renewal for <strong>${leaseWithDetails.properties?.address}</strong>.</p>
            <h3>Renewal Terms:</h3>
            <ul>
              <li><strong>Current Monthly Rent:</strong> $${leaseWithDetails.monthly_rent.toLocaleString()}</li>
              <li><strong>Proposed Monthly Rent:</strong> $${offerData.proposed_rent.toLocaleString()}</li>
              <li><strong>Lease Term:</strong> ${offerData.proposed_term_months} months</li>
              <li><strong>Proposed Start Date:</strong> ${new Date(offerData.proposed_start_date).toLocaleDateString()}</li>
              <li><strong>Response Deadline:</strong> ${responseDeadline.toLocaleDateString()}</li>
            </ul>
            ${offerData.special_terms ? `<p><strong>Special Terms:</strong> ${offerData.special_terms}</p>` : ''}
            <p>Please log in to your dashboard to review the complete offer and respond.</p>
            <p><a href="${offerDocumentUrl}" target="_blank">View Renewal Offer Document</a></p>
            <p>You can accept, decline, or submit a counter-offer through your tenant portal.</p>
            <p>Best regards,<br>Property Management Team</p>
          `,
        });
      }

      return renewal;
    } catch (error) {
      logger.error('Error creating renewal offer:', error);
      throw error;
    }
  }

  /**
   * Generate renewal offer document
   */
  private async generateRenewalOfferDocument(renewal: LeaseRenewal, lease: LeaseWithDetails, offerData: RenewalOffer): Promise<string> {
    try {
      const documentContent = `
        LEASE RENEWAL OFFER
        
        Property Address: ${lease.properties?.address}, ${lease.properties?.city}, ${lease.properties?.state}
        Landlord: ${lease.properties?.landlords?.full_name}
        Tenant: ${lease.tenants?.full_name}

        Current Lease Terms:
        - Monthly Rent: $${lease.monthly_rent.toLocaleString()}
        - Lease End Date: ${new Date(lease.end_date).toLocaleDateString()}

        Proposed Renewal Terms:
        - Monthly Rent: $${offerData.proposed_rent.toLocaleString()}
        - Lease Term: ${offerData.proposed_term_months} months
        - Start Date: ${new Date(offerData.proposed_start_date).toLocaleDateString()}
        - End Date: ${new Date(renewal.proposed_end_date).toLocaleDateString()}
        - Security Deposit: $${lease.security_deposit.toLocaleString()} (carried forward)

        ${offerData.special_terms ? `Special Terms:\n${offerData.special_terms}\n` : ''}
        ${offerData.updated_clauses && offerData.updated_clauses.length > 0 ? `Updated Clauses:\n${offerData.updated_clauses.join('\n')}\n` : ''}

        Response Deadline: ${new Date(renewal.response_deadline!).toLocaleDateString()}

        Please review this offer and respond by the deadline. You may accept, decline, or submit a counter-offer.

        Generated on: ${new Date().toLocaleDateString()}
      `;

      // Create a simple text file (in production, you'd generate a proper PDF)
      const blob = new Blob([documentContent], { type: 'text/plain' });
      const file = new File([blob], `renewal_offer_${renewal.id}.txt`, { type: 'text/plain' });

      // Upload to storage
      const path = `renewals/${renewal.lease_id}/offer_${renewal.id}.txt`;
      const result = await documentStorageService.uploadDocument(
        file,
        'documents',
        {
          leaseId: renewal.lease_id,
          uploadedBy: lease.properties?.landlord_id || 'system',
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          category: 'renewal-offer'
        },
        path
      );

      return result.url || '';
    } catch (error) {
      logger.error('Error generating renewal offer document:', error);
      throw error;
    }
  }

  /**
   * Get renewal by ID
   */
  async getRenewalById(renewalId: string): Promise<RenewalWithLease> {
    try {
      const { data, error } = await supabase
        .from('lease_renewals')
        .select(`
          *,
          leases (
            *,
            properties (
              address,
              city,
              state,
              landlord_id,
              landlords (
                full_name,
                email,
                phone
              )
            ),
            tenants (
              full_name,
              email,
              phone
            )
          )
        `)
        .eq('id', renewalId)
        .single();

      if (error) throw error;
      return data as RenewalWithLease;
    } catch (error) {
      logger.error('Error fetching renewal:', error);
      throw error;
    }
  }

  /**
   * Get all renewals for a landlord
   */
  async getLandlordRenewals(landlordId: string): Promise<LeaseRenewal[]> {
    try {
      const { data, error } = await supabase
        .from('lease_renewals')
        .select(`
          *,
          leases!inner (
            properties!inner (
              address,
              city,
              state,
              landlord_id
            )
          )
        `)
        .eq('leases.properties.landlord_id', landlordId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching landlord renewals:', error);
      return [];
    }
  }

  /**
   * Get renewals for a tenant
   */
  async getTenantRenewals(tenantId: string): Promise<LeaseRenewal[]> {
    try {
      const { data, error } = await supabase
        .from('lease_renewals')
        .select(`
          *,
          leases!inner (
            tenant_id,
            properties (
              address,
              city,
              state
            ),
            tenants (
              full_name,
              email,
              phone
            )
          )
        `)
        .eq('leases.tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching tenant renewals:', error);
      return [];
    }
  }

  /**
   * Tenant responds to renewal offer
   */
  async respondToRenewal(renewalId: string, response: 'accept' | 'decline' | 'counter', counterOfferData?: { rent?: number; terms?: string }): Promise<void> {
    try {
      const updates: Partial<LeaseRenewal> = {
        tenant_response: response,
        tenant_response_date: new Date().toISOString(),
      };

      if (response === 'accept') {
        updates.status = 'accepted';
      } else if (response === 'decline') {
        updates.status = 'declined';
      } else if (response === 'counter') {
        updates.status = 'negotiating';
        updates.counter_offer_rent = counterOfferData?.rent || null;
        updates.counter_offer_terms = counterOfferData?.terms || null;
      }

      const { error } = await supabase
        .from('lease_renewals')
        .update(updates)
        .eq('id', renewalId);

      if (error) throw error;

      // Get renewal details for notification
      const renewal = await this.getRenewalById(renewalId);
      const lease = renewal.leases;

      const landlordEmail = lease.properties?.landlords?.email;
      if (landlordEmail) {
        let subject = '';
        let message = '';

        if (response === 'accept') {
          subject = 'Lease Renewal Accepted';
          message = `${lease.tenants?.full_name} has accepted the renewal offer for ${lease.properties?.address}.`;
        } else if (response === 'decline') {
          subject = 'Lease Renewal Declined';
          message = `${lease.tenants?.full_name} has declined the renewal offer for ${lease.properties?.address}.`;
        } else {
          subject = 'Lease Renewal Counter-Offer';
          message = `${lease.tenants?.full_name} has submitted a counter-offer for ${lease.properties?.address}. Proposed rent: $${counterOfferData?.rent?.toLocaleString() || 'N/A'}`;
        }

        await emailService.sendEmail({
          to: landlordEmail,
          subject,
          html: `
            <h2>${subject}</h2>
            <p>${message}</p>
            ${counterOfferData?.terms ? `<p><strong>Counter-offer Terms:</strong> ${counterOfferData.terms}</p>` : ''}
            <p>Please log in to your dashboard to review and take action.</p>
          `,
        });
      }

      // If accepted, create new lease
      if (response === 'accept') {
        await this.createRenewalLease(renewalId);
      }
    } catch (error) {
      logger.error('Error responding to renewal:', error);
      throw error;
    }
  }

  /**
   * Create new lease from accepted renewal
   */
  async createRenewalLease(renewalId: string): Promise<string> {
    try {
      const renewal = await this.getRenewalById(renewalId);
      const oldLease = renewal.leases;

      // Create new lease
      const newLeaseData = {
        tenant_id: oldLease.tenant_id,
        property_id: oldLease.property_id,
        start_date: renewal.proposed_start_date,
        end_date: renewal.proposed_end_date,
        monthly_rent: renewal.proposed_rent,
        security_deposit: oldLease.security_deposit,
        status: 'pending',
        payment_due_day: oldLease.payment_due_day,
        terms: oldLease.terms,
      };

      const newLeaseId = await leaseManagementService.createLease(newLeaseData);

      // Update renewal with new lease ID
      await supabase
        .from('lease_renewals')
        .update({
          new_lease_id: newLeaseId,
          status: 'completed',
        })
        .eq('id', renewalId);

      // Update old lease status to 'expired'
      await supabase
        .from('leases')
        .update({ status: 'expired' })
        .eq('id', renewal.lease_id);

      // Send e-signature request for new lease
      await eSignatureService.sendSignatureRequest(newLeaseId);

      return newLeaseId;
    } catch (error) {
      logger.error('Error creating renewal lease:', error);
      throw error;
    }
  }

  /**
   * Add negotiation message
   */
  async addNegotiationMessage(negotiationData: RenewalNegotiation): Promise<void> {
    try {
      const { error } = await supabase
        .from('renewal_negotiations')
        .insert({
          renewal_id: negotiationData.renewal_id,
          sender_type: negotiationData.sender_type,
          message: negotiationData.message,
          counter_offer_rent: negotiationData.counter_offer_rent,
          counter_offer_terms: negotiationData.counter_offer_terms,
        });

      if (error) throw error;

      const renewal = await this.getRenewalById(negotiationData.renewal_id);
      const lease = renewal.leases;

      // Send notification to the other party
      if (negotiationData.sender_type === 'tenant') {
        const landlordEmail = lease.properties?.landlords?.email;
        if (landlordEmail) {
          await emailService.sendEmail({
            to: landlordEmail,
            subject: 'New Renewal Negotiation Message',
            html: `
              <h2>New Message from Tenant</h2>
              <p>${lease.tenants?.full_name} has sent a message regarding the lease renewal for ${lease.properties?.address}.</p>
              <p><strong>Message:</strong> ${negotiationData.message}</p>
              ${negotiationData.counter_offer_rent ? `<p><strong>Counter-offer Rent:</strong> $${negotiationData.counter_offer_rent.toLocaleString()}</p>` : ''}
              <p>Please log in to your dashboard to respond.</p>
            `,
          });
        }
      } else {
        const tenantEmail = lease.tenants?.email;
        if (tenantEmail) {
          await emailService.sendEmail({
            to: tenantEmail,
            subject: 'New Renewal Negotiation Message',
            html: `
              <h2>New Message from Landlord</h2>
              <p>Your landlord has sent a message regarding the lease renewal for ${lease.properties?.address}.</p>
              <p><strong>Message:</strong> ${negotiationData.message}</p>
              <p>Please log in to your dashboard to respond.</p>
            `,
          });
        }
      }
    } catch (error) {
      logger.error('Error adding negotiation message:', error);
      throw error;
    }
  }

  /**
   * Get negotiation history
   */
  async getNegotiationHistory(renewalId: string): Promise<RenewalNegotiation[]> {
    try {
      const { data, error } = await supabase
        .from('renewal_negotiations')
        .select('*')
        .eq('renewal_id', renewalId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching negotiation history:', error);
      return [];
    }
  }

  /**
   * Get renewal analytics
   */
  async getRenewalAnalytics(landlordId: string): Promise<{
    total: number;
    accepted: number;
    declined: number;
    pending: number;
    negotiating: number;
    renewalRate: string;
    avgRentIncrease: string;
  }> {
    try {
      const renewals = await this.getLandlordRenewals(landlordId);

      const total = renewals.length;
      const accepted = renewals.filter(r => r.status === 'accepted' || r.status === 'completed').length;
      const declined = renewals.filter(r => r.status === 'declined').length;
      const pending = renewals.filter(r => r.status === 'pending' || r.status === 'offer-sent').length;
      const negotiating = renewals.filter(r => r.status === 'negotiating').length;

      const renewalRate = total > 0 ? (accepted / total) * 100 : 0;

      const avgRentIncrease = renewals
        .filter(r => r.status === 'accepted' || r.status === 'completed')
        .reduce((sum, r) => sum + (r.proposed_rent - r.original_rent), 0) / (accepted || 1);

      return {
        total,
        accepted,
        declined,
        pending,
        negotiating,
        renewalRate: renewalRate.toFixed(2),
        avgRentIncrease: avgRentIncrease.toFixed(2),
      };
    } catch (error) {
      logger.error('Error fetching renewal analytics:', error);
      throw error;
    }
  }

  /**
   * Send follow-up for non-responses
   */
  async sendFollowUpReminders(): Promise<void> {
    try {
      const today = new Date();

      // Get renewals with approaching deadlines (3 days before)
      const { data: renewals, error } = await supabase
        .from('lease_renewals')
        .select(`
          *,
          leases (
            *,
            properties (
              address,
              city,
              state
            ),
            tenants (
              full_name,
              email,
              phone
            )
          )
        `)
        .in('status', ['offer-sent', 'negotiating'])
        .not('response_deadline', 'is', null);

      if (error) throw error;

      for (const renewal of renewals || []) {
        const renewalWithLease = renewal as unknown as RenewalWithLease;
        const deadline = new Date(renewalWithLease.response_deadline!);
        const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDeadline === 3 && !renewalWithLease.tenant_response) {
          const lease = renewalWithLease.leases;
          const tenantEmail = lease.tenants?.email;

          if (tenantEmail) {
            await emailService.sendEmail({
              to: tenantEmail,
              subject: 'Lease Renewal Response Reminder - 3 Days Left',
              html: `
                <h2>Renewal Response Reminder</h2>
                <p>Dear ${lease.tenants?.full_name},</p>
                <p>This is a reminder that your response to the lease renewal offer for <strong>${lease.properties?.address}</strong> is due in <strong>3 days</strong>.</p>
                <p><strong>Response Deadline:</strong> ${deadline.toLocaleDateString()}</p>
                <p>Please log in to your dashboard to review the offer and respond.</p>
                <p>If you have any questions, please don't hesitate to contact us.</p>
              `,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error sending follow-up reminders:', error);
    }
  }

  /**
   * Calculate end date based on start date and term
   */
  private calculateEndDate(startDate: string, termMonths: number): string {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + termMonths);
    end.setDate(end.getDate() - 1); // End one day before the next term starts
    return end.toISOString().split('T')[0];
  }
}

export const leaseRenewalService = new LeaseRenewalService();