/**
 * Maintenance Cost Tracking Service
 * Handles cost tracking for maintenance requests
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';

export interface MaintenanceCost {
  id: string;
  requestId: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costType: 'labor' | 'materials' | 'equipment' | 'other';
  createdAt: Date;
  createdBy: string;
}

export interface CostSummary {
  totalCost: number;
  laborCost: number;
  materialsCost: number;
  equipmentCost: number;
  otherCost: number;
  itemCount: number;
}

interface MaintenanceCostUpdateData {
  item_description?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  cost_type?: 'labor' | 'materials' | 'equipment' | 'other';
}

interface MaintenanceCostRow {
  id: string;
  request_id: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_type: 'labor' | 'materials' | 'equipment' | 'other';
  created_at: string;
  created_by: string;
}

class MaintenanceCostService {
  /**
   * Add cost item to maintenance request
   */
  async addCostItem(
    requestId: string,
    item: Omit<MaintenanceCost, 'id' | 'createdAt' | 'requestId'>
  ): Promise<MaintenanceCost> {
    try {
      const { data, error } = await supabase
        .from('maintenance_costs')
        .insert({
          request_id: requestId,
          item_description: item.itemDescription,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          cost_type: item.costType,
          created_by: item.createdBy
        })
        .select()
        .single();

      if (error) throw error;

      // Update total cost on maintenance request
      await this.updateRequestTotalCost(requestId);

      return this.mapCostItem(data);
    } catch (error) {
      logger.error('Error adding cost item:', error);
      throw error instanceof Error ? error : new Error('Failed to add cost item');
    }
  }

  /**
   * Get all costs for a maintenance request
   */
  async getCostsByRequestId(requestId: string): Promise<MaintenanceCost[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_costs')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapCostItem);
    } catch (error) {
      logger.error('Error fetching costs:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch costs');
    }
  }

  /**
   * Get cost summary for a maintenance request
   */
  async getCostSummary(requestId: string): Promise<CostSummary> {
    try {
      const costs = await this.getCostsByRequestId(requestId);

      const summary: CostSummary = {
        totalCost: 0,
        laborCost: 0,
        materialsCost: 0,
        equipmentCost: 0,
        otherCost: 0,
        itemCount: costs.length
      };

      for (const cost of costs) {
        summary.totalCost += cost.totalPrice;

        switch (cost.costType) {
          case 'labor':
            summary.laborCost += cost.totalPrice;
            break;
          case 'materials':
            summary.materialsCost += cost.totalPrice;
            break;
          case 'equipment':
            summary.equipmentCost += cost.totalPrice;
            break;
          case 'other':
            summary.otherCost += cost.totalPrice;
            break;
        }
      }

      return summary;
    } catch (error) {
      logger.error('Error calculating cost summary:', error);
      throw error instanceof Error ? error : new Error('Failed to calculate cost summary');
    }
  }

  /**
   * Update cost item
   */
  async updateCostItem(
    costId: string,
    updates: Partial<Omit<MaintenanceCost, 'id' | 'requestId' | 'createdAt' | 'createdBy'>>
  ): Promise<MaintenanceCost> {
    try {
      const updateData: MaintenanceCostUpdateData = {};

      if (updates.itemDescription !== undefined) {
        updateData.item_description = updates.itemDescription;
      }
      if (updates.quantity !== undefined) {
        updateData.quantity = updates.quantity;
      }
      if (updates.unitPrice !== undefined) {
        updateData.unit_price = updates.unitPrice;
      }
      if (updates.totalPrice !== undefined) {
        updateData.total_price = updates.totalPrice;
      }
      if (updates.costType !== undefined) {
        updateData.cost_type = updates.costType;
      }

      const { data, error } = await supabase
        .from('maintenance_costs')
        .update(updateData)
        .eq('id', costId)
        .select()
        .single();

      if (error) throw error;

      // Update total cost on maintenance request
      await this.updateRequestTotalCost(data.request_id);

      return this.mapCostItem(data);
    } catch (error) {
      logger.error('Error updating cost item:', error);
      throw error instanceof Error ? error : new Error('Failed to update cost item');
    }
  }

  /**
   * Delete cost item
   */
  async deleteCostItem(costId: string): Promise<void> {
    try {
      // Get request ID before deleting
      const { data: cost } = await supabase
        .from('maintenance_costs')
        .select('request_id')
        .eq('id', costId)
        .single();

      const { error } = await supabase
        .from('maintenance_costs')
        .delete()
        .eq('id', costId);

      if (error) throw error;

      // Update total cost on maintenance request
      if (cost) {
        await this.updateRequestTotalCost(cost.request_id);
      }
    } catch (error) {
      logger.error('Error deleting cost item:', error);
      throw error instanceof Error ? error : new Error('Failed to delete cost item');
    }
  }

  /**
   * Update total cost on maintenance request
   */
  private async updateRequestTotalCost(requestId: string): Promise<void> {
    try {
      const { data: costs } = await supabase
        .from('maintenance_costs')
        .select('total_price')
        .eq('request_id', requestId);

      const totalCost = costs?.reduce((sum, cost) => sum + cost.total_price, 0) || 0;

      await supabase
        .from('maintenance_requests')
        .update({ actual_cost: totalCost })
        .eq('id', requestId);
    } catch (error) {
      logger.error('Error updating total cost:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Map database row to MaintenanceCost
   */
  private mapCostItem(data: MaintenanceCostRow): MaintenanceCost {
    return {
      id: data.id,
      requestId: data.request_id,
      itemDescription: data.item_description,
      quantity: data.quantity,
      unitPrice: data.unit_price,
      totalPrice: data.total_price,
      costType: data.cost_type,
      createdAt: new Date(data.created_at),
      createdBy: data.created_by
    };
  }
}

export const maintenanceCostService = new MaintenanceCostService();