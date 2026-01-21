import { supabase } from '@/lib/supabase/client';
import { emailService } from './emailService';
import { smsService } from './smsService';

export interface RenewalOffer {
  id: string;
  lease_id: string;
  landlord_id: string;
  tenant_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'negotiating' | 'expired';
  original_rent: number;
  proposed_rent: number;
  final_rent: number | null;
  original_term_months: number;
  proposed_term_months: number;
  final_term_months: number | null;
  special_terms: string | null;
  offer_expiration_date: string;
  response_date: string | null;
  new_lease_start_date: string | null;
  new_lease_end_date: string | null;
  negotiation_rounds: number;
  created_at: string;
  updated_at: string;
  lease?: {
    id: string;
    monthly_rent: number;
    lease_term_months: number;
    start_date: string;
    end_date: string;
    landlord_id: string;
    tenant_id: string;
    property_id: string;
    property?: {
      id: string;
      address: string;
      city: string;
      state: string;
      zip_code: string;
      property_type: string;
    };
    tenant?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
    landlord?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
  };
  counter_offers?: CounterOffer[];
}

export interface CounterOffer {
  id: string;
  renewal_id: string;
  offered_by: 'tenant' | 'landlord';
  proposed_rent: number;
  proposed_term_months: number;
  additional_terms: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface RenewalReminder {
  id: string;
  lease_id: string;
  reminder_type: '90_day' | '60_day' | '30_day';
  sent_at: string;
  acknowledged_at: string | null;
  created_at: string;
}

export interface CreateRenewalOfferData {
  lease_id: string;
  proposed_rent: number;
  proposed_term_months: number;
  special_terms?: string;
  offer_expiration_date: string;
  new_lease_start_date: string;
}

export interface RespondToOfferData {
  response: 'accept' | 'decline' | 'negotiate';
  decline_reason?: string;
  decline_comment?: string;
  counter_offer?: {
    proposed_rent: number;
    proposed_term_months: number;
    additional_terms?: string;
  };
}

export interface RenewalAnalytics {
  total_renewals: number;
  renewal_rate: number;
  average_rent_increase: number;
  average_negotiation_rounds: number;
  renewals_by_month: Array<{ month: string; count: number }>;
  rent_adjustments: Array<{ range: string; count: number }>;
  response_times: Array<{ days: number; count: number }>;
}

interface LeaseWithRelations {
  id: string;
  monthly_rent: number;
  lease_term_months: number;
  start_date: string;
  end_date: string;
  landlord_id: string;
  tenant_id: string;
  property_id: string;
  security_deposit?: number;
  late_fee?: number;
  property: {
    id: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    property_type: string;
  };
  tenant: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  landlord: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

class RenewalService {
  /**
   * Check for leases expiring in the next 90 days
   */
  async checkUpcomingExpirations(): Promise<LeaseWithRelations[]> {
    const today = new Date();
    const in90Days = new Date(today);
    in90Days.setDate(in90Days.getDate() + 90);

    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:tenants(*),
        landlord:landlords(*)
      `)
      .eq('status', 'active')
      .lte('end_date', in90Days.toISOString())
      .gte('end_date', today.toISOString())
      .order('end_date', { ascending: true });

    if (error) throw error;
    return (data || []) as LeaseWithRelations[];
  }

  /**
   * Create and send a renewal reminder
   */
  async createReminder(
    leaseId: string,
    reminderType: '90_day' | '60_day' | '30_day'
  ): Promise<RenewalReminder> {
    // Check if reminder already sent
    const { data: existing } = await supabase
      .from('renewal_reminders')
      .select('*')
      .eq('lease_id', leaseId)
      .eq('reminder_type', reminderType)
      .single();

    if (existing) {
      return existing;
    }

    // Get lease details
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:tenants(*),
        landlord:landlords(*)
      `)
      .eq('id', leaseId)
      .single();

    if (leaseError) throw leaseError;

    const leaseData = lease as LeaseWithRelations;

    // Create reminder record
    const { data: reminder, error: reminderError } = await supabase
      .from('renewal_reminders')
      .insert({
        lease_id: leaseId,
        reminder_type: reminderType,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (reminderError) throw reminderError;

    // Send notifications
    const daysUntilExpiration = reminderType === '90_day' ? 90 : reminderType === '60_day' ? 60 : 30;
    const expirationDate = new Date(leaseData.end_date).toLocaleDateString();

    // Email to tenant
    await emailService.sendEmail({
      to: leaseData.tenant.email,
      subject: `Lease Renewal Reminder - ${daysUntilExpiration} Days Until Expiration`,
      html: `
        <h2>Lease Renewal Reminder</h2>
        <p>Dear ${leaseData.tenant.first_name} ${leaseData.tenant.last_name},</p>
        <p>This is a reminder that your lease for <strong>${leaseData.property.address}</strong> will expire in <strong>${daysUntilExpiration} days</strong> on ${expirationDate}.</p>
        <p>Your landlord will be sending you a renewal offer soon. Please review it carefully and respond before the deadline.</p>
        <p>If you have any questions, please contact your landlord.</p>
        <p>Best regards,<br>Property Management Team</p>
      `,
    });

    // Email to landlord
    await emailService.sendEmail({
      to: leaseData.landlord.email,
      subject: `Lease Expiration Alert - ${daysUntilExpiration} Days`,
      html: `
        <h2>Lease Expiration Alert</h2>
        <p>Dear ${leaseData.landlord.first_name} ${leaseData.landlord.last_name},</p>
        <p>The lease for <strong>${leaseData.property.address}</strong> (Tenant: ${leaseData.tenant.first_name} ${leaseData.tenant.last_name}) will expire in <strong>${daysUntilExpiration} days</strong> on ${expirationDate}.</p>
        <p>Please consider sending a renewal offer to your tenant.</p>
        <p><a href="${window.location.origin}/landlord/renewals/create?lease_id=${leaseId}">Create Renewal Offer</a></p>
        <p>Best regards,<br>Property Management Team</p>
      `,
    });

    // SMS for 30-day reminder
    if (reminderType === '30_day') {
      await smsService.sendSMS({
        to: leaseData.landlord.phone,
        message: `Lease expiration alert: ${leaseData.property.address} expires in 30 days (${expirationDate}). Send renewal offer soon.`,
      });
    }

    return reminder;
  }

  /**
   * Create a new renewal offer
   */
  async createRenewalOffer(data: CreateRenewalOfferData): Promise<RenewalOffer> {
    // Get lease details
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:tenants(*),
        landlord:landlords(*)
      `)
      .eq('id', data.lease_id)
      .single();

    if (leaseError) throw leaseError;

    const leaseData = lease as LeaseWithRelations;

    // Calculate new lease end date
    const startDate = new Date(data.new_lease_start_date);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.proposed_term_months);

    // Create renewal offer
    const { data: offer, error: offerError } = await supabase
      .from('lease_renewals')
      .insert({
        lease_id: data.lease_id,
        landlord_id: leaseData.landlord_id,
        tenant_id: leaseData.tenant_id,
        status: 'pending',
        original_rent: leaseData.monthly_rent,
        proposed_rent: data.proposed_rent,
        original_term_months: leaseData.lease_term_months,
        proposed_term_months: data.proposed_term_months,
        special_terms: data.special_terms,
        offer_expiration_date: data.offer_expiration_date,
        new_lease_start_date: data.new_lease_start_date,
        new_lease_end_date: endDate.toISOString(),
        negotiation_rounds: 0,
      })
      .select()
      .single();

    if (offerError) throw offerError;

    // Send email notification to tenant
    const rentChange = data.proposed_rent - leaseData.monthly_rent;
    const rentChangePercent = ((rentChange / leaseData.monthly_rent) * 100).toFixed(1);
    const rentChangeText = rentChange > 0 
      ? `increase of $${rentChange.toFixed(2)} (${rentChangePercent}%)`
      : rentChange < 0
      ? `decrease of $${Math.abs(rentChange).toFixed(2)} (${Math.abs(parseFloat(rentChangePercent))}%)`
      : 'no change';

    await emailService.sendEmail({
      to: leaseData.tenant.email,
      subject: 'New Lease Renewal Offer',
      html: `
        <h2>New Lease Renewal Offer</h2>
        <p>Dear ${leaseData.tenant.first_name} ${leaseData.tenant.last_name},</p>
        <p>Your landlord has sent you a renewal offer for <strong>${leaseData.property.address}</strong>.</p>
        <h3>Offer Details:</h3>
        <ul>
          <li><strong>Current Rent:</strong> $${leaseData.monthly_rent.toFixed(2)}/month</li>
          <li><strong>New Rent:</strong> $${data.proposed_rent.toFixed(2)}/month (${rentChangeText})</li>
          <li><strong>Lease Term:</strong> ${data.proposed_term_months} months</li>
          <li><strong>Start Date:</strong> ${new Date(data.new_lease_start_date).toLocaleDateString()}</li>
          <li><strong>End Date:</strong> ${endDate.toLocaleDateString()}</li>
          ${data.special_terms ? `<li><strong>Special Terms:</strong> ${data.special_terms}</li>` : ''}
        </ul>
        <p><strong>Please respond by ${new Date(data.offer_expiration_date).toLocaleDateString()}</strong></p>
        <p><a href="${window.location.origin}/tenant/renewals/${offer.id}">View and Respond to Offer</a></p>
        <p>Best regards,<br>${leaseData.landlord.first_name} ${leaseData.landlord.last_name}</p>
      `,
    });

    return offer as RenewalOffer;
  }

  /**
   * Get all renewal offers for a landlord
   */
  async getRenewalOffersByLandlord(
    landlordId: string,
    filters?: { status?: string; property_id?: string }
  ): Promise<RenewalOffer[]> {
    let query = supabase
      .from('lease_renewals')
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*),
          tenant:tenants(*)
        )
      `)
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as RenewalOffer[];
  }

  /**
   * Get all renewal offers for a tenant
   */
  async getRenewalOffersByTenant(
    tenantId: string,
    filters?: { status?: string }
  ): Promise<RenewalOffer[]> {
    let query = supabase
      .from('lease_renewals')
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*),
          landlord:landlords(*)
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as RenewalOffer[];
  }

  /**
   * Get a single renewal offer by ID
   */
  async getRenewalOfferById(id: string): Promise<RenewalOffer> {
    const { data, error } = await supabase
      .from('lease_renewals')
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*),
          tenant:tenants(*),
          landlord:landlords(*)
        ),
        counter_offers:renewal_counter_offers(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as RenewalOffer;
  }

  /**
   * Respond to a renewal offer
   */
  async respondToOffer(
    offerId: string,
    responseData: RespondToOfferData
  ): Promise<RenewalOffer> {
    const offer = await this.getRenewalOfferById(offerId);

    // Check if offer is expired
    if (new Date(offer.offer_expiration_date) < new Date()) {
      await supabase
        .from('lease_renewals')
        .update({ status: 'expired' })
        .eq('id', offerId);
      throw new Error('This offer has expired');
    }

    // Check if offer is still pending
    if (offer.status !== 'pending' && offer.status !== 'negotiating') {
      throw new Error('This offer has already been responded to');
    }

    if (responseData.response === 'accept') {
      // Accept the offer
      const { data, error } = await supabase
        .from('lease_renewals')
        .update({
          status: 'accepted',
          final_rent: offer.proposed_rent,
          final_term_months: offer.proposed_term_months,
          response_date: new Date().toISOString(),
        })
        .eq('id', offerId)
        .select()
        .single();

      if (error) throw error;

      // Send notification to landlord
      if (offer.lease?.landlord && offer.lease?.tenant && offer.lease?.property) {
        await emailService.sendEmail({
          to: offer.lease.landlord.email,
          subject: 'Renewal Offer Accepted',
          html: `
            <h2>Great News!</h2>
            <p>Dear ${offer.lease.landlord.first_name} ${offer.lease.landlord.last_name},</p>
            <p>${offer.lease.tenant.first_name} ${offer.lease.tenant.last_name} has <strong>accepted</strong> your renewal offer for <strong>${offer.lease.property.address}</strong>.</p>
            <p>The new lease document is being generated and will be sent for e-signature shortly.</p>
            <p><a href="${window.location.origin}/landlord/renewals/${offerId}">View Renewal Details</a></p>
            <p>Best regards,<br>Property Management Team</p>
          `,
        });
      }

      return data as RenewalOffer;
    } else if (responseData.response === 'decline') {
      // Decline the offer
      const { data, error } = await supabase
        .from('lease_renewals')
        .update({
          status: 'declined',
          response_date: new Date().toISOString(),
        })
        .eq('id', offerId)
        .select()
        .single();

      if (error) throw error;

      // Send notification to landlord
      if (offer.lease?.landlord && offer.lease?.tenant && offer.lease?.property) {
        await emailService.sendEmail({
          to: offer.lease.landlord.email,
          subject: 'Renewal Offer Declined',
          html: `
            <h2>Renewal Offer Declined</h2>
            <p>Dear ${offer.lease.landlord.first_name} ${offer.lease.landlord.last_name},</p>
            <p>${offer.lease.tenant.first_name} ${offer.lease.tenant.last_name} has <strong>declined</strong> your renewal offer for <strong>${offer.lease.property.address}</strong>.</p>
            ${responseData.decline_reason ? `<p><strong>Reason:</strong> ${responseData.decline_reason}</p>` : ''}
            ${responseData.decline_comment ? `<p><strong>Comment:</strong> ${responseData.decline_comment}</p>` : ''}
            <p><a href="${window.location.origin}/landlord/renewals/${offerId}">View Renewal Details</a></p>
            <p>Best regards,<br>Property Management Team</p>
          `,
        });
      }

      return data as RenewalOffer;
    } else if (responseData.response === 'negotiate') {
      // Create counter-offer
      if (!responseData.counter_offer) {
        throw new Error('Counter-offer data is required for negotiation');
      }

      // Check negotiation rounds limit
      if (offer.negotiation_rounds >= 5) {
        throw new Error('Maximum negotiation rounds (5) reached');
      }

      // Update offer status
      const { error: updateError } = await supabase
        .from('lease_renewals')
        .update({
          status: 'negotiating',
          negotiation_rounds: offer.negotiation_rounds + 1,
        })
        .eq('id', offerId);

      if (updateError) throw updateError;

      // Create counter-offer
      const { data: counterOffer, error: counterError } = await supabase
        .from('renewal_counter_offers')
        .insert({
          renewal_id: offerId,
          offered_by: 'tenant',
          proposed_rent: responseData.counter_offer.proposed_rent,
          proposed_term_months: responseData.counter_offer.proposed_term_months,
          additional_terms: responseData.counter_offer.additional_terms,
          status: 'pending',
        })
        .select()
        .single();

      if (counterError) throw counterError;

      // Send notification to landlord
      if (offer.lease?.landlord && offer.lease?.tenant && offer.lease?.property) {
        await emailService.sendEmail({
          to: offer.lease.landlord.email,
          subject: 'Counter-Offer Received',
          html: `
            <h2>Counter-Offer Received</h2>
            <p>Dear ${offer.lease.landlord.first_name} ${offer.lease.landlord.last_name},</p>
            <p>${offer.lease.tenant.first_name} ${offer.lease.tenant.last_name} has submitted a counter-offer for <strong>${offer.lease.property.address}</strong>.</p>
            <h3>Counter-Offer Details:</h3>
            <ul>
              <li><strong>Your Offer:</strong> $${offer.proposed_rent.toFixed(2)}/month for ${offer.proposed_term_months} months</li>
              <li><strong>Tenant's Counter:</strong> $${responseData.counter_offer.proposed_rent.toFixed(2)}/month for ${responseData.counter_offer.proposed_term_months} months</li>
              ${responseData.counter_offer.additional_terms ? `<li><strong>Additional Terms:</strong> ${responseData.counter_offer.additional_terms}</li>` : ''}
            </ul>
            <p><a href="${window.location.origin}/landlord/renewals/${offerId}/negotiate">Review and Respond</a></p>
            <p>Best regards,<br>Property Management Team</p>
          `,
        });
      }

      return await this.getRenewalOfferById(offerId);
    }

    throw new Error('Invalid response type');
  }

  /**
   * Create a counter-offer (landlord responding to tenant's counter)
   */
  async createCounterOffer(
    offerId: string,
    counterOfferData: {
      proposed_rent: number;
      proposed_term_months: number;
      additional_terms?: string;
    }
  ): Promise<CounterOffer> {
    const offer = await this.getRenewalOfferById(offerId);

    // Check negotiation rounds limit
    if (offer.negotiation_rounds >= 5) {
      throw new Error('Maximum negotiation rounds (5) reached');
    }

    // Update offer
    const { error: updateError } = await supabase
      .from('lease_renewals')
      .update({
        negotiation_rounds: offer.negotiation_rounds + 1,
      })
      .eq('id', offerId);

    if (updateError) throw updateError;

    // Create counter-offer
    const { data, error } = await supabase
      .from('renewal_counter_offers')
      .insert({
        renewal_id: offerId,
        offered_by: 'landlord',
        proposed_rent: counterOfferData.proposed_rent,
        proposed_term_months: counterOfferData.proposed_term_months,
        additional_terms: counterOfferData.additional_terms,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Send notification to tenant
    if (offer.lease?.tenant && offer.lease?.landlord && offer.lease?.property) {
      await emailService.sendEmail({
        to: offer.lease.tenant.email,
        subject: 'New Counter-Offer Received',
        html: `
          <h2>New Counter-Offer</h2>
          <p>Dear ${offer.lease.tenant.first_name} ${offer.lease.tenant.last_name},</p>
          <p>Your landlord has responded with a counter-offer for <strong>${offer.lease.property.address}</strong>.</p>
          <h3>Counter-Offer Details:</h3>
          <ul>
            <li><strong>Rent:</strong> $${counterOfferData.proposed_rent.toFixed(2)}/month</li>
            <li><strong>Term:</strong> ${counterOfferData.proposed_term_months} months</li>
            ${counterOfferData.additional_terms ? `<li><strong>Additional Terms:</strong> ${counterOfferData.additional_terms}</li>` : ''}
          </ul>
          <p><a href="${window.location.origin}/tenant/renewals/${offerId}/negotiate">Review and Respond</a></p>
          <p>Best regards,<br>${offer.lease.landlord.first_name} ${offer.lease.landlord.last_name}</p>
        `,
      });
    }

    return data as CounterOffer;
  }

  /**
   * Accept a counter-offer
   */
  async acceptCounterOffer(offerId: string, counterOfferId: string): Promise<RenewalOffer> {
    const offer = await this.getRenewalOfferById(offerId);
    
    const { data: counterOffer, error: counterError } = await supabase
      .from('renewal_counter_offers')
      .select('*')
      .eq('id', counterOfferId)
      .single();

    if (counterError) throw counterError;

    const counterOfferData = counterOffer as CounterOffer;

    // Update counter-offer status
    await supabase
      .from('renewal_counter_offers')
      .update({ status: 'accepted' })
      .eq('id', counterOfferId);

    // Calculate new end date
    const startDate = new Date(offer.new_lease_start_date!);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + counterOfferData.proposed_term_months);

    // Update renewal offer
    const { data, error } = await supabase
      .from('lease_renewals')
      .update({
        status: 'accepted',
        final_rent: counterOfferData.proposed_rent,
        final_term_months: counterOfferData.proposed_term_months,
        new_lease_end_date: endDate.toISOString(),
        response_date: new Date().toISOString(),
      })
      .eq('id', offerId)
      .select()
      .single();

    if (error) throw error;

    // Send notifications
    const acceptedBy = counterOfferData.offered_by === 'tenant' ? 'landlord' : 'tenant';
    if (offer.lease?.tenant && offer.lease?.landlord && offer.lease?.property) {
      const notifyEmail = acceptedBy === 'landlord' ? offer.lease.tenant.email : offer.lease.landlord.email;
      const notifyName = acceptedBy === 'landlord' 
        ? `${offer.lease.tenant.first_name} ${offer.lease.tenant.last_name}`
        : `${offer.lease.landlord.first_name} ${offer.lease.landlord.last_name}`;

      await emailService.sendEmail({
        to: notifyEmail,
        subject: 'Counter-Offer Accepted!',
        html: `
          <h2>Great News!</h2>
          <p>Dear ${notifyName},</p>
          <p>Your counter-offer for <strong>${offer.lease.property.address}</strong> has been accepted!</p>
          <h3>Final Agreement:</h3>
          <ul>
            <li><strong>Rent:</strong> $${counterOfferData.proposed_rent.toFixed(2)}/month</li>
            <li><strong>Term:</strong> ${counterOfferData.proposed_term_months} months</li>
            <li><strong>Start Date:</strong> ${new Date(offer.new_lease_start_date!).toLocaleDateString()}</li>
            <li><strong>End Date:</strong> ${endDate.toLocaleDateString()}</li>
          </ul>
          <p>The new lease document is being generated and will be sent for e-signature shortly.</p>
          <p>Best regards,<br>Property Management Team</p>
        `,
      });
    }

    return data as RenewalOffer;
  }

  /**
   * Get renewal analytics for a landlord
   */
  async getRenewalAnalytics(landlordId: string): Promise<RenewalAnalytics> {
    const { data: renewals, error } = await supabase
      .from('lease_renewals')
      .select('*')
      .eq('landlord_id', landlordId);

    if (error) throw error;

    const renewalData = (renewals || []) as RenewalOffer[];
    const totalRenewals = renewalData.length;
    const acceptedRenewals = renewalData.filter(r => r.status === 'accepted').length;
    const renewalRate = totalRenewals > 0 ? (acceptedRenewals / totalRenewals) * 100 : 0;

    // Calculate average rent increase
    const rentIncreases = renewalData
      .filter(r => r.status === 'accepted' && r.final_rent)
      .map(r => r.final_rent! - r.original_rent);
    const averageRentIncrease = rentIncreases.length > 0
      ? rentIncreases.reduce((sum, inc) => sum + inc, 0) / rentIncreases.length
      : 0;

    // Calculate average negotiation rounds
    const totalRounds = renewalData.reduce((sum, r) => sum + r.negotiation_rounds, 0);
    const averageNegotiationRounds = totalRenewals > 0 ? totalRounds / totalRenewals : 0;

    // Renewals by month (last 12 months)
    const renewalsByMonth = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      const count = renewalData.filter(r => r.created_at.startsWith(monthKey)).length;
      renewalsByMonth.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count,
      });
    }

    // Rent adjustment distribution
    const rentAdjustments = [
      { range: 'Decrease', count: 0 },
      { range: 'No Change', count: 0 },
      { range: '0-5%', count: 0 },
      { range: '5-10%', count: 0 },
      { range: '10%+', count: 0 },
    ];

    renewalData.forEach(r => {
      if (r.status === 'accepted' && r.final_rent) {
        const change = r.final_rent - r.original_rent;
        const changePercent = (change / r.original_rent) * 100;
        
        if (change < 0) rentAdjustments[0].count++;
        else if (change === 0) rentAdjustments[1].count++;
        else if (changePercent <= 5) rentAdjustments[2].count++;
        else if (changePercent <= 10) rentAdjustments[3].count++;
        else rentAdjustments[4].count++;
      }
    });

    // Response time distribution
    const responseTimes: Array<{ days: number; count: number }> = [];
    renewalData
      .filter(r => r.response_date)
      .forEach(r => {
        const created = new Date(r.created_at);
        const responded = new Date(r.response_date!);
        const days = Math.floor((responded.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        responseTimes.push({ days, count: 1 });
      });

    return {
      total_renewals: totalRenewals,
      renewal_rate: renewalRate,
      average_rent_increase: averageRentIncrease,
      average_negotiation_rounds: averageNegotiationRounds,
      renewals_by_month: renewalsByMonth,
      rent_adjustments: rentAdjustments,
      response_times: responseTimes,
    };
  }
}

export const renewalService = new RenewalService();