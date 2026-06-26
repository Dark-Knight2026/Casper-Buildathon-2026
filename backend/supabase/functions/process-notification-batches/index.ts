// Edge Function: process-notification-batches
// Scheduled function to process and send notification batches
// Should be triggered by a cron job (e.g., every hour)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

interface BatchingPreferences {
  user_id: string;
  enabled: boolean;
  frequency: string;
  batch_time: string;
  batch_day?: number;
  exclude_priorities: string[];
  timezone: string;
}

interface QueuedNotification {
  id: string;
  user_id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Batch processing request received`, {
    method: req.method,
    url: req.url,
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get SMTP configuration
    const smtpConfig = {
      host: Deno.env.get('SMTP_HOST'),
      port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
      secure: Deno.env.get('SMTP_SECURE') === 'true',
      auth: {
        user: Deno.env.get('SMTP_USER'),
        pass: Deno.env.get('SMTP_PASSWORD'),
      },
    };
    const fromEmail = Deno.env.get('SMTP_FROM') || 'noreply@realestate.com';

    // Get all users with batching enabled
    const { data: users, error: usersError } = await supabase
      .from('notification_batching_preferences')
      .select('*')
      .eq('enabled', true);

    if (usersError) throw usersError;

    console.log(`[${requestId}] Found ${users.length} users with batching enabled`);

    let processedCount = 0;
    let sentCount = 0;
    let errorCount = 0;

    for (const userPrefs of users as BatchingPreferences[]) {
      try {
        // Check if it's time to send batch for this user
        const now = new Date();
        const shouldSend = checkIfTimeToSendBatch(userPrefs, now);

        if (!shouldSend) {
          console.log(`[${requestId}] Not time to send batch for user ${userPrefs.user_id}`);
          continue;
        }

        // Get pending notifications for this user
        const { data: notifications, error: notifError } = await supabase
          .from('notification_batch_queue')
          .select('*')
          .eq('user_id', userPrefs.user_id)
          .is('batch_id', null)
          .order('created_at', { ascending: true });

        if (notifError) throw notifError;

        if (!notifications || notifications.length === 0) {
          console.log(`[${requestId}] No pending notifications for user ${userPrefs.user_id}`);
          continue;
        }

        console.log(`[${requestId}] Processing ${notifications.length} notifications for user ${userPrefs.user_id}`);

        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userPrefs.user_id);
        if (userError || !userData.user?.email) {
          console.error(`[${requestId}] Failed to get user email:`, userError);
          errorCount++;
          continue;
        }

        const userEmail = userData.user.email;

        // Create batch record
        const { data: batchData, error: batchError } = await supabase
          .from('notification_batches')
          .insert({
            user_id: userPrefs.user_id,
            frequency: userPrefs.frequency,
            notification_count: notifications.length,
            scheduled_for: now.toISOString(),
            status: 'pending',
          })
          .select()
          .single();

        if (batchError) throw batchError;

        const batchId = batchData.id;

        // Update queue items with batch ID
        const notificationIds = notifications.map((n: QueuedNotification) => n.id);
        await supabase
          .from('notification_batch_queue')
          .update({ batch_id: batchId })
          .in('id', notificationIds);

        // Generate digest email
        const digest = generateDigestEmail(notifications as QueuedNotification[], userPrefs.frequency);

        // Send email
        const transporter = nodemailer.createTransport(smtpConfig);
        const info = await transporter.sendMail({
          from: fromEmail,
          to: userEmail,
          subject: digest.subject,
          text: digest.textContent,
          html: digest.htmlContent,
        });

        // Update batch status
        await supabase
          .from('notification_batches')
          .update({
            status: 'sent',
            sent_at: now.toISOString(),
            email_message_id: info.messageId,
          })
          .eq('id', batchId);

        console.log(`[${requestId}] Batch ${batchId} sent successfully to ${userEmail}`);
        processedCount++;
        sentCount++;
      } catch (error) {
        console.error(`[${requestId}] Error processing batch for user ${userPrefs.user_id}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        sent: sentCount,
        errors: errorCount,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${requestId}] Error processing batches:`, error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to process batches',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function checkIfTimeToSendBatch(prefs: BatchingPreferences, now: Date): boolean {
  const [hours, minutes] = prefs.batch_time.split(':').map(Number);
  const userTime = new Date(now.toLocaleString('en-US', { timeZone: prefs.timezone }));
  
  const currentHour = userTime.getHours();
  const currentMinute = userTime.getMinutes();

  switch (prefs.frequency) {
    case 'hourly': {
      // Send at the top of every hour
      return currentMinute === 0;
    }

    case 'daily': {
      // Send at specified time
      return currentHour === hours && currentMinute === minutes;
    }

    case 'weekly': {
      // Send on specified day at specified time
      const currentDay = userTime.getDay();
      return currentDay === (prefs.batch_day ?? 1) && currentHour === hours && currentMinute === minutes;
    }

    default:
      return false;
  }
}

function generateDigestEmail(notifications: QueuedNotification[], frequency: string): {
  subject: string;
  htmlContent: string;
  textContent: string;
} {
  const count = notifications.length;
  const subject = `Your ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Digest: ${count} Update${count !== 1 ? 's' : ''}`;

  // Group by type
  const grouped: { [key: string]: QueuedNotification[] } = {};
  notifications.forEach(n => {
    if (!grouped[n.type]) grouped[n.type] = [];
    grouped[n.type].push(n);
  });

  const categoryNames: { [key: string]: string } = {
    payment: '💰 Payments',
    maintenance: '🔧 Maintenance',
    document: '📄 Documents',
    lease: '📝 Leases',
    message: '💬 Messages',
    showing: '📅 Appointments',
    success: '✅ Success',
    warning: '⚠️ Warnings',
    info: '📌 Info',
  };

  const categoryColors: { [key: string]: string } = {
    payment: '#10b981',
    maintenance: '#f59e0b',
    document: '#3b82f6',
    lease: '#8b5cf6',
    message: '#06b6d4',
    showing: '#ec4899',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#6b7280',
  };

  let htmlSections = '';
  let textSections = '';

  Object.entries(grouped).forEach(([type, items]) => {
    const categoryName = categoryNames[type] || type;
    const categoryColor = categoryColors[type] || '#6b7280';

    htmlSections += `<div style="margin-bottom: 24px;"><h2 style="color: #1f2937; font-size: 18px; font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid ${categoryColor};">${categoryName} (${items.length})</h2>`;
    textSections += `\n${categoryName.toUpperCase()} (${items.length})\n${'='.repeat(50)}\n`;

    items.forEach((item, idx) => {
      htmlSections += `<div style="background-color: #f9fafb; border-left: 3px solid ${categoryColor}; padding: 12px; margin-bottom: 12px; border-radius: 4px;"><div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${item.title}</div><div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">${item.message}</div>${item.action_url ? `<a href="${item.action_url}" style="display: inline-block; background-color: ${categoryColor}; color: white; text-decoration: none; padding: 6px 12px; border-radius: 4px; font-size: 14px; font-weight: 500;">${item.action_label || 'View Details'}</a>` : ''}</div>`;
      
      textSections += `${idx + 1}. ${item.title}\n   ${item.message}\n`;
      if (item.action_url) textSections += `   ${item.action_label || 'View Details'}: ${item.action_url}\n`;
      textSections += '\n';
    });

    htmlSections += '</div>';
  });

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Notification Digest</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;"><div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><div style="border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 24px;"><h1 style="color: #1f2937; font-size: 24px; margin: 0 0 8px 0;">📬 ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Notification Digest</h1><p style="color: #6b7280; font-size: 14px; margin: 0;">You have <strong>${count}</strong> new notification${count !== 1 ? 's' : ''} waiting for you</p></div>${htmlSections}<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;"><p style="margin: 0 0 8px 0;">This is your ${frequency} notification digest from your Real Estate Management Platform.</p><p style="margin: 0;">To manage your notification preferences, visit your account settings.</p></div></div></body></html>`;

  const textContent = `${frequency.toUpperCase()} NOTIFICATION DIGEST\n${'='.repeat(50)}\n\nYou have ${count} new notification${count !== 1 ? 's' : ''}\n${textSections}\n${'='.repeat(50)}\nThis is your notification digest from your Real Estate Management Platform.\nTo manage your notification preferences, visit your account settings.\n`;

  return { subject, htmlContent, textContent };
}