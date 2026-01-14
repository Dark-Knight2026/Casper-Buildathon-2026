import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Lease renewal workflow started`);

  try {
    // Get leases expiring in 60 days
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const { data: expiringLeases, error } = await supabase
      .from('leases')
      .select(`
        *,
        properties(title, address)
      `)
      .eq('status', 'active')
      .lte('end_date', sixtyDaysFromNow.toISOString().split('T')[0])
      .is('renewal_status', null);

    if (error) throw error;

    console.log(`[${requestId}] Found ${expiringLeases?.length || 0} leases for renewal`);

    // Process each lease
    for (const lease of expiringLeases || []) {
      try {
        // Check if renewal already exists
        const { data: existingRenewal } = await supabase
          .from('lease_renewals')
          .select('id')
          .eq('lease_id', lease.id)
          .single();

        if (existingRenewal) {
          console.log(`[${requestId}] Renewal already exists for lease ${lease.id}`);
          continue;
        }

        // Create renewal record
        const proposedStartDate = new Date(lease.end_date);
        const proposedEndDate = new Date(proposedStartDate);
        proposedEndDate.setFullYear(proposedEndDate.getFullYear() + 1);

        const { data: renewal, error: renewalError } = await supabase
          .from('lease_renewals')
          .insert({
            lease_id: lease.id,
            current_end_date: lease.end_date,
            proposed_start_date: proposedStartDate.toISOString().split('T')[0],
            proposed_end_date: proposedEndDate.toISOString().split('T')[0],
            proposed_rent: lease.monthly_rent * 1.03, // 3% increase
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (renewalError) throw renewalError;

        console.log(`[${requestId}] Created renewal for lease ${lease.id}`);

        // Send renewal notification to tenant
        for (const tenantId of lease.tenant_ids) {
          const { data: tenant } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', tenantId)
            .single();

          if (tenant) {
            await supabase.functions.invoke('app_25a44123a6_send_email', {
              body: {
                to: tenant.email,
                subject: 'Lease Renewal Offer',
                html: `
                  <p>Dear ${tenant.full_name || 'Tenant'},</p>
                  <p>Your lease for ${lease.properties?.address || 'your property'} is expiring on ${new Date(lease.end_date).toLocaleDateString()}.</p>
                  <p>We would like to offer you a lease renewal with the following terms:</p>
                  <ul>
                    <li>Start Date: ${proposedStartDate.toLocaleDateString()}</li>
                    <li>End Date: ${proposedEndDate.toLocaleDateString()}</li>
                    <li>Monthly Rent: $${(lease.monthly_rent * 1.03).toFixed(2)}</li>
                  </ul>
                  <p>Please log in to your tenant portal to review and respond to this offer.</p>
                  <p>Thank you!</p>
                `
              }
            });
          }
        }

      } catch (error) {
        console.error(`[${requestId}] Failed to process lease ${lease.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: expiringLeases?.length || 0
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Renewal workflow failed:`, error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Workflow failed'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});