// Edge Function: send-sms
// Sends SMS notifications using Twilio
// Environment variables required:
// - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

interface SMSRequest {
  to: string; // Phone number in E.164 format (e.g., +1234567890)
  message: string;
  priority?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] SMS request received`, {
    method: req.method,
    url: req.url,
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: corsHeaders });
  }

  try {
    // Parse request body
    const smsRequest: SMSRequest = await req.json();
    console.log(`[${requestId}] SMS details:`, {
      to: smsRequest.to,
      messageLength: smsRequest.message.length,
      priority: smsRequest.priority,
    });

    // Validate required fields
    if (!smsRequest.to || !smsRequest.message) {
      console.error(`[${requestId}] Missing required fields`);
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to and message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number format (E.164)
    if (!smsRequest.to.match(/^\+[1-9]\d{1,14}$/)) {
      console.error(`[${requestId}] Invalid phone number format`);
      return new Response(
        JSON.stringify({ error: 'Phone number must be in E.164 format (e.g., +1234567890)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    console.log(`[${requestId}] Twilio config:`, {
      accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : 'missing',
      fromNumber,
    });

    // Validate Twilio configuration
    if (!accountSid || !authToken || !fromNumber) {
      console.error(`[${requestId}] Twilio configuration incomplete`);
      return new Response(
        JSON.stringify({ error: 'Twilio configuration incomplete' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send SMS via Twilio API
    console.log(`[${requestId}] Sending SMS...`);
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', smsRequest.to);
    formData.append('From', fromNumber);
    formData.append('Body', smsRequest.message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();
      console.error(`[${requestId}] Twilio API error:`, errorData);
      throw new Error(`Twilio API error: ${errorData.message || twilioResponse.statusText}`);
    }

    const twilioData = await twilioResponse.json();
    console.log(`[${requestId}] SMS sent successfully:`, {
      sid: twilioData.sid,
      status: twilioData.status,
    });

    // Log to Supabase for tracking
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('notification_delivery_log').insert({
      channel: 'sms',
      recipient: smsRequest.to,
      message: smsRequest.message,
      priority: smsRequest.priority || 'medium',
      status: 'sent',
      message_id: twilioData.sid,
      metadata: smsRequest.metadata,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: twilioData.sid,
        status: twilioData.status,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${requestId}] Error sending SMS:`, error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to send SMS',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});