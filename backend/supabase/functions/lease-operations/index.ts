import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, payload } = await req.json();
    const appId = '1fa2dc8566'; // App ID from instructions
    const tableName = `app_${appId}_leases`;

    console.log(`Processing action: ${action}`, payload);

    let result;

    switch (action) {
      case 'create_lease': {
        const { leaseData, userId } = payload;
        const { data, error } = await supabaseClient
          .from(tableName)
          .insert({
            ...leaseData,
            created_at: new Date(),
            updated_at: new Date(),
            status: 'draft', // Default status
            approval_status: 'not_required', // Default
            current_version: 1,
            version_history: []
          })
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        break;
      }

      case 'update_lease': {
        const { leaseId, updates, userId } = payload;
        const { data, error } = await supabaseClient
          .from(tableName)
          .update({
            ...updates,
            updated_at: new Date()
          })
          .eq('id', leaseId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        break;
      }

      case 'get_lease': {
        const { leaseId } = payload;
        const { data, error } = await supabaseClient
          .from(tableName)
          .select('*')
          .eq('id', leaseId)
          .single();
        
        if (error) throw error;
        result = data;
        break;
      }

      case 'list_leases': {
        const { filters } = payload || {};
        let query = supabaseClient.from(tableName).select('*');
        
        if (filters) {
          if (filters.status) query = query.eq('status', filters.status);
          if (filters.propertyId) query = query.eq('property_id', filters.propertyId);
          if (filters.landlordId) query = query.eq('landlord_id', filters.landlordId);
          if (filters.agentId) query = query.eq('agent_id', filters.agentId);
        }
        
        // Order by updated_at desc
        query = query.order('updated_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        result = data;
        break;
      }

      case 'submit_for_approval': {
        const { leaseId, userId, comments } = payload;
        
        // Get current lease
        const { data: currentLease, error: fetchError } = await supabaseClient
          .from(tableName)
          .select('approval_history')
          .eq('id', leaseId)
          .single();
          
        if (fetchError) throw fetchError;
        
        const history = currentLease.approval_history || [];
        history.push({
          action: 'submit',
          userId,
          timestamp: new Date(),
          comments
        });

        const { data, error } = await supabaseClient
          .from(tableName)
          .update({
            status: 'pending_approval',
            approval_status: 'pending',
            approval_history: history,
            updated_at: new Date()
          })
          .eq('id', leaseId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        break;
      }

      case 'approve_lease': {
        const { leaseId, userId, comments } = payload;
        
        const { data: currentLease, error: fetchError } = await supabaseClient
          .from(tableName)
          .select('approval_history')
          .eq('id', leaseId)
          .single();
          
        if (fetchError) throw fetchError;
        
        const history = currentLease.approval_history || [];
        history.push({
          action: 'approve',
          userId,
          timestamp: new Date(),
          comments
        });

        const { data, error } = await supabaseClient
          .from(tableName)
          .update({
            status: 'pending_signature', // Ready for tenant to sign
            approval_status: 'approved',
            approval_history: history,
            updated_at: new Date()
          })
          .eq('id', leaseId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        break;
      }

      case 'reject_lease': {
        const { leaseId, userId, comments } = payload;
        
        const { data: currentLease, error: fetchError } = await supabaseClient
          .from(tableName)
          .select('approval_history')
          .eq('id', leaseId)
          .single();
          
        if (fetchError) throw fetchError;
        
        const history = currentLease.approval_history || [];
        history.push({
          action: 'reject',
          userId,
          timestamp: new Date(),
          comments
        });

        const { data, error } = await supabaseClient
          .from(tableName)
          .update({
            status: 'draft', // Send back to draft
            approval_status: 'rejected',
            approval_history: history,
            updated_at: new Date()
          })
          .eq('id', leaseId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        break;
      }

      case 'request_changes': {
        const { leaseId, userId, feedback } = payload;
        
        const { data: currentLease, error: fetchError } = await supabaseClient
          .from(tableName)
          .select('approval_history')
          .eq('id', leaseId)
          .single();
          
        if (fetchError) throw fetchError;
        
        const history = currentLease.approval_history || [];
        history.push({
          action: 'request_changes',
          userId,
          timestamp: new Date(),
          comments: feedback
        });

        const { data, error } = await supabaseClient
          .from(tableName)
          .update({
            status: 'changes_requested',
            approval_status: 'changes_requested',
            approval_history: history,
            updated_at: new Date()
          })
          .eq('id', leaseId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        break;
      }

      case 'sign_lease': {
        const { leaseId, userId, signatureData } = payload;
        
        // In a real production app, we would upload the signature image to Supabase Storage
        // and save the URL. For this MVP, we'll assume the signature process is valid
        // and just update the status.
        
        const { data, error } = await supabaseClient
          .from(tableName)
          .update({
            status: 'active',
            signature_status: 'signed',
            signature_request_id: `sig_${Date.now()}`, // Mock ID
            updated_at: new Date()
          })
          .eq('id', leaseId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        break;
      }

      case 'delete_lease': {
        const { leaseId } = payload;
        const { error } = await supabaseClient
          .from(tableName)
          .delete()
          .eq('id', leaseId);
        
        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});