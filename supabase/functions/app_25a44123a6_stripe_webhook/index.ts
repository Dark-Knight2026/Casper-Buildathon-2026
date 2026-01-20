/**
 * Stripe Webhook Handler Edge Function
 * 
 * Purpose: Processes Stripe webhook events for subscription management
 * Endpoint: POST /functions/v1/app_25a44123a6_stripe_webhook
 * 
 * Handled Events:
 * - checkout.session.completed: Create subscription record
 * - customer.subscription.updated: Update subscription status
 * - customer.subscription.deleted: Cancel subscription
 * - invoice.payment_succeeded: Confirm payment
 * - invoice.payment_failed: Handle failed payment
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
  console.log(`[${requestId}] Webhook received:`, {
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
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error(`[${requestId}] Missing Stripe secret key`);
      return new Response('Stripe not configured', { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get webhook secret
    const appId = '25a44123a6';
    const webhookSecretKey = `APP_${appId}_STRIPE_WEBHOOK_SECRET`;
    const webhookSecret = Deno.env.get(webhookSecretKey);

    if (!webhookSecret) {
      console.error(`[${requestId}] Missing webhook secret`);
      return new Response('Webhook secret not configured', { status: 500 });
    }

    // Verify webhook signature
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error(`[${requestId}] Missing stripe-signature header`);
      return new Response('Missing signature', { status: 400 });
    }

    const body = await req.text();
    console.log(`[${requestId}] Request body size:`, body.length);

    let event: Stripe.Event;
    try {
      const cryptoProvider = Stripe.createSubtleCryptoProvider();
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
        undefined,
        cryptoProvider
      );
      console.log(`[${requestId}] Webhook signature verified, event type:`, event.type);
    } catch (err) {
      console.error(`[${requestId}] Webhook signature verification failed:`, err);
      return new Response(`Webhook signature verification failed: ${err.message}`, {
        status: 400,
      });
    }

    // Validate app_id from metadata
    const metadata = (event.data.object as any).metadata;
    if (metadata?.app_id && metadata.app_id !== appId) {
      console.log(`[${requestId}] Event for different app_id:`, metadata.app_id);
      return new Response('received', { status: 200 });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[${requestId}] Processing event:`, event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[${requestId}] Checkout completed:`, session.id);

        const userId = session.metadata?.user_id;
        const tier = session.metadata?.tier;

        if (!userId || !tier) {
          console.error(`[${requestId}] Missing metadata:`, { userId, tier });
          break;
        }

        // Get or create subscription record
        const { data: existingSub } = await supabase
          .from('app_25a44123a6_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (existingSub) {
          // Update existing subscription
          const { error: updateError } = await supabase
            .from('app_25a44123a6_subscriptions')
            .update({
              tier: tier,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error(`[${requestId}] Failed to update subscription:`, updateError);
          } else {
            console.log(`[${requestId}] Subscription updated for user:`, userId);
          }
        } else {
          // Create new subscription
          const { error: insertError } = await supabase
            .from('app_25a44123a6_subscriptions')
            .insert({
              user_id: userId,
              tier: tier,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              status: 'active',
            });

          if (insertError) {
            console.error(`[${requestId}] Failed to create subscription:`, insertError);
          } else {
            console.log(`[${requestId}] Subscription created for user:`, userId);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[${requestId}] Subscription updated:`, subscription.id);

        const { error } = await supabase
          .from('app_25a44123a6_subscriptions')
          .update({
            status: subscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error(`[${requestId}] Failed to update subscription status:`, error);
        } else {
          console.log(`[${requestId}] Subscription status updated:`, subscription.status);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[${requestId}] Subscription deleted:`, subscription.id);

        const { error } = await supabase
          .from('app_25a44123a6_subscriptions')
          .update({
            status: 'canceled',
            tier: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error(`[${requestId}] Failed to cancel subscription:`, error);
        } else {
          console.log(`[${requestId}] Subscription canceled`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[${requestId}] Payment succeeded:`, invoice.id);

        if (invoice.subscription) {
          const { error } = await supabase
            .from('app_25a44123a6_subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string);

          if (error) {
            console.error(`[${requestId}] Failed to update payment status:`, error);
          } else {
            console.log(`[${requestId}] Payment status updated`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[${requestId}] Payment failed:`, invoice.id);

        if (invoice.subscription) {
          const { error } = await supabase
            .from('app_25a44123a6_subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string);

          if (error) {
            console.error(`[${requestId}] Failed to update payment failure:`, error);
          } else {
            console.log(`[${requestId}] Payment failure recorded`);
          }
        }
        break;
      }

      default:
        console.log(`[${requestId}] Unhandled event type:`, event.type);
    }

    return new Response('received', { status: 200 });
  } catch (error) {
    console.error(`[${requestId}] Webhook processing error:`, error);
    return new Response(`Webhook error: ${error.message}`, { status: 500 });
  }
});