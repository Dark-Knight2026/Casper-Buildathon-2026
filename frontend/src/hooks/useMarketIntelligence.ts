import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  MarketStatistics,
  ComparableSale,
  PriceTrend,
  NeighborhoodInsight,
  MarketAlert,
  PropertyValuation,
  MarketSearchParams
} from '@/types/market';

interface UseMarketIntelligenceReturn {
  marketStats: MarketStatistics | null;
  comparableSales: ComparableSale[];
  priceTrends: PriceTrend[];
  neighborhoodInsights: NeighborhoodInsight[];
  marketAlerts: MarketAlert[];
  loading: boolean;
  error: string | null;
  searchComparables: (params: MarketSearchParams) => Promise<void>;
  getPropertyValuation: (address: string, sqft: number, beds: number, baths: number) => Promise<PropertyValuation | null>;
  refreshData: () => Promise<void>;
}

// Mock data generators
function generateMockMarketStats(): MarketStatistics {
  return {
    area_name: 'Virginia Beach, VA',
    median_price: 425000,
    avg_price: 467500,
    price_per_sqft: 185,
    total_listings: 847,
    active_listings: 312,
    pending_listings: 89,
    sold_listings: 446,
    avg_days_on_market: 28,
    inventory_months: 2.8,
    price_trend_30d: 2.3,
    price_trend_90d: 5.7,
    price_trend_1y: 8.4,
    absorption_rate: 0.89,
    updated_at: new Date().toISOString()
  };
}

function generateMockComparables(): ComparableSale[] {
  const baseDate = new Date();
  return [
    {
      id: '1',
      address: '2847 Ocean View Drive',
      city: 'Virginia Beach',
      state: 'VA',
      zip_code: '23451',
      sale_price: 485000,
      sale_date: new Date(baseDate.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      bedrooms: 4,
      bathrooms: 2.5,
      square_feet: 2400,
      price_per_sqft: 202,
      lot_size: 0.25,
      year_built: 2015,
      property_type: 'Single Family',
      days_on_market: 22,
      distance_miles: 0.8,
      similarity_score: 95
    },
    {
      id: '2',
      address: '1523 Shoreline Avenue',
      city: 'Virginia Beach',
      state: 'VA',
      zip_code: '23451',
      sale_price: 465000,
      sale_date: new Date(baseDate.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      bedrooms: 3,
      bathrooms: 2,
      square_feet: 2200,
      price_per_sqft: 211,
      lot_size: 0.18,
      year_built: 2018,
      property_type: 'Single Family',
      days_on_market: 18,
      distance_miles: 1.2,
      similarity_score: 92
    },
    {
      id: '3',
      address: '4156 Coastal Boulevard',
      city: 'Virginia Beach',
      state: 'VA',
      zip_code: '23452',
      sale_price: 510000,
      sale_date: new Date(baseDate.getTime() - 42 * 24 * 60 * 60 * 1000).toISOString(),
      bedrooms: 4,
      bathrooms: 3,
      square_feet: 2600,
      price_per_sqft: 196,
      lot_size: 0.30,
      year_built: 2016,
      property_type: 'Single Family',
      days_on_market: 31,
      distance_miles: 1.5,
      similarity_score: 89
    },
    {
      id: '4',
      address: '789 Bayfront Terrace',
      city: 'Virginia Beach',
      state: 'VA',
      zip_code: '23451',
      sale_price: 445000,
      sale_date: new Date(baseDate.getTime() - 55 * 24 * 60 * 60 * 1000).toISOString(),
      bedrooms: 3,
      bathrooms: 2.5,
      square_feet: 2300,
      price_per_sqft: 193,
      lot_size: 0.22,
      year_built: 2014,
      property_type: 'Single Family',
      days_on_market: 26,
      distance_miles: 0.9,
      similarity_score: 88
    },
    {
      id: '5',
      address: '3421 Marina View Lane',
      city: 'Virginia Beach',
      state: 'VA',
      zip_code: '23452',
      sale_price: 495000,
      sale_date: new Date(baseDate.getTime() - 68 * 24 * 60 * 60 * 1000).toISOString(),
      bedrooms: 4,
      bathrooms: 2.5,
      square_feet: 2500,
      price_per_sqft: 198,
      lot_size: 0.28,
      year_built: 2017,
      property_type: 'Single Family',
      days_on_market: 24,
      distance_miles: 1.8,
      similarity_score: 86
    }
  ];
}

function generateMockPriceTrends(): PriceTrend[] {
  const trends: PriceTrend[] = [];
  const baseDate = new Date();
  const basePrice = 425000;
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setMonth(date.getMonth() - i);
    
    const variation = Math.sin(i * 0.5) * 15000 + (11 - i) * 2500;
    const medianPrice = Math.round(basePrice + variation);
    const avgPrice = Math.round(medianPrice * 1.1);
    
    trends.push({
      date: date.toISOString().split('T')[0],
      median_price: medianPrice,
      avg_price: avgPrice,
      total_sales: Math.floor(35 + Math.random() * 15)
    });
  }
  
  return trends;
}

function generateMockNeighborhoodInsights(): NeighborhoodInsight[] {
  return [
    {
      id: '1',
      neighborhood: 'Oceanfront',
      city: 'Virginia Beach',
      state: 'VA',
      population: 12500,
      median_household_income: 95000,
      median_age: 38,
      median_home_value: 575000,
      avg_home_value: 625000,
      homeownership_rate: 72,
      rental_rate: 28,
      total_sales_ytd: 145,
      avg_days_on_market: 22,
      price_trend_1y: 9.2,
      inventory_level: 'low',
      school_rating: 8,
      walkability_score: 85,
      transit_score: 72,
      crime_rating: 'low',
      appreciation_rate_5y: 42,
      rental_yield: 4.2,
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      neighborhood: 'Chesapeake Bay',
      city: 'Virginia Beach',
      state: 'VA',
      population: 18200,
      median_household_income: 88000,
      median_age: 42,
      median_home_value: 485000,
      avg_home_value: 520000,
      homeownership_rate: 78,
      rental_rate: 22,
      total_sales_ytd: 187,
      avg_days_on_market: 26,
      price_trend_1y: 7.8,
      inventory_level: 'balanced',
      school_rating: 9,
      walkability_score: 68,
      transit_score: 55,
      crime_rating: 'low',
      appreciation_rate_5y: 38,
      rental_yield: 3.8,
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      neighborhood: 'Town Center',
      city: 'Virginia Beach',
      state: 'VA',
      population: 15800,
      median_household_income: 82000,
      median_age: 35,
      median_home_value: 395000,
      avg_home_value: 425000,
      homeownership_rate: 65,
      rental_rate: 35,
      total_sales_ytd: 223,
      avg_days_on_market: 31,
      price_trend_1y: 6.5,
      inventory_level: 'balanced',
      school_rating: 7,
      walkability_score: 92,
      transit_score: 88,
      crime_rating: 'low',
      appreciation_rate_5y: 32,
      rental_yield: 4.5,
      updated_at: new Date().toISOString()
    },
    {
      id: '4',
      neighborhood: 'Great Neck',
      city: 'Virginia Beach',
      state: 'VA',
      population: 9500,
      median_household_income: 105000,
      median_age: 45,
      median_home_value: 625000,
      avg_home_value: 685000,
      homeownership_rate: 85,
      rental_rate: 15,
      total_sales_ytd: 98,
      avg_days_on_market: 19,
      price_trend_1y: 10.1,
      inventory_level: 'low',
      school_rating: 9,
      walkability_score: 62,
      transit_score: 48,
      crime_rating: 'low',
      appreciation_rate_5y: 48,
      rental_yield: 3.2,
      updated_at: new Date().toISOString()
    }
  ];
}

function generateMockMarketAlerts(): MarketAlert[] {
  const baseDate = new Date();
  return [
    {
      id: '1',
      alert_type: 'hot_market',
      title: 'Oceanfront Area Heating Up',
      description: 'Properties in Oceanfront neighborhood are selling 35% faster than market average. Median price up 9.2% YoY.',
      area: 'Oceanfront, Virginia Beach',
      severity: 'critical',
      data: { price_increase: 9.2, days_on_market_reduction: 35 },
      created_at: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      alert_type: 'price_drop',
      title: 'Price Reduction Opportunity',
      description: '3 properties in your target area reduced prices by 5-8% in the last week. Great opportunity for buyers.',
      area: 'Chesapeake Bay, Virginia Beach',
      severity: 'warning',
      data: { property_count: 3, avg_reduction: 6.5 },
      created_at: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      alert_type: 'new_listing',
      title: 'New Listings Match Client Criteria',
      description: '12 new properties listed this week matching your active client preferences. Average price: $465K.',
      area: 'Town Center, Virginia Beach',
      severity: 'info',
      data: { new_listings: 12, avg_price: 465000 },
      created_at: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      alert_type: 'market_shift',
      title: 'Inventory Levels Declining',
      description: 'Active inventory down 18% from last month. Expect increased competition and faster sales.',
      area: 'Great Neck, Virginia Beach',
      severity: 'warning',
      data: { inventory_change: -18, expected_impact: 'faster_sales' },
      created_at: new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

export function useMarketIntelligence(): UseMarketIntelligenceReturn {
  const { user } = useAuth();
  const [marketStats, setMarketStats] = useState<MarketStatistics | null>(null);
  const [comparableSales, setComparableSales] = useState<ComparableSale[]>([]);
  const [priceTrends, setPriceTrends] = useState<PriceTrend[]>([]);
  const [neighborhoodInsights, setNeighborhoodInsights] = useState<NeighborhoodInsight[]>([]);
  const [marketAlerts, setMarketAlerts] = useState<MarketAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDataFromSupabase = useCallback(async (userId: string) => {
    // In a real implementation, these would be actual Supabase queries
    const [statsData, comparablesData, trendsData, insightsData, alertsData] = await Promise.all([
      supabase.from('app_a12f5_market_statistics').select('*').single(),
      supabase.from('app_a12f5_comparable_sales').select('*').order('sale_date', { ascending: false }).limit(10),
      supabase.from('app_a12f5_price_trends').select('*').order('date', { ascending: true }).limit(12),
      supabase.from('app_a12f5_neighborhood_insights').select('*').limit(10),
      supabase.from('app_a12f5_market_alerts').select('*').order('created_at', { ascending: false }).limit(10)
    ]);

    return {
      marketStats: statsData.data,
      comparableSales: comparablesData.data || [],
      priceTrends: trendsData.data || [],
      neighborhoodInsights: insightsData.data || [],
      marketAlerts: alertsData.data || []
    };
  }, []);

  const fetchDataWithMock = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      marketStats: generateMockMarketStats(),
      comparableSales: generateMockComparables(),
      priceTrends: generateMockPriceTrends(),
      neighborhoodInsights: generateMockNeighborhoodInsights(),
      marketAlerts: generateMockMarketAlerts()
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      let data;
      
      if (isSupabaseConfigured()) {
        try {
          data = await fetchDataFromSupabase(user.id);
        } catch (err) {
          console.warn('Supabase fetch failed, using mock data:', err);
          data = await fetchDataWithMock();
        }
      } else {
        data = await fetchDataWithMock();
      }

      setMarketStats(data.marketStats);
      setComparableSales(data.comparableSales);
      setPriceTrends(data.priceTrends);
      setNeighborhoodInsights(data.neighborhoodInsights);
      setMarketAlerts(data.marketAlerts);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market data';
      console.error('Market data fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchDataFromSupabase, fetchDataWithMock]);

  const searchComparables = useCallback(async (params: MarketSearchParams) => {
    try {
      setLoading(true);
      
      if (isSupabaseConfigured()) {
        // Real Supabase query with filters
        const query = supabase.from('app_a12f5_comparable_sales').select('*');
        
        if (params.city) query.eq('city', params.city);
        if (params.min_price) query.gte('sale_price', params.min_price);
        if (params.max_price) query.lte('sale_price', params.max_price);
        if (params.min_beds) query.gte('bedrooms', params.min_beds);
        
        const { data, error: queryError } = await query.order('sale_date', { ascending: false }).limit(20);
        
        if (queryError) throw queryError;
        setComparableSales(data || []);
      } else {
        // Mock filtered data
        await new Promise(resolve => setTimeout(resolve, 500));
        let filtered = generateMockComparables();
        
        if (params.min_price) {
          filtered = filtered.filter(c => c.sale_price >= params.min_price!);
        }
        if (params.max_price) {
          filtered = filtered.filter(c => c.sale_price <= params.max_price!);
        }
        if (params.min_beds) {
          filtered = filtered.filter(c => c.bedrooms >= params.min_beds!);
        }
        
        setComparableSales(filtered);
      }
    } catch (err) {
      console.error('Search comparables error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPropertyValuation = useCallback(async (
    address: string,
    sqft: number,
    beds: number,
    baths: number
  ): Promise<PropertyValuation | null> => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error: rpcError } = await supabase.rpc('calculate_property_valuation', {
          p_address: address,
          p_square_feet: sqft,
          p_bedrooms: beds,
          p_bathrooms: baths
        });
        
        if (rpcError) throw rpcError;
        return data;
      } else {
        // Mock valuation calculation
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const avgPricePerSqft = 195;
        const estimatedValue = Math.round(sqft * avgPricePerSqft);
        const variance = estimatedValue * 0.08;
        
        return {
          address,
          estimated_value: estimatedValue,
          value_range_low: Math.round(estimatedValue - variance),
          value_range_high: Math.round(estimatedValue + variance),
          confidence_score: 87,
          comparable_count: 5,
          valuation_date: new Date().toISOString(),
          factors: {
            location_score: 92,
            condition_score: 85,
            market_trend_score: 88,
            comparable_score: 90
          }
        };
      }
    } catch (err) {
      console.error('Property valuation error:', err);
      return null;
    }
  }, []);

  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    marketStats,
    comparableSales,
    priceTrends,
    neighborhoodInsights,
    marketAlerts,
    loading,
    error,
    searchComparables,
    getPropertyValuation,
    refreshData
  };
}