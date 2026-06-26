import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Payment reminders job started`);

  try {
    // Get overdue payments
    const today = new Date().toISOString().split('T')[0];
    const { data: overduePayments, error } = await supabase
      .from('payments')
      .select(`
        *,
        leases!inner(
          property_address,
          tenant_ids
        )
      `)
      .eq('payment_status', 'pending')
      .lt('payment_date', today);

    if (error) throw error;

    console.log(`[${requestId}] Found ${overduePayments?.length || 0} overdue payments`);

    // Send reminders for each overdue payment
    for (const payment of overduePayments || []) {
      try {
        // Get tenant details
        const { data: tenant } = await supabase
          .from('users')
          .select('email, phone, full_name')
          .eq('id', payment.tenant_id)
          .single();

        if (!tenant) continue;

        // Send email reminder
        console.log(`[${requestId}] Sending reminder to ${tenant.email}`);
        
        // Call email service edge function
        await supabase.functions.invoke('app_25a44123a6_send_email', {
          body: {
            to: tenant.email,
            subject: `Payment Reminder - $${payment.amount.toFixed(2)} Due`,
            html: `
              <p>Dear ${tenant.full_name || 'Tenant'},</p>
              <p>This is a reminder that your payment of $${payment.amount.toFixed(2)} was due on ${new Date(payment.payment_date).toLocaleDateString()}.</p>
              <p>Property: ${payment.leases.property_address}</p>
              <p>Please submit your payment as soon as possible to avoid late fees.</p>
              <p>Thank you!</p>
            `
          }
        });

      } catch (error) {
        console.error(`[${requestId}] Failed to send reminder:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: overduePayments?.length || 0
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Payment reminders job failed:`, error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Job failed'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});