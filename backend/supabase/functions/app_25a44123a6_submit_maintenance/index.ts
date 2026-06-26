/**
 * Maintenance Request Submission Edge Function
 * 
 * Purpose: Validates and processes maintenance request submissions with tier-based limits
 * Endpoint: POST /functions/v1/app_25a44123a6_submit_maintenance
 * 
 * Request Body:
 * {
 *   "property_id": "uuid",
 *   "title": "string",
 *   "description": "string",
 *   "priority": "low" | "medium" | "high" | "urgent",
 *   "category": "string"
 * }
 * 
 * Tier Limits:
 * - Free: 5 requests/month
 * - Pro: 50 requests/month
 * - Enterprise: Unlimited
 * 
 * Response:
 * {
 *   "success": true,
 *   "request_id": "uuid"
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Tier limits for maintenance requests per month
const TIER_LIMITS = {
  free: 5,
  pro: 50,
  enterprise: Infinity,
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Maintenance request received:`, {
    method: req.method,
    url: req.url,
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] CORS preflight request`);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[${requestId}] Supabase client initialized`);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] Missing Authorization header`);
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error(`[${requestId}] Authentication failed:`, userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${requestId}] User authenticated:`, user.id);

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error(`[${requestId}] Failed to parse request body:`, e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { property_id, title, description, priority, category } = body;

    // Validate required fields
    if (!property_id || !title || !description || !priority) {
      console.error(`[${requestId}] Missing required fields`);
      return new Response(
        JSON.stringify({ error: 'Missing required fields: property_id, title, description, priority' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      console.error(`[${requestId}] Invalid priority:`, priority);
      return new Response(
        JSON.stringify({ error: 'Invalid priority. Must be: low, medium, high, or urgent' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${requestId}] Validating tier limits...`);

    // Get user's subscription tier
    let { data: subscription, error: subError } = await supabase
      .from('app_25a44123a6_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    // If no subscription exists, create one with free tier
    if (subError || !subscription) {
      console.log(`[${requestId}] No subscription found, creating free tier subscription`);
      
      const { data: newSub, error: insertError } = await supabase
        .from('app_25a44123a6_subscriptions')
        .insert({
          user_id: user.id,
          tier: 'free',
          status: 'active',
        })
        .select()
        .single();

      if (insertError) {
        console.error(`[${requestId}] Failed to create subscription:`, insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify subscription' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      subscription = newSub;
    }

    const tier = subscription.tier as keyof typeof TIER_LIMITS;
    const limit = TIER_LIMITS[tier];

    console.log(`[${requestId}] User tier:`, tier, 'Limit:', limit);

    // Check usage for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from('app_25a44123a6_maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    if (countError) {
      console.error(`[${requestId}] Failed to count requests:`, countError);
      return new Response(
        JSON.stringify({ error: 'Failed to check usage limits' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const currentUsage = count || 0;
    console.log(`[${requestId}] Current usage:`, currentUsage, '/', limit);

    // Enforce limit
    if (currentUsage >= limit) {
      console.warn(`[${requestId}] Limit exceeded for tier:`, tier);
      return new Response(
        JSON.stringify({
          error: 'Monthly maintenance request limit exceeded',
          current: currentUsage,
          limit: limit,
          tier: tier,
          message: `You have reached your ${tier} tier limit of ${limit} requests per month. Please upgrade to submit more requests.`,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create maintenance request
    console.log(`[${requestId}] Creating maintenance request...`);

    const { data: maintenanceRequest, error: insertError } = await supabase
      .from('app_25a44123a6_maintenance_requests')
      .insert({
        property_id: property_id,
        tenant_id: user.id,
        title: title,
        description: description,
        priority: priority,
        category: category || 'general',
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[${requestId}] Failed to create maintenance request:`, insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create maintenance request', details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${requestId}] Maintenance request created:`, maintenanceRequest.id);

    return new Response(
      JSON.stringify({
        success: true,
        request_id: maintenanceRequest.id,
        usage: {
          current: currentUsage + 1,
          limit: limit,
          tier: tier,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Error processing maintenance request:`, error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process maintenance request',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});