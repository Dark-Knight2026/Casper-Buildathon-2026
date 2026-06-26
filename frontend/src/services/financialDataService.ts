import { supabase } from '@/lib/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import type {
  FinancialMetrics,
  RevenueData,
  ExpenseCategory,
  CashFlowData,
  OccupancyData,
  PropertyPerformance,
  Transaction,
  DateRangeFilter,
  MetricTrend,
} from '@/types/financial';

class FinancialDataService {
  /**
   * Get financial metrics for the dashboard
   */
  async getFinancialMetrics(filters: DateRangeFilter): Promise<FinancialMetrics> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get payments (revenue)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, status')
        .eq('landlord_id', user.id)
        .gte('due_date', filters.startDate.toISOString())
        .lte('due_date', filters.endDate.toISOString());

      // Get expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('landlord_id', user.id)
        .gte('date', filters.startDate.toISOString())
        .lte('date', filters.endDate.toISOString());

      // Get properties and leases for occupancy
      const { data: properties } = await supabase
        .from('properties')
        .select('id, unit_count')
        .eq('landlord_id', user.id);

      const { data: activeLeases } = await supabase
        .from('leases')
        .select('property_id')
        .eq('landlord_id', user.id)
        .eq('status', 'active');

      // Calculate metrics
      const totalRevenue = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
      const expectedRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const netIncome = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

      const totalUnits = properties?.reduce((sum, p) => sum + (p.unit_count || 1), 0) || 0;
      const occupiedUnits = activeLeases?.length || 0;
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
      const vacancyRate = 100 - occupancyRate;

      const collectionRate = expectedRevenue > 0 ? (totalRevenue / expectedRevenue) * 100 : 0;
      const averageRent = occupiedUnits > 0 ? totalRevenue / occupiedUnits : 0;
      const monthlyRecurringRevenue = averageRent * occupiedUnits;

      const outstandingBalance = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;
      const overdueAmount = payments?.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0) || 0;

      // Calculate growth (compare to previous period)
      const previousPeriod = {
        startDate: subMonths(filters.startDate, 1),
        endDate: subMonths(filters.endDate, 1),
      };
      const { data: previousPayments } = await supabase
        .from('payments')
        .select('amount, status')
        .eq('landlord_id', user.id)
        .gte('due_date', previousPeriod.startDate.toISOString())
        .lte('due_date', previousPeriod.endDate.toISOString());

      const previousRevenue = previousPayments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
      const netOperatingIncome = totalRevenue - totalExpenses;

      return {
        totalRevenue,
        totalExpenses,
        netIncome,
        profitMargin,
        occupancyRate,
        vacancyRate,
        collectionRate,
        averageRent,
        monthlyRecurringRevenue,
        outstandingBalance,
        overdueAmount,
        revenueGrowth,
        expenseRatio,
        netOperatingIncome,
      };
    } catch (error) {
      console.error('Error getting financial metrics:', error);
      throw error;
    }
  }

  /**
   * Get revenue trend data
   */
  async getRevenueTrend(filters: DateRangeFilter): Promise<RevenueData[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const months: RevenueData[] = [];
      let currentDate = startOfMonth(filters.startDate);
      const endDate = endOfMonth(filters.endDate);

      while (currentDate <= endDate) {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);

        const { data: payments } = await supabase
          .from('payments')
          .select('amount, status')
          .eq('landlord_id', user.id)
          .gte('due_date', monthStart.toISOString())
          .lte('due_date', monthEnd.toISOString());

        const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const collectedRevenue = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
        const expectedRevenue = totalRevenue;
        const pendingRevenue = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;

        months.push({
          month: format(currentDate, 'MMM yyyy'),
          date: currentDate,
          totalRevenue,
          collectedRevenue,
          expectedRevenue,
          pendingRevenue,
        });

        currentDate = subMonths(currentDate, -1);
      }

      return months;
    } catch (error) {
      console.error('Error getting revenue trend:', error);
      throw error;
    }
  }

  /**
   * Get expense breakdown by category
   */
  async getExpenseBreakdown(filters: DateRangeFilter): Promise<ExpenseCategory[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: expenses } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('landlord_id', user.id)
        .gte('date', filters.startDate.toISOString())
        .lte('date', filters.endDate.toISOString());

      if (!expenses || expenses.length === 0) {
        return [];
      }

      // Group by category
      const categoryMap = new Map<string, number>();
      expenses.forEach(expense => {
        const current = categoryMap.get(expense.category) || 0;
        categoryMap.set(expense.category, current + expense.amount);
      });

      const totalExpenses = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0);

      // Color palette for categories
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#6b7280'];

      return Array.from(categoryMap.entries()).map(([category, amount], index) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        color: colors[index % colors.length],
      }));
    } catch (error) {
      console.error('Error getting expense breakdown:', error);
      throw error;
    }
  }

  /**
   * Get cash flow data
   */
  async getCashFlowData(filters: DateRangeFilter): Promise<CashFlowData[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const months: CashFlowData[] = [];
      let currentDate = startOfMonth(filters.startDate);
      const endDate = endOfMonth(filters.endDate);

      while (currentDate <= endDate) {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);

        const { data: payments } = await supabase
          .from('payments')
          .select('amount, status')
          .eq('landlord_id', user.id)
          .eq('status', 'paid')
          .gte('due_date', monthStart.toISOString())
          .lte('due_date', monthEnd.toISOString());

        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('landlord_id', user.id)
          .gte('date', monthStart.toISOString())
          .lte('date', monthEnd.toISOString());

        const income = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const expensesAmount = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
        const netCashFlow = income - expensesAmount;

        months.push({
          month: format(currentDate, 'MMM yyyy'),
          date: currentDate,
          income,
          expenses: expensesAmount,
          netCashFlow,
        });

        currentDate = subMonths(currentDate, -1);
      }

      return months;
    } catch (error) {
      console.error('Error getting cash flow data:', error);
      throw error;
    }
  }

  /**
   * Get occupancy trend data
   */
  async getOccupancyTrend(filters: DateRangeFilter): Promise<OccupancyData[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: properties } = await supabase
        .from('properties')
        .select('id, unit_count')
        .eq('landlord_id', user.id);

      const totalUnits = properties?.reduce((sum, p) => sum + (p.unit_count || 1), 0) || 0;

      const months: OccupancyData[] = [];
      let currentDate = startOfMonth(filters.startDate);
      const endDate = endOfMonth(filters.endDate);

      while (currentDate <= endDate) {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);

        const { data: activeLeases } = await supabase
          .from('leases')
          .select('id')
          .eq('landlord_id', user.id)
          .lte('start_date', monthEnd.toISOString())
          .gte('end_date', monthStart.toISOString());

        const occupiedUnits = activeLeases?.length || 0;
        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

        months.push({
          month: format(currentDate, 'MMM yyyy'),
          date: currentDate,
          occupancyRate,
          occupiedUnits,
          totalUnits,
        });

        currentDate = subMonths(currentDate, -1);
      }

      return months;
    } catch (error) {
      console.error('Error getting occupancy trend:', error);
      throw error;
    }
  }

  /**
   * Get property performance data
   */
  async getPropertyPerformance(filters: DateRangeFilter): Promise<PropertyPerformance[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: properties } = await supabase
        .from('properties')
        .select('id, address, unit_count')
        .eq('landlord_id', user.id);

      if (!properties) return [];

      const performance: PropertyPerformance[] = [];

      for (const property of properties) {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, status')
          .eq('property_id', property.id)
          .eq('status', 'paid')
          .gte('due_date', filters.startDate.toISOString())
          .lte('due_date', filters.endDate.toISOString());

        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('property_id', property.id)
          .gte('date', filters.startDate.toISOString())
          .lte('date', filters.endDate.toISOString());

        const { data: activeLeases } = await supabase
          .from('leases')
          .select('id')
          .eq('property_id', property.id)
          .eq('status', 'active');

        const revenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const expensesAmount = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
        const netIncome = revenue - expensesAmount;
        const unitCount = property.unit_count || 1;
        const occupiedUnits = activeLeases?.length || 0;
        const occupancyRate = (occupiedUnits / unitCount) * 100;
        const averageRent = occupiedUnits > 0 ? revenue / occupiedUnits : 0;

        performance.push({
          propertyId: property.id,
          propertyName: property.address,
          propertyAddress: property.address,
          revenue,
          expenses: expensesAmount,
          netIncome,
          occupancyRate,
          unitCount,
          averageRent,
        });
      }

      return performance.sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      console.error('Error getting property performance:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: payments } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          due_date,
          status,
          description,
          property:properties(address)
        `)
        .eq('landlord_id', user.id)
        .order('due_date', { ascending: false })
        .limit(limit);

      const transactions: Transaction[] = (payments || []).map(payment => ({
        id: payment.id,
        date: new Date(payment.due_date),
        type: 'income' as const,
        category: 'Rent Payment',
        amount: payment.amount,
        description: payment.description || 'Rent payment',
        propertyName: payment.property?.address || 'Unknown',
        propertyId: payment.property?.id || '',
        status: payment.status as 'completed' | 'pending' | 'failed',
      }));

      return transactions;
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      throw error;
    }
  }

  /**
   * Calculate metric trend
   */
  calculateTrend(current: number, previous: number): MetricTrend {
    const change = current - previous;
    const changePercentage = previous !== 0 ? (change / previous) * 100 : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercentage) > 1) {
      trend = changePercentage > 0 ? 'up' : 'down';
    }

    return {
      current,
      previous,
      change,
      changePercentage,
      trend,
    };
  }
}

export const financialDataService = new FinancialDataService();
