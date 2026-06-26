import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

/**
 * ⚠️ DEAD CODE (as of 2026-06-01) — non-functional Supabase-era email proxy.
 *
 * Vercel serverless function that proxied one-off notification emails to Resend.
 * RESEND_API_KEY is read server-side only and never reaches the browser bundle.
 *
 * This no longer works: auth here is a Supabase JWT (Authorization header), and
 * its only caller — src/services/emailService.ts — fetches the Supabase session
 * token before calling /api/email. Supabase is decommissioned, so both the token
 * fetch and the JWT check below fail. The generic notification emails this served
 * (see below) currently DO NOT SEND at all. This is NOT the LeaseFi auth/session
 * layer (cookie `access_token`) — keep it out of the live auth path.
 *
 * ── Current ownership (2026-06-01) ───────────────────────────────────────────
 * The Rust backend (repo: 2025_anthony_leasefi_backend) now OWNS all
 * auth/transactional email. It talks to the email provider server-side; the
 * frontend only calls these endpoints — it never sends mail itself.
 * Authoritative source: the backend OpenAPI spec at
 *   http://0.0.0.0:8080/api-docs/openapi.json  (Swagger UI: /swagger-ui/)
 * Auth for ALL of these is cookie_auth: the `access_token` cookie (NOT a bearer
 * token, NOT Supabase). All are POST.
 *
 *   Email verification (tag: Auth) — wired in src/services/ico/backendAuthService.ts
 *   • /api/v1/auth/verify/email/send     → 200 VerifySendResponse
 *       { status: string, dev_verification_token: string | null }   (token only in non-prod)
 *       no request body. 400 email_not_set · 401 · 429 rate_limited · 500 email_send_failed
 *   • /api/v1/auth/verify/email/resend   → same contract as /send (shared rate-limit + token slot)
 *   • /api/v1/auth/verify/email/confirm  ← VerifyConfirmRequest { token: string }
 *       → 200 UserInfo, rotates session tokens via Set-Cookie.
 *       400 bad_token_format · 401/404 invalid_or_expired_token · 500
 *
 *   Email change (tag: Users) — wired in src/services/userProfileService.ts
 *   • /api/v1/users/me/email             ← EmailChangeRequest { new_email: string }
 *       → 202 (confirmation queued, no body). 400 invalid · 401 · 409 already_in_use · 429 · 500
 *   • /api/v1/users/me/email/confirm     ← EmailChangeConfirmRequest { token: string }
 *       → 200 UserInfo. 400 invalid_token · 401 expired/consumed · 404 user_gone · 409 race · 500
 *
 * ── What this proxy used to serve (now broken) ───────────────────────────────
 * Generic app notifications via src/services/emailService.ts — lease agreement,
 * lease-expiration reminder, signature request, payment reminder, maintenance
 * update. These are currently non-functional (Supabase down) and the backend has
 * no generic "send arbitrary HTML email" endpoint yet, so there is no working
 * path for them today.
 *
 * ── Migration ────────────────────────────────────────────────────────────────
 * Delete this file and src/services/emailService.ts once the backend exposes a
 * generic notification-send endpoint and the notification call sites are
 * repointed to it. Nothing depends on this proxy still functioning — it is dead.
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
