/**
 * Agent Service
 * Handles all agent-related operations with Supabase
 * Supports clients, listings, transactions, commissions, leads, schedules, and messages
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import type { Database } from '@/types/supabase';

// Type definitions for agent operations
export interface AgentClient {
  id: string;
  agentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  type: 'buyer' | 'seller' | 'renter' | 'investor';
  status: 'active' | 'pending' | 'inactive' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string;
  assignedDate: Date;
  lastContact: Date;
  notes?: string;
  preferences?: {
    budget?: { min: number; max: number };
    location?: string[];
    propertyType?: string[];
    bedrooms?: number;
    bathrooms?: number;
    features?: string[];
  };
  leadScore?: number;
  conversionProbability?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentTransaction {
  id: string;
  agentId: string;
  clientId: string;
  propertyId: string;
  type: 'sale' | 'purchase' | 'lease';
  status: 'lead' | 'showing' | 'offer' | 'under_contract' | 'closing' | 'closed' | 'lost';
  pipelineStage: string;
  stageEnteredAt: Date;
  estimatedCloseDate?: Date;
  actualCloseDate?: Date;
  salePrice?: number;
  commissionAmount?: number;
  commissionRate?: number;
  probabilityPercent: number;
  stalledReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentCommission {
  id: string;
  agentId: string;
  transactionId: string;
  amount: number;
  rate: number;
  splitPercentage: number;
  netAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  paymentDate?: Date;
  paymentMethod?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentLead {
  id: string;
  agentId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  leadStatus: 'new' | 'contacted' | 'qualified' | 'nurturing' | 'hot' | 'cold' | 'converted' | 'lost';
  leadSource: string;
  overallScore: number;
  priorityLevel: 'low' | 'medium' | 'high' | 'critical';
  engagementScore: number;
  budgetAlignmentScore: number;
  timelineUrgencyScore: number;
  responseRateScore: number;
  propertyMatchScore: number;
  predictedConversionProbability?: number;
  totalInteractions: number;
  lastInteractionAt?: Date;
  daysSinceLastContact: number;
  aiRecommendations?: string;
  nextBestAction?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentAppointment {
  id: string;
  agentId: string;
  clientId?: string;
  propertyId?: string;
  type: 'showing' | 'meeting' | 'call' | 'inspection' | 'closing' | 'other';
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  reminderSent: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMessage {
  id: string;
  senderId: string;
  receiverId: string;
  subject?: string;
  content: string;
  type: 'internal' | 'client' | 'system';
  status: 'sent' | 'delivered' | 'read';
  readAt?: Date;
  attachments?: string[];
  createdAt: Date;
}

export interface ClientSearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string[];
  type?: string[];
  priority?: string[];
  search?: string;
  minLeadScore?: number;
  source?: string;
}

export interface TransactionSearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string[];
  pipelineStage?: string[];
  type?: string[];
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface LeadSearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  leadStatus?: string[];
  priorityLevel?: string[];
  minScore?: number;
  source?: string;
}

class AgentService {
  // ============================================================================
  // CLIENT MANAGEMENT
  // ============================================================================

  /**
   * Get all clients for an agent with filters and pagination
   */
  async getClients(
    agentId: string,
    params: ClientSearchParams = {}
  ): Promise<{ clients: AgentClient[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        type,
        priority,
        search,
        minLeadScore,
        source
      } = params;

      let query = supabase
        .from('agent_clients')
        .select('*', { count: 'exact' })
        .eq('agent_id', agentId);

      // Apply filters
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (type && type.length > 0) {
        query = query.in('type', type);
      }

      if (priority && priority.length > 0) {
        query = query.in('priority', priority);
      }

      if (source) {
        query = query.eq('source', source);
      }

      if (minLeadScore !== undefined) {
        query = query.gte('lead_score', minLeadScore);
      }

      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching clients:', error);
        throw new Error('Failed to fetch clients');
      }

      const clients = (data || []).map(this.mapClientRowToClient);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return { clients, total, page, totalPages };
    } catch (error) {
      logger.error('Error in getClients:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch clients');
    }
  }

  /**
   * Get a single client by ID
   */
  async getClientById(clientId: string): Promise<AgentClient | null> {
    try {
      const { data, error } = await supabase
        .from('agent_clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Error fetching client:', error);
        throw new Error('Failed to fetch client');
      }

      return data ? this.mapClientRowToClient(data) : null;
    } catch (error) {
      logger.error('Error in getClientById:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch client');
    }
  }

  /**
   * Create a new client
   */
  async createClient(agentId: string, clientData: Partial<AgentClient>): Promise<AgentClient> {
    try {
      const { data, error } = await supabase
        .from('agent_clients')
        .insert({
          agent_id: agentId,
          first_name: clientData.firstName,
          last_name: clientData.lastName,
          email: clientData.email,
          phone: clientData.phone,
          type: clientData.type,
          status: clientData.status || 'pending',
          priority: clientData.priority || 'medium',
          source: clientData.source,
          assigned_date: new Date().toISOString(),
          last_contact: new Date().toISOString(),
          notes: clientData.notes,
          preferences: clientData.preferences,
          lead_score: clientData.leadScore,
          conversion_probability: clientData.conversionProbability,
          tags: clientData.tags
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating client:', error);
        throw new Error('Failed to create client');
      }

      return this.mapClientRowToClient(data);
    } catch (error) {
      logger.error('Error in createClient:', error);
      throw error instanceof Error ? error : new Error('Failed to create client');
    }
  }

  /**
   * Update an existing client
   */
  async updateClient(clientId: string, clientData: Partial<AgentClient>): Promise<AgentClient> {
    try {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (clientData.firstName !== undefined) updates.first_name = clientData.firstName;
      if (clientData.lastName !== undefined) updates.last_name = clientData.lastName;
      if (clientData.email !== undefined) updates.email = clientData.email;
      if (clientData.phone !== undefined) updates.phone = clientData.phone;
      if (clientData.type !== undefined) updates.type = clientData.type;
      if (clientData.status !== undefined) updates.status = clientData.status;
      if (clientData.priority !== undefined) updates.priority = clientData.priority;
      if (clientData.notes !== undefined) updates.notes = clientData.notes;
      if (clientData.preferences !== undefined) updates.preferences = clientData.preferences;
      if (clientData.leadScore !== undefined) updates.lead_score = clientData.leadScore;
      if (clientData.conversionProbability !== undefined)
        updates.conversion_probability = clientData.conversionProbability;
      if (clientData.tags !== undefined) updates.tags = clientData.tags;
      if (clientData.lastContact !== undefined) updates.last_contact = clientData.lastContact.toISOString();

      const { data, error } = await supabase
        .from('agent_clients')
        .update(updates)
        .eq('id', clientId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating client:', error);
        throw new Error('Failed to update client');
      }

      return this.mapClientRowToClient(data);
    } catch (error) {
      logger.error('Error in updateClient:', error);
      throw error instanceof Error ? error : new Error('Failed to update client');
    }
  }

  /**
   * Delete a client
   */
  async deleteClient(clientId: string): Promise<void> {
    try {
      const { error } = await supabase.from('agent_clients').delete().eq('id', clientId);

      if (error) {
        logger.error('Error deleting client:', error);
        throw new Error('Failed to delete client');
      }
    } catch (error) {
      logger.error('Error in deleteClient:', error);
      throw error instanceof Error ? error : new Error('Failed to delete client');
    }
  }

  // ============================================================================
  // TRANSACTION MANAGEMENT
  // ============================================================================

  /**
   * Get all transactions for an agent with filters and pagination
   */
  async getTransactions(
    agentId: string,
    params: TransactionSearchParams = {}
  ): Promise<{ transactions: AgentTransaction[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        pipelineStage,
        type,
        minAmount,
        maxAmount,
        dateFrom,
        dateTo
      } = params;

      let query = supabase
        .from('app_a5f54_transactions')
        .select('*', { count: 'exact' })
        .eq('agent_id', agentId);

      // Apply filters
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (pipelineStage && pipelineStage.length > 0) {
        query = query.in('pipeline_stage', pipelineStage);
      }

      if (type && type.length > 0) {
        query = query.in('type', type);
      }

      if (minAmount !== undefined) {
        query = query.gte('sale_price', minAmount);
      }

      if (maxAmount !== undefined) {
        query = query.lte('sale_price', maxAmount);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching transactions:', error);
        throw new Error('Failed to fetch transactions');
      }

      const transactions = (data || []).map(this.mapTransactionRowToTransaction);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return { transactions, total, page, totalPages };
    } catch (error) {
      logger.error('Error in getTransactions:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch transactions');
    }
  }

  /**
   * Create a new transaction
   */
  async createTransaction(
    agentId: string,
    transactionData: Partial<AgentTransaction>
  ): Promise<AgentTransaction> {
    try {
      const { data, error } = await supabase
        .from('app_a5f54_transactions')
        .insert({
          agent_id: agentId,
          client_id: transactionData.clientId,
          property_id: transactionData.propertyId,
          type: transactionData.type,
          status: transactionData.status || 'lead',
          pipeline_stage: transactionData.pipelineStage || 'lead',
          stage_entered_at: new Date().toISOString(),
          estimated_close_date: transactionData.estimatedCloseDate?.toISOString(),
          sale_price: transactionData.salePrice,
          commission_amount: transactionData.commissionAmount,
          probability_percent: transactionData.probabilityPercent || 50,
          notes: transactionData.notes
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating transaction:', error);
        throw new Error('Failed to create transaction');
      }

      return this.mapTransactionRowToTransaction(data);
    } catch (error) {
      logger.error('Error in createTransaction:', error);
      throw error instanceof Error ? error : new Error('Failed to create transaction');
    }
  }

  /**
   * Update transaction pipeline stage
   */
  async updateTransactionStage(
    transactionId: string,
    newStage: string,
    probabilityPercent?: number
  ): Promise<AgentTransaction> {
    try {
      const updates: Record<string, unknown> = {
        pipeline_stage: newStage,
        stage_entered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (probabilityPercent !== undefined) {
        updates.probability_percent = probabilityPercent;
      }

      const { data, error } = await supabase
        .from('app_a5f54_transactions')
        .update(updates)
        .eq('id', transactionId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating transaction stage:', error);
        throw new Error('Failed to update transaction stage');
      }

      return this.mapTransactionRowToTransaction(data);
    } catch (error) {
      logger.error('Error in updateTransactionStage:', error);
      throw error instanceof Error ? error : new Error('Failed to update transaction stage');
    }
  }

  // ============================================================================
  // COMMISSION MANAGEMENT
  // ============================================================================

  /**
   * Get commissions for an agent
   */
  async getCommissions(
    agentId: string,
    status?: string[]
  ): Promise<AgentCommission[]> {
    try {
      let query = supabase
        .from('agent_commissions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching commissions:', error);
        throw new Error('Failed to fetch commissions');
      }

      return (data || []).map(this.mapCommissionRowToCommission);
    } catch (error) {
      logger.error('Error in getCommissions:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch commissions');
    }
  }

  /**
   * Calculate commission for a transaction
   */
  async calculateCommission(
    transactionId: string,
    salePrice: number,
    commissionRate: number,
    splitPercentage: number
  ): Promise<number> {
    const grossCommission = salePrice * (commissionRate / 100);
    const netCommission = grossCommission * (splitPercentage / 100);
    return netCommission;
  }

  /**
   * Create a commission record
   */
  async createCommission(
    agentId: string,
    commissionData: Partial<AgentCommission>
  ): Promise<AgentCommission> {
    try {
      const { data, error } = await supabase
        .from('agent_commissions')
        .insert({
          agent_id: agentId,
          transaction_id: commissionData.transactionId,
          amount: commissionData.amount,
          rate: commissionData.rate,
          split_percentage: commissionData.splitPercentage,
          net_amount: commissionData.netAmount,
          status: commissionData.status || 'pending',
          notes: commissionData.notes
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating commission:', error);
        throw new Error('Failed to create commission');
      }

      return this.mapCommissionRowToCommission(data);
    } catch (error) {
      logger.error('Error in createCommission:', error);
      throw error instanceof Error ? error : new Error('Failed to create commission');
    }
  }

  // ============================================================================
  // LEAD MANAGEMENT
  // ============================================================================

  /**
   * Get leads for an agent with filters and pagination
   */
  async getLeads(
    agentId: string,
    params: LeadSearchParams = {}
  ): Promise<{ leads: AgentLead[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'overall_score',
        sortOrder = 'desc',
        leadStatus,
        priorityLevel,
        minScore,
        source
      } = params;

      let query = supabase
        .from('app_a12f5_lead_scores')
        .select('*', { count: 'exact' })
        .eq('agent_id', agentId);

      // Apply filters
      if (leadStatus && leadStatus.length > 0) {
        query = query.in('lead_status', leadStatus);
      }

      if (priorityLevel && priorityLevel.length > 0) {
        query = query.in('priority_level', priorityLevel);
      }

      if (minScore !== undefined) {
        query = query.gte('overall_score', minScore);
      }

      if (source) {
        query = query.eq('lead_source', source);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching leads:', error);
        throw new Error('Failed to fetch leads');
      }

      const leads = (data || []).map(this.mapLeadRowToLead);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return { leads, total, page, totalPages };
    } catch (error) {
      logger.error('Error in getLeads:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch leads');
    }
  }

  /**
   * Update lead score and status
   */
  async updateLead(leadId: string, leadData: Partial<AgentLead>): Promise<AgentLead> {
    try {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (leadData.leadStatus !== undefined) updates.lead_status = leadData.leadStatus;
      if (leadData.overallScore !== undefined) updates.overall_score = leadData.overallScore;
      if (leadData.priorityLevel !== undefined) updates.priority_level = leadData.priorityLevel;
      if (leadData.engagementScore !== undefined) updates.engagement_score = leadData.engagementScore;
      if (leadData.budgetAlignmentScore !== undefined)
        updates.budget_alignment_score = leadData.budgetAlignmentScore;
      if (leadData.timelineUrgencyScore !== undefined)
        updates.timeline_urgency_score = leadData.timelineUrgencyScore;
      if (leadData.responseRateScore !== undefined) updates.response_rate_score = leadData.responseRateScore;
      if (leadData.propertyMatchScore !== undefined) updates.property_match_score = leadData.propertyMatchScore;
      if (leadData.totalInteractions !== undefined) updates.total_interactions = leadData.totalInteractions;
      if (leadData.lastInteractionAt !== undefined)
        updates.last_interaction_at = leadData.lastInteractionAt.toISOString();
      if (leadData.daysSinceLastContact !== undefined)
        updates.days_since_last_contact = leadData.daysSinceLastContact;

      const { data, error } = await supabase
        .from('app_a12f5_lead_scores')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating lead:', error);
        throw new Error('Failed to update lead');
      }

      return this.mapLeadRowToLead(data);
    } catch (error) {
      logger.error('Error in updateLead:', error);
      throw error instanceof Error ? error : new Error('Failed to update lead');
    }
  }

  // ============================================================================
  // APPOINTMENT/SCHEDULE MANAGEMENT
  // ============================================================================

  /**
   * Get appointments for an agent
   */
  async getAppointments(
    agentId: string,
    dateFrom?: Date,
    dateTo?: Date,
    status?: string[]
  ): Promise<AgentAppointment[]> {
    try {
      let query = supabase
        .from('agent_appointments')
        .select('*')
        .eq('agent_id', agentId)
        .order('start_time', { ascending: true });

      if (dateFrom) {
        query = query.gte('start_time', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('start_time', dateTo.toISOString());
      }

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching appointments:', error);
        throw new Error('Failed to fetch appointments');
      }

      return (data || []).map(this.mapAppointmentRowToAppointment);
    } catch (error) {
      logger.error('Error in getAppointments:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch appointments');
    }
  }

  /**
   * Create a new appointment
   */
  async createAppointment(
    agentId: string,
    appointmentData: Partial<AgentAppointment>
  ): Promise<AgentAppointment> {
    try {
      const { data, error } = await supabase
        .from('agent_appointments')
        .insert({
          agent_id: agentId,
          client_id: appointmentData.clientId,
          property_id: appointmentData.propertyId,
          type: appointmentData.type,
          title: appointmentData.title,
          description: appointmentData.description,
          start_time: appointmentData.startTime?.toISOString(),
          end_time: appointmentData.endTime?.toISOString(),
          location: appointmentData.location,
          status: appointmentData.status || 'scheduled',
          reminder_sent: false,
          notes: appointmentData.notes
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating appointment:', error);
        throw new Error('Failed to create appointment');
      }

      return this.mapAppointmentRowToAppointment(data);
    } catch (error) {
      logger.error('Error in createAppointment:', error);
      throw error instanceof Error ? error : new Error('Failed to create appointment');
    }
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(appointmentId: string, status: string): Promise<AgentAppointment> {
    try {
      const { data, error } = await supabase
        .from('agent_appointments')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating appointment status:', error);
        throw new Error('Failed to update appointment status');
      }

      return this.mapAppointmentRowToAppointment(data);
    } catch (error) {
      logger.error('Error in updateAppointmentStatus:', error);
      throw error instanceof Error ? error : new Error('Failed to update appointment status');
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(appointmentId: string, reason?: string): Promise<AgentAppointment> {
    try {
      const updates: Record<string, unknown> = {
        status: 'cancelled',
        updated_at: new Date().toISOString()
      };

      if (reason) {
        updates.notes = reason;
      }

      const { data, error } = await supabase
        .from('agent_appointments')
        .update(updates)
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) {
        logger.error('Error cancelling appointment:', error);
        throw new Error('Failed to cancel appointment');
      }

      return this.mapAppointmentRowToAppointment(data);
    } catch (error) {
      logger.error('Error in cancelAppointment:', error);
      throw error instanceof Error ? error : new Error('Failed to cancel appointment');
    }
  }

  // ============================================================================
  // MESSAGE MANAGEMENT
  // ============================================================================

  /**
   * Get messages for an agent
   */
  async getMessages(agentId: string, type?: string, unreadOnly?: boolean): Promise<AgentMessage[]> {
    try {
      let query = supabase
        .from('agent_messages')
        .select('*')
        .or(`sender_id.eq.${agentId},receiver_id.eq.${agentId}`)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      if (unreadOnly) {
        query = query.eq('receiver_id', agentId).eq('status', 'delivered');
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching messages:', error);
        throw new Error('Failed to fetch messages');
      }

      return (data || []).map(this.mapMessageRowToMessage);
    } catch (error) {
      logger.error('Error in getMessages:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch messages');
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    subject?: string,
    type: string = 'internal'
  ): Promise<AgentMessage> {
    try {
      const { data, error } = await supabase
        .from('agent_messages')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          subject,
          content,
          type,
          status: 'sent'
        })
        .select()
        .single();

      if (error) {
        logger.error('Error sending message:', error);
        throw new Error('Failed to send message');
      }

      return this.mapMessageRowToMessage(data);
    } catch (error) {
      logger.error('Error in sendMessage:', error);
      throw error instanceof Error ? error : new Error('Failed to send message');
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<AgentMessage> {
    try {
      const { data, error } = await supabase
        .from('agent_messages')
        .update({
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        logger.error('Error marking message as read:', error);
        throw new Error('Failed to mark message as read');
      }

      return this.mapMessageRowToMessage(data);
    } catch (error) {
      logger.error('Error in markMessageAsRead:', error);
      throw error instanceof Error ? error : new Error('Failed to mark message as read');
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadMessageCount(agentId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('agent_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', agentId)
        .eq('status', 'delivered');

      if (error) {
        logger.error('Error getting unread message count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error in getUnreadMessageCount:', error);
      return 0;
    }
  }

  // ============================================================================
  // HELPER METHODS - Data Mapping
  // ============================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapClientRowToClient(row: any): AgentClient {
    return {
      id: row.id,
      agentId: row.agent_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      type: row.type,
      status: row.status,
      priority: row.priority,
      source: row.source,
      assignedDate: new Date(row.assigned_date),
      lastContact: new Date(row.last_contact),
      notes: row.notes,
      preferences: row.preferences,
      leadScore: row.lead_score,
      conversionProbability: row.conversion_probability,
      tags: row.tags,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapTransactionRowToTransaction(row: any): AgentTransaction {
    return {
      id: row.id,
      agentId: row.agent_id,
      clientId: row.client_id,
      propertyId: row.property_id,
      type: row.type,
      status: row.status,
      pipelineStage: row.pipeline_stage,
      stageEnteredAt: new Date(row.stage_entered_at),
      estimatedCloseDate: row.estimated_close_date ? new Date(row.estimated_close_date) : undefined,
      actualCloseDate: row.actual_close_date ? new Date(row.actual_close_date) : undefined,
      salePrice: row.sale_price,
      commissionAmount: row.commission_amount,
      commissionRate: row.commission_rate,
      probabilityPercent: row.probability_percent,
      stalledReason: row.stalled_reason,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapCommissionRowToCommission(row: any): AgentCommission {
    return {
      id: row.id,
      agentId: row.agent_id,
      transactionId: row.transaction_id,
      amount: Number(row.amount),
      rate: Number(row.rate),
      splitPercentage: Number(row.split_percentage),
      netAmount: Number(row.net_amount),
      status: row.status,
      paymentDate: row.payment_date ? new Date(row.payment_date) : undefined,
      paymentMethod: row.payment_method,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapLeadRowToLead(row: any): AgentLead {
    return {
      id: row.id,
      agentId: row.agent_id,
      clientName: row.client_name,
      clientEmail: row.client_email,
      clientPhone: row.client_phone,
      leadStatus: row.lead_status,
      leadSource: row.lead_source,
      overallScore: row.overall_score,
      priorityLevel: row.priority_level,
      engagementScore: row.engagement_score,
      budgetAlignmentScore: row.budget_alignment_score,
      timelineUrgencyScore: row.timeline_urgency_score,
      responseRateScore: row.response_rate_score,
      propertyMatchScore: row.property_match_score,
      predictedConversionProbability: row.predicted_conversion_probability,
      totalInteractions: row.total_interactions,
      lastInteractionAt: row.last_interaction_at ? new Date(row.last_interaction_at) : undefined,
      daysSinceLastContact: row.days_since_last_contact,
      aiRecommendations: row.ai_recommendations,
      nextBestAction: row.next_best_action,
      tags: row.tags,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapAppointmentRowToAppointment(row: any): AgentAppointment {
    return {
      id: row.id,
      agentId: row.agent_id,
      clientId: row.client_id,
      propertyId: row.property_id,
      type: row.type,
      title: row.title,
      description: row.description,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      location: row.location,
      status: row.status,
      reminderSent: row.reminder_sent,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapMessageRowToMessage(row: any): AgentMessage {
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      subject: row.subject,
      content: row.content,
      type: row.type,
      status: row.status,
      readAt: row.read_at ? new Date(row.read_at) : undefined,
      attachments: row.attachments,
      createdAt: new Date(row.created_at)
    };
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to client changes
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribeToClients(agentId: string, callback: (payload: any) => void) {
    return supabase
      .channel('agent_clients_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_clients',
          filter: `agent_id=eq.${agentId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to transaction changes
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribeToTransactions(agentId: string, callback: (payload: any) => void) {
    return supabase
      .channel('agent_transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_a5f54_transactions',
          filter: `agent_id=eq.${agentId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to new messages
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribeToMessages(agentId: string, callback: (payload: any) => void) {
    return supabase
      .channel('agent_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_messages',
          filter: `receiver_id=eq.${agentId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to appointment changes
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribeToAppointments(agentId: string, callback: (payload: any) => void) {
    return supabase
      .channel('agent_appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_appointments',
          filter: `agent_id=eq.${agentId}`
        },
        callback
      )
      .subscribe();
  }
}

export const agentService = new AgentService();