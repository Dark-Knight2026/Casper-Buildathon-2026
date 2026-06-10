import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MailWarning } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  resendVerificationEmail,
  sendVerificationEmail,
  type VerifyEmailSendResponse,
} from '@/services/backendAuthService';

const RESEND_COOLDOWN_SECONDS = 60;

// Backend stamps wallet-only users with a synthetic `wallet_<hex>@leasefi.local`
// email until they fill in a real one via profile. Asking such a user to verify
// would just route a Postmark email into a black hole, so we suppress the CTA
// and nudge them to complete their profile first.
function isPlaceholderEmail(email: string | undefined): boolean {
  if (!email) return true;
  return /^wallet_.*@leasefi\.local$/i.test(email);
}

export function EmailVerificationCard() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Dev-only escape hatch — the backend returns dev_verification_token only
  // when Postmark is not configured. We surface it as a clickable link in dev
  // builds so the flow is testable without a real inbox.
  const [devToken, setDevToken] = useState<string | null>(null);

  // Guards the async `handleSend` from calling setState after unmount (the
  // request can resolve after the user navigates away).
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Countdown ticker for the resend cooldown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = window.setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [cooldown]);

  if (!profile) return null;

  // Backend `verification_level` is the ordered enum none < email < identity <
  // full (serialized snake_case). Email counts as verified at `email` and up;
  // absence (legacy sessions) is treated as unverified.
  const verified = profile.verificationLevel != null && profile.verificationLevel !== 'none';
  const placeholder = isPlaceholderEmail(profile.email);

  const handleSend = async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    try {
      const fn = justSent ? resendVerificationEmail : sendVerificationEmail;
      const response: VerifyEmailSendResponse = await fn();
      // Bail out if the component unmounted while the request was in flight, so
      // none of the post-await setState calls (justSent/cooldown/devToken) run
      // on an unmounted instance. `finally` still skips setSending via its own
      // guard.
      if (!mountedRef.current) return;
      setJustSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      if (response.dev_verification_token && import.meta.env.DEV) {
        setDevToken(response.dev_verification_token);
      }
      // "sent" means the request was accepted; delivery may be deferred to the
      // retry queue, so we phrase the toast as "request accepted", not "sent".
      toast({
        title: 'Verification email requested',
        description: 'Check your inbox in a minute or so.',
      });
    } catch (err) {
      // Same post-await unmount guard as the success path: skip the error
      // setCooldown / toasts if the component is gone.
      if (!mountedRef.current) return;
      const code = err instanceof Error && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
      if (code === 429) {
        setCooldown(RESEND_COOLDOWN_SECONDS);
        toast({
          title: 'Please wait',
          description: 'Too many requests — try again in a moment.',
          variant: 'destructive',
        });
      } else if (code === 400) {
        toast({
          title: 'Add an email first',
          description: 'Update your profile with a real email address before requesting verification.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Could not request verification email',
          variant: 'destructive',
        });
      }
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  // ─── Render branches ──────────────────────────────────────────────────────

  if (verified) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            <CardTitle className="text-base">Email verified</CardTitle>
            <Badge variant="secondary">{profile.email}</Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Placeholder-email users (wallet-only sign-up) cannot verify; they need to
  // change their email first. The dedicated `Email Address` card on the
  // profile page already exposes the Change Email dialog, so this card stays
  // out of the way for that user class.
  if (placeholder) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MailWarning className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <CardTitle className="text-base">Verify your email</CardTitle>
        </div>
        <CardDescription>
          We sent verification to <span className="font-medium">{profile.email}</span>. Click the link in
          that email to confirm it belongs to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Button onClick={handleSend} disabled={sending || cooldown > 0}>
            {sending
              ? 'Requesting…'
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : justSent
                  ? 'Resend verification email'
                  : 'Send verification email'}
          </Button>
          {justSent && cooldown === 0 && (
            <span className="text-sm text-muted-foreground">Didn't get it? Try again.</span>
          )}
        </div>

        {justSent && (
          <Alert>
            <AlertDescription>
              Request accepted. Delivery can take a minute — check spam if it doesn't arrive.
            </AlertDescription>
          </Alert>
        )}

        {devToken && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="font-mono text-xs break-all">
                DEV: <Link to={`/verify-email?token=${encodeURIComponent(devToken)}`} className="underline">
                  /verify-email?token={devToken.slice(0, 12)}…
                </Link>
              </div>
              <div className="mt-1 text-xs">
                Postmark not configured — this dev token will disappear once it is.
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
