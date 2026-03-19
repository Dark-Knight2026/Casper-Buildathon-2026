import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

/**
 * Vercel serverless function — proxies email send requests to Resend.
 * RESEND_API_KEY is read server-side only and is never exposed to the browser bundle.
 * Requires a valid Supabase JWT in the Authorization header.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(503).json({ error: 'Auth service not configured' });
    return;
  }

  const token = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Email service not configured' });
    return;
  }

  const from = process.env.EMAIL_FROM_ADDRESS ?? 'noreply@leasefi.com';
  const { to, subject, html, text, replyTo } = req.body;

  // Validate recipient — must match the authenticated user's own email.
  // Prevents authenticated relay abuse (issue #10).
  if (!to || to !== user.email) {
    res.status(403).json({ error: 'Forbidden: recipient must match authenticated user email' });
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      replyTo,
    });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ id: data?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    res.status(500).json({ error: message });
  }
}
