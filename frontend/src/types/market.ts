export interface MarketStatistics {
  area_name: string;
  median_price: number;
  avg_price: number;
  price_per_sqft: number;
  total_listings: number;
  active_listings: number;
  pending_listings: number;
  sold_listings: number;
  avg_days_on_market: number;
  inventory_months: number;
  price_trend_30d: number; // percentage change
  price_trend_90d: number;
  price_trend_1y: number;
  absorption_rate: number;
  updated_at: string;
}

export interface ComparableSale {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  sale_price: number;
  sale_date: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  price_per_sqft: number;
  lot_size?: number;
  year_built: number;
  property_type: string;
  days_on_market: number;
  distance_miles?: number;
  similarity_score?: number;
}

export interface PriceTrend {
  date: string;
  median_price: number;
  avg_price: number;
  total_sales: number;
}

export interface NeighborhoodInsight {
  id: string;
  neighborhood: string;
  city: string;
  state: string;
  
  // Demographics
  population?: number;
  median_household_income?: number;
  median_age?: number;
  
  // Housing metrics
  median_home_value: number;
  avg_home_value: number;
  homeownership_rate?: number;
  rental_rate?: number;
  
  // Market activity
  total_sales_ytd: number;
  avg_days_on_market: number;
  price_trend_1y: number;
  inventory_level: 'low' | 'balanced' | 'high';
  
  // Amenities & ratings
  school_rating?: number;
  walkability_score?: number;
  transit_score?: number;
  crime_rating?: 'low' | 'moderate' | 'high';
  
  // Investment metrics
  appreciation_rate_5y?: number;
  rental_yield?: number;
  
  updated_at: string;
}

export interface MarketAlert {
  id: string;
  alert_type: 'price_drop' | 'new_listing' | 'price_increase' | 'market_shift' | 'hot_market';
  title: string;
  description: string;
  area: string;
  severity: 'info' | 'warning' | 'critical';
  data?: Record<string, unknown>;
  created_at: string;
}

export interface PropertyValuation {
  address: string;
  estimated_value: number;
  value_range_low: number;
  value_range_high: number;
  confidence_score: number;
  comparable_count: number;
  valuation_date: string;
  factors: {
    location_score: number;
    condition_score: number;
    market_trend_score: number;
    comparable_score: number;
  };
}

export interface MarketSearchParams {
  city?: string;
  state?: string;
  zip_code?: string;
  property_type?: string;
  min_price?: number;
  max_price?: number;
  min_beds?: number;
  max_beds?: number;
  min_sqft?: number;
  max_sqft?: number;
  radius_miles?: number;
}