import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@12.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Process payment request received`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error(`[${requestId}] Invalid JSON body:`, error);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { amount, currency = 'usd', paymentMethodId, leaseId, tenantId } = body;

    if (!amount || !paymentMethodId || !leaseId || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${requestId}] Creating payment intent:`, {
      amount,
      currency,
      leaseId,
      tenantId
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      payment_method: paymentMethodId,
      confirm: true,
      metadata: {
        app_id: '25a44123a6',
        lease_id: leaseId,
        tenant_id: tenantId
      },
      return_url: `${req.headers.get('origin')}/tenant/payments`
    });

    console.log(`[${requestId}] Payment intent created:`, paymentIntent.id);

    // Create payment record in database
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        lease_id: leaseId,
        tenant_id: tenantId,
        amount,
        payment_method: 'credit_card',
        payment_status: 'processing',
        transaction_id: paymentIntent.id,
        payment_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error(`[${requestId}] Database insert failed:`, error);
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Payment processing error:`, error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Payment processing failed'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});