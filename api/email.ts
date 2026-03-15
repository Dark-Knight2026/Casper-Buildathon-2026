import { Resend } from 'resend';

/**
 * Vercel serverless function — proxies email send requests to Resend.
 * RESEND_API_KEY is read server-side only and is never exposed to the browser bundle.
 */
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Email service not configured' });
    return;
  }

  const { to, from, subject, html, text, replyTo, cc, bcc } = req.body;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: from || 'noreply@yourdomain.com',
      to,
      subject,
      html,
      text,
      reply_to: replyTo,
      cc,
      bcc,
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
