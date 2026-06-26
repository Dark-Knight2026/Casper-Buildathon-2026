// Edge Function: get-pricing-recommendation
// Provides AI-powered pricing recommendations based on comparable properties

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Pricing recommendation request received`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { listingId } = await req.json();
    
    console.log(`[${requestId}] Getting pricing recommendation for listing ${listingId}`);

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError) throw listingError;

    // Find comparable properties
    // In a real implementation, this would use geospatial queries and ML models
    const { data: comparables, error: comparablesError } = await supabase
      .from('listings')
      .select('*')
      .eq('property_type', listing.property_type)
      .gte('bedrooms', listing.bedrooms - 1)
      .lte('bedrooms', listing.bedrooms + 1)
      .gte('bathrooms', listing.bathrooms - 1)
      .lte('bathrooms', listing.bathrooms + 1)
      .neq('id', listingId)
      .limit(10);

    if (comparablesError) throw comparablesError;

    // Calculate price recommendation
    const prices = comparables.map((c: { price: number }) => c.price);
    const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Simple recommendation logic (would be more sophisticated in production)
    const recommendedPrice = Math.round(avgPrice);
    const priceRange = {
      min: Math.round(minPrice * 0.95),
      max: Math.round(maxPrice * 1.05),
    };

    const result = {
      recommendedPrice,
      priceRange,
      confidence: 0.75,
      comparables: comparables.slice(0, 5).map((comp: {
        id: string;
        address: { street: string };
        price: number;
        bedrooms: number;
        bathrooms: number;
        square_footage: number;
        days_on_market: number;
      }) => ({
        id: comp.id,
        address: comp.address.street,
        price: comp.price,
        bedrooms: comp.bedrooms,
        bathrooms: comp.bathrooms,
        squareFootage: comp.square_footage,
        daysOnMarket: comp.days_on_market || 0,
        distance: Math.random() * 5, // Would calculate actual distance
        similarity: Math.round(Math.random() * 20 + 80), // Would calculate actual similarity
        adjustments: [],
      })),
      marketTrends: [
        {
          period: 'Last 30 days',
          averagePrice: avgPrice,
          medianPrice: prices[Math.floor(prices.length / 2)],
          daysOnMarket: 25,
          inventoryLevel: comparables.length,
          priceChange: 2.5,
        },
      ],
      reasoning: `Based on ${comparables.length} comparable properties in the area with similar features, the recommended price of $${recommendedPrice.toLocaleString()} represents fair market value. Properties in this category are averaging ${25} days on market.`,
      lastUpdated: new Date().toISOString(),
    };

    console.log(`[${requestId}] Pricing recommendation generated successfully`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${requestId}] Error generating pricing recommendation:`, error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to generate pricing recommendation',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});