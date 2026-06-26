/**
 * Stripe Checkout Session Creation Edge Function
 * 
 * Purpose: Creates a Stripe checkout session for subscription upgrades
 * Endpoint: POST /functions/v1/app_25a44123a6_create_checkout
 * 
 * Request Body:
 * {
 *   "tier": "pro" | "enterprise"  // Subscription tier to upgrade to
 * }
 * 
 * Response:
 * {
 *   "url": "https://checkout.stripe.com/..."  // Redirect URL for checkout
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@12.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received:`, {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
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

    const { tier } = body;

    if (!tier || !['pro', 'enterprise'].includes(tier)) {
      console.error(`[${requestId}] Invalid tier:`, tier);
      return new Response(
        JSON.stringify({ error: 'Invalid tier. Must be "pro" or "enterprise"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${requestId}] Creating checkout session for tier:`, tier);

    // Get Stripe price ID from environment
    const appId = '25a44123a6';
    const priceIdKey = `APP_${appId}_STRIPE_${tier.toUpperCase()}_PRICE_ID`;
    const priceId = Deno.env.get(priceIdKey);

    if (!priceId) {
      console.error(`[${requestId}] Missing price ID for tier:`, tier, priceIdKey);
      return new Response(
        JSON.stringify({ error: `Price ID not configured for tier: ${tier}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${requestId}] Using price ID:`, priceId);

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error(`[${requestId}] Missing Stripe secret key`);
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    console.log(`[${requestId}] Stripe client initialized`);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/settings/subscription?success=true`,
      cancel_url: `${req.headers.get('origin')}/settings/subscription?canceled=true`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        app_id: appId,
        tier: tier,
      },
    });

    console.log(`[${requestId}] Checkout session created:`, session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Error creating checkout session:`, error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create checkout session',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});