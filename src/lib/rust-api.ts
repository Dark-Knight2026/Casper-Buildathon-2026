import { supabase } from '@/lib/supabase/client';

const RUST_SERVICE_URL = import.meta.env.VITE_RUST_SERVICE_URL || 'http://localhost:8080/api/v1';

interface TaxCalculationRequest {
  fiscal_year: number;
  property_ids: string[];
  include_depreciation?: boolean;
}

interface TaxReport {
  total_taxable_income: string; // Decimal as string
  total_deductions: string;
  estimated_tax: string;
  breakdown: {
    category: string;
    amount: string;
  }[];
}

interface PropertyPerformanceRequest {
  start_date: string;
  end_date: string;
  property_ids: string[];
}

interface PropertyPerformanceReport {
  total_revenue: string;
  total_expenses: string;
  net_operating_income: string;
  roi_percentage: string;
  occupancy_rate: string;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  if (!token) {
    throw new Error('No active session');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export const rustApi = {
  tax: {
    calculateLiability: async (data: TaxCalculationRequest): Promise<TaxReport> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${RUST_SERVICE_URL}/tax/calculate-liability`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Tax calculation failed: ${response.statusText}`);
      }

      return response.json();
    },
  },
  analytics: {
    getPropertyPerformance: async (data: PropertyPerformanceRequest): Promise<PropertyPerformanceReport> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${RUST_SERVICE_URL}/analytics/property-performance`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Analytics fetch failed: ${response.statusText}`);
      }

      return response.json();
    },
  },
};