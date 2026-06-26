/**
 * Broker Service
 * Handles all broker-related operations with Supabase
 * Supports agent management, team analytics, commission distribution, and reporting
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import type { AgentTransaction, AgentCommission } from './agentService';

// Type definitions for broker operations
export interface BrokerAgent {
  id: string;
  brokerId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  status: 'active' | 'inactive' | 'suspended';
  role: 'agent' | 'senior_agent' | 'team_lead';
  joinedDate: Date;
  commissionSplit: number; // Percentage the agent receives
  totalDeals: number;
  totalVolume: number;
  totalCommission: number;
  rating: number;
  specialties: string[];
  territories: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamAnalytics {
  totalAgents: number;
  activeAgents: number;
  totalDeals: number;
  totalVolume: number;
  totalCommission: number;
  averageCommissionPerAgent: number;
  topPerformers: BrokerAgent[];
  dealsByStage: Record<string, number>;
  volumeByMonth: Array<{ month: string; volume: number }>;
  commissionByMonth: Array<{ month: string; commission: number }>;
}

export interface BrokerTransaction extends AgentTransaction {
  agentName: string;
  brokerCommission: number;
  brokerCommissionRate: number;
}

export interface BrokerCommissionSplit {
  id: string;
  transactionId: string;
  agentId: string;
  agentName: string;
  brokerId: string;
  totalCommission: number;
  agentSplit: number; // Percentage
  agentAmount: number;
  brokerSplit: number; // Percentage
  brokerAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  paymentDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrokerReport {
  id: string;
  brokerId: string;
  reportType: 'financial' | 'performance' | 'commission' | 'activity';
  title: string;
  description?: string;
  dateFrom: Date;
  dateTo: Date;
  data: Record<string, unknown>;
  generatedAt: Date;
  generatedBy: string;
}

export interface AgentSearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string[];
  role?: string[];
  search?: string;
  minDeals?: number;
  minVolume?: number;
}

export interface TransactionSearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  agentId?: string;
  status?: string[];
  pipelineStage?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

class BrokerService {
  // ============================================================================
  // AGENT MANAGEMENT
  // ============================================================================

  /**
   * Get all agents under a broker with filters and pagination
   */
  async getAgents(
    brokerId: string,
    params: AgentSearchParams = {}
  ): Promise<{ agents: BrokerAgent[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'totalVolume',
        sortOrder = 'desc',
        status,
        role,
        search,
        minDeals,
        minVolume
      } = params;

      let query = supabase
        .from('broker_agents')
        .select('*', { count: 'exact' })
        .eq('broker_id', brokerId);

      // Apply filters
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (role && role.length > 0) {
        query = query.in('role', role);
      }

      if (minDeals !== undefined) {
        query = query.gte('total_deals', minDeals);
      }

      if (minVolume !== undefined) {
        query = query.gte('total_volume', minVolume);
      }

      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,license_number.ilike.%${search}%`
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
        logger.error('Error fetching agents:', error);
        throw new Error('Failed to fetch agents');
      }

      const agents = (data || []).map(this.mapAgentRowToAgent);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return { agents, total, page, totalPages };
    } catch (error) {
      logger.error('Error in getAgents:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch agents');
    }
  }

  /**
   * Get a single agent by ID
   */
  async getAgentById(agentId: string): Promise<BrokerAgent | null> {
    try {
      const { data, error } = await supabase
        .from('broker_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Error fetching agent:', error);
        throw new Error('Failed to fetch agent');
      }

      return data ? this.mapAgentRowToAgent(data) : null;
    } catch (error) {
      logger.error('Error in getAgentById:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch agent');
    }
  }

  /**
   * Create a new agent under broker
   */
  async createAgent(brokerId: string, agentData: Partial<BrokerAgent>): Promise<BrokerAgent> {
    try {
      const { data, error } = await supabase
        .from('broker_agents')
        .insert({
          broker_id: brokerId,
          user_id: agentData.userId,
          first_name: agentData.firstName,
          last_name: agentData.lastName,
          email: agentData.email,
          phone: agentData.phone,
          license_number: agentData.licenseNumber,
          status: agentData.status || 'active',
          role: agentData.role || 'agent',
          joined_date: new Date().toISOString(),
          commission_split: agentData.commissionSplit || 50,
          total_deals: 0,
          total_volume: 0,
          total_commission: 0,
          rating: 0,
          specialties: agentData.specialties || [],
          territories: agentData.territories || []
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating agent:', error);
        throw new Error('Failed to create agent');
      }

      return this.mapAgentRowToAgent(data);
    } catch (error) {
      logger.error('Error in createAgent:', error);
      throw error instanceof Error ? error : new Error('Failed to create agent');
    }
  }

  /**
   * Update an existing agent
   */
  async updateAgent(agentId: string, agentData: Partial<BrokerAgent>): Promise<BrokerAgent> {
    try {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (agentData.firstName !== undefined) updates.first_name = agentData.firstName;
      if (agentData.lastName !== undefined) updates.last_name = agentData.lastName;
      if (agentData.email !== undefined) updates.email = agentData.email;
      if (agentData.phone !== undefined) updates.phone = agentData.phone;
      if (agentData.licenseNumber !== undefined) updates.license_number = agentData.licenseNumber;
      if (agentData.status !== undefined) updates.status = agentData.status;
      if (agentData.role !== undefined) updates.role = agentData.role;
      if (agentData.commissionSplit !== undefined) updates.commission_split = agentData.commissionSplit;
      if (agentData.specialties !== undefined) updates.specialties = agentData.specialties;
      if (agentData.territories !== undefined) updates.territories = agentData.territories;

      const { data, error } = await supabase
        .from('broker_agents')
        .update(updates)
        .eq('id', agentId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating agent:', error);
        throw new Error('Failed to update agent');
      }

      return this.mapAgentRowToAgent(data);
    } catch (error) {
      logger.error('Error in updateAgent:', error);
      throw error instanceof Error ? error : new Error('Failed to update agent');
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    try {
      const { error } = await supabase.from('broker_agents').delete().eq('id', agentId);

      if (error) {
        logger.error('Error deleting agent:', error);
        throw new Error('Failed to delete agent');
      }
    } catch (error) {
      logger.error('Error in deleteAgent:', error);
      throw error instanceof Error ? error : new Error('Failed to delete agent');
    }
  }

  // ============================================================================
  // TEAM ANALYTICS
  // ============================================================================

  /**
   * Get comprehensive team analytics
   */
  async getTeamAnalytics(brokerId: string, dateFrom?: Date, dateTo?: Date): Promise<TeamAnalytics> {
    try {
      // Get all agents
      const { agents } = await this.getAgents(brokerId, { limit: 1000 });

      // Get all transactions for the team
      const { transactions } = await this.getTeamTransactions(brokerId, {
        dateFrom,
        dateTo,
        limit: 10000
      });

      // Calculate metrics
      const totalAgents = agents.length;
      const activeAgents = agents.filter((a) => a.status === 'active').length;
      const totalDeals = transactions.length;
      const totalVolume = transactions.reduce((sum, t) => sum + (t.salePrice || 0), 0);
      const totalCommission = transactions.reduce((sum, t) => sum + (t.commissionAmount || 0), 0);
      const averageCommissionPerAgent = activeAgents > 0 ? totalCommission / activeAgents : 0;

      // Top performers (top 5 by total volume)
      const topPerformers = [...agents]
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, 5);

      // Deals by stage
      const dealsByStage: Record<string, number> = {};
      transactions.forEach((t) => {
        dealsByStage[t.pipelineStage] = (dealsByStage[t.pipelineStage] || 0) + 1;
      });

      // Volume and commission by month (last 12 months)
      const volumeByMonth: Array<{ month: string; volume: number }> = [];
      const commissionByMonth: Array<{ month: string; commission: number }> = [];

      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7);
        const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

        const monthTransactions = transactions.filter((t) => {
          const tDate = new Date(t.createdAt);
          return tDate.toISOString().slice(0, 7) === monthKey;
        });

        const monthVolume = monthTransactions.reduce((sum, t) => sum + (t.salePrice || 0), 0);
        const monthCommission = monthTransactions.reduce(
          (sum, t) => sum + (t.commissionAmount || 0),
          0
        );

        volumeByMonth.push({ month: monthLabel, volume: monthVolume });
        commissionByMonth.push({ month: monthLabel, commission: monthCommission });
      }

      return {
        totalAgents,
        activeAgents,
        totalDeals,
        totalVolume,
        totalCommission,
        averageCommissionPerAgent,
        topPerformers,
        dealsByStage,
        volumeByMonth,
        commissionByMonth
      };
    } catch (error) {
      logger.error('Error in getTeamAnalytics:', error);
      throw error instanceof Error ? error : new Error('Failed to get team analytics');
    }
  }

  // ============================================================================
  // TRANSACTION MANAGEMENT
  // ============================================================================

  /**
   * Get all team transactions with filters and pagination
   */
  async getTeamTransactions(
    brokerId: string,
    params: TransactionSearchParams = {}
  ): Promise<{ transactions: BrokerTransaction[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        agentId,
        status,
        pipelineStage,
        dateFrom,
        dateTo
      } = params;

      // First get all agents under this broker
      const { agents } = await this.getAgents(brokerId, { limit: 1000 });
      const agentIds = agents.map((a) => a.userId);

      if (agentIds.length === 0) {
        return { transactions: [], total: 0, page: 1, totalPages: 0 };
      }

      let query = supabase
        .from('app_a5f54_transactions')
        .select('*', { count: 'exact' })
        .in('agent_id', agentIds);

      // Apply filters
      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (pipelineStage && pipelineStage.length > 0) {
        query = query.in('pipeline_stage', pipelineStage);
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
        logger.error('Error fetching team transactions:', error);
        throw new Error('Failed to fetch team transactions');
      }

      // Map transactions and add agent names
      const agentMap = new Map(agents.map((a) => [a.userId, a]));
      const transactions = (data || []).map((row) => {
        const agent = agentMap.get(row.agent_id);
        const agentName = agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown Agent';
        const brokerCommissionRate = agent ? 100 - agent.commissionSplit : 50;
        const brokerCommission = row.commission_amount
          ? row.commission_amount * (brokerCommissionRate / 100)
          : 0;

        return this.mapTransactionRowToBrokerTransaction(row, agentName, brokerCommission, brokerCommissionRate);
      });

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return { transactions, total, page, totalPages };
    } catch (error) {
      logger.error('Error in getTeamTransactions:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch team transactions');
    }
  }

  // ============================================================================
  // COMMISSION MANAGEMENT
  // ============================================================================

  /**
   * Get commission splits for all team transactions
   */
  async getCommissionSplits(
    brokerId: string,
    status?: string[]
  ): Promise<BrokerCommissionSplit[]> {
    try {
      let query = supabase
        .from('broker_commission_splits')
        .select('*')
        .eq('broker_id', brokerId)
        .order('created_at', { ascending: false });

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching commission splits:', error);
        throw new Error('Failed to fetch commission splits');
      }

      return (data || []).map(this.mapCommissionSplitRow);
    } catch (error) {
      logger.error('Error in getCommissionSplits:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch commission splits');
    }
  }

  /**
   * Calculate commission split for a transaction
   */
  async calculateCommissionSplit(
    transactionId: string,
    agentId: string,
    brokerId: string,
    totalCommission: number,
    agentSplitPercentage: number
  ): Promise<BrokerCommissionSplit> {
    try {
      const agentAmount = totalCommission * (agentSplitPercentage / 100);
      const brokerSplitPercentage = 100 - agentSplitPercentage;
      const brokerAmount = totalCommission * (brokerSplitPercentage / 100);

      // Get agent name
      const agent = await this.getAgentById(agentId);
      const agentName = agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown Agent';

      const { data, error } = await supabase
        .from('broker_commission_splits')
        .insert({
          transaction_id: transactionId,
          agent_id: agentId,
          agent_name: agentName,
          broker_id: brokerId,
          total_commission: totalCommission,
          agent_split: agentSplitPercentage,
          agent_amount: agentAmount,
          broker_split: brokerSplitPercentage,
          broker_amount: brokerAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating commission split:', error);
        throw new Error('Failed to create commission split');
      }

      return this.mapCommissionSplitRow(data);
    } catch (error) {
      logger.error('Error in calculateCommissionSplit:', error);
      throw error instanceof Error ? error : new Error('Failed to calculate commission split');
    }
  }

  /**
   * Update commission split status
   */
  async updateCommissionSplitStatus(
    splitId: string,
    status: string,
    paymentDate?: Date
  ): Promise<BrokerCommissionSplit> {
    try {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString()
      };

      if (paymentDate) {
        updates.payment_date = paymentDate.toISOString();
      }

      const { data, error } = await supabase
        .from('broker_commission_splits')
        .update(updates)
        .eq('id', splitId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating commission split:', error);
        throw new Error('Failed to update commission split');
      }

      return this.mapCommissionSplitRow(data);
    } catch (error) {
      logger.error('Error in updateCommissionSplitStatus:', error);
      throw error instanceof Error ? error : new Error('Failed to update commission split');
    }
  }

  // ============================================================================
  // REPORTING
  // ============================================================================

  /**
   * Generate a broker report
   */
  async generateReport(
    brokerId: string,
    reportType: string,
    title: string,
    dateFrom: Date,
    dateTo: Date,
    generatedBy: string
  ): Promise<BrokerReport> {
    try {
      let reportData: Record<string, unknown> = {};

      switch (reportType) {
        case 'financial':
          reportData = await this.generateFinancialReport(brokerId, dateFrom, dateTo);
          break;
        case 'performance':
          reportData = await this.generatePerformanceReport(brokerId, dateFrom, dateTo);
          break;
        case 'commission':
          reportData = await this.generateCommissionReport(brokerId, dateFrom, dateTo);
          break;
        case 'activity':
          reportData = await this.generateActivityReport(brokerId, dateFrom, dateTo);
          break;
        default:
          throw new Error('Invalid report type');
      }

      const { data, error } = await supabase
        .from('broker_reports')
        .insert({
          broker_id: brokerId,
          report_type: reportType,
          title,
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
          data: reportData,
          generated_at: new Date().toISOString(),
          generated_by: generatedBy
        })
        .select()
        .single();

      if (error) {
        logger.error('Error generating report:', error);
        throw new Error('Failed to generate report');
      }

      return this.mapReportRow(data);
    } catch (error) {
      logger.error('Error in generateReport:', error);
      throw error instanceof Error ? error : new Error('Failed to generate report');
    }
  }

  /**
   * Get all reports for a broker
   */
  async getReports(brokerId: string, reportType?: string): Promise<BrokerReport[]> {
    try {
      let query = supabase
        .from('broker_reports')
        .select('*')
        .eq('broker_id', brokerId)
        .order('generated_at', { ascending: false });

      if (reportType) {
        query = query.eq('report_type', reportType);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching reports:', error);
        throw new Error('Failed to fetch reports');
      }

      return (data || []).map(this.mapReportRow);
    } catch (error) {
      logger.error('Error in getReports:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch reports');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async generateFinancialReport(
    brokerId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<Record<string, unknown>> {
    const { transactions } = await this.getTeamTransactions(brokerId, {
      dateFrom,
      dateTo,
      limit: 10000
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.salePrice || 0), 0);
    const totalCommission = transactions.reduce((sum, t) => sum + (t.commissionAmount || 0), 0);
    const brokerCommission = transactions.reduce((sum, t) => sum + t.brokerCommission, 0);

    return {
      totalRevenue,
      totalCommission,
      brokerCommission,
      agentCommission: totalCommission - brokerCommission,
      transactionCount: transactions.length,
      averageTransactionValue: transactions.length > 0 ? totalRevenue / transactions.length : 0
    };
  }

  private async generatePerformanceReport(
    brokerId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<Record<string, unknown>> {
    const { agents } = await this.getAgents(brokerId, { limit: 1000 });
    const { transactions } = await this.getTeamTransactions(brokerId, {
      dateFrom,
      dateTo,
      limit: 10000
    });

    const agentPerformance = agents.map((agent) => {
      const agentTransactions = transactions.filter((t) => t.agentId === agent.userId);
      return {
        agentName: `${agent.firstName} ${agent.lastName}`,
        deals: agentTransactions.length,
        volume: agentTransactions.reduce((sum, t) => sum + (t.salePrice || 0), 0),
        commission: agentTransactions.reduce((sum, t) => sum + (t.commissionAmount || 0), 0)
      };
    });

    return {
      agentPerformance: agentPerformance.sort((a, b) => b.volume - a.volume),
      totalDeals: transactions.length,
      totalVolume: transactions.reduce((sum, t) => sum + (t.salePrice || 0), 0)
    };
  }

  private async generateCommissionReport(
    brokerId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<Record<string, unknown>> {
    const splits = await this.getCommissionSplits(brokerId);
    const periodSplits = splits.filter((s) => {
      const date = new Date(s.createdAt);
      return date >= dateFrom && date <= dateTo;
    });

    const totalCommission = periodSplits.reduce((sum, s) => sum + s.totalCommission, 0);
    const totalBrokerAmount = periodSplits.reduce((sum, s) => sum + s.brokerAmount, 0);
    const totalAgentAmount = periodSplits.reduce((sum, s) => sum + s.agentAmount, 0);

    return {
      totalCommission,
      totalBrokerAmount,
      totalAgentAmount,
      splitCount: periodSplits.length,
      averageBrokerSplit: periodSplits.length > 0 ? totalBrokerAmount / periodSplits.length : 0
    };
  }

  private async generateActivityReport(
    brokerId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<Record<string, unknown>> {
    const { transactions } = await this.getTeamTransactions(brokerId, {
      dateFrom,
      dateTo,
      limit: 10000
    });

    const activityByStage: Record<string, number> = {};
    transactions.forEach((t) => {
      activityByStage[t.pipelineStage] = (activityByStage[t.pipelineStage] || 0) + 1;
    });

    return {
      activityByStage,
      totalActivity: transactions.length,
      dateRange: { from: dateFrom.toISOString(), to: dateTo.toISOString() }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapAgentRowToAgent(row: any): BrokerAgent {
    return {
      id: row.id,
      brokerId: row.broker_id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      licenseNumber: row.license_number,
      status: row.status,
      role: row.role,
      joinedDate: new Date(row.joined_date),
      commissionSplit: row.commission_split,
      totalDeals: row.total_deals,
      totalVolume: row.total_volume,
      totalCommission: row.total_commission,
      rating: row.rating,
      specialties: row.specialties || [],
      territories: row.territories || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapTransactionRowToBrokerTransaction(row: any, agentName: string, brokerCommission: number, brokerCommissionRate: number): BrokerTransaction {
    return {
      id: row.id,
      agentId: row.agent_id,
      agentName,
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
      brokerCommission,
      brokerCommissionRate,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapCommissionSplitRow(row: any): BrokerCommissionSplit {
    return {
      id: row.id,
      transactionId: row.transaction_id,
      agentId: row.agent_id,
      agentName: row.agent_name,
      brokerId: row.broker_id,
      totalCommission: Number(row.total_commission),
      agentSplit: Number(row.agent_split),
      agentAmount: Number(row.agent_amount),
      brokerSplit: Number(row.broker_split),
      brokerAmount: Number(row.broker_amount),
      status: row.status,
      paymentDate: row.payment_date ? new Date(row.payment_date) : undefined,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapReportRow(row: any): BrokerReport {
    return {
      id: row.id,
      brokerId: row.broker_id,
      reportType: row.report_type,
      title: row.title,
      description: row.description,
      dateFrom: new Date(row.date_from),
      dateTo: new Date(row.date_to),
      data: row.data,
      generatedAt: new Date(row.generated_at),
      generatedBy: row.generated_by
    };
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to agent changes
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribeToAgents(brokerId: string, callback: (payload: any) => void) {
    return supabase
      .channel('broker_agents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broker_agents',
          filter: `broker_id=eq.${brokerId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to commission split changes
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribeToCommissionSplits(brokerId: string, callback: (payload: any) => void) {
    return supabase
      .channel('broker_commission_splits_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broker_commission_splits',
          filter: `broker_id=eq.${brokerId}`
        },
        callback
      )
      .subscribe();
  }
}

export const brokerService = new BrokerService();