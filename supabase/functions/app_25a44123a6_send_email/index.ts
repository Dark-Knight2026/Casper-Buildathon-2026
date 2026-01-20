/**
 * Email Sending Edge Function
 * 
 * Purpose: Sends transactional emails via SMTP
 * Endpoint: POST /functions/v1/app_25a44123a6_send_email
 * 
 * Request Body:
 * {
 *   "to": "recipient@example.com",
 *   "subject": "Email Subject",
 *   "html": "<p>Email content</p>",
 *   "text": "Plain text content" // optional
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "messageId": "..."
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import nodemailer from 'npm:nodemailer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Email request received:`, {
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

    const { to, subject, html, text } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      console.error(`[${requestId}] Missing required fields:`, { to, subject, html: !!html });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${requestId}] Sending email to:`, to);

    // Get SMTP configuration from environment
    const smtpHost = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com';
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
    const smtpSecure = Deno.env.get('SMTP_SECURE') !== 'false'; // Default true
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    const smtpFrom = Deno.env.get('SMTP_FROM') || 'noreply@propertymanagement.com';

    if (!smtpUser || !smtpPassword) {
      console.error(`[${requestId}] Missing SMTP credentials`);
      return new Response(
        JSON.stringify({ error: 'SMTP not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${requestId}] SMTP config:`, {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
    });

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    console.log(`[${requestId}] Transporter created, sending email...`);

    // Send email
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: to,
      subject: subject,
      text: text || undefined,
      html: html,
    });

    console.log(`[${requestId}] Email sent successfully:`, info.messageId);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: info.messageId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Error sending email:`, error);
    return new Response(
      JSON.stringify({
        error: 'Failed to send email',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});