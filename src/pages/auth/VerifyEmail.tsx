import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  confirmEmailVerification,
  sendVerificationEmail,
} from '@/services/ico/backendAuthService';

type Status =
  | 'verifying'
  | 'success'
  | 'invalid_token'
  | 'bad_format'
  | 'no_token'
  | 'needs_login'
  | 'generic_error';

const SUCCESS_REDIRECT_DELAY_MS = 3000;

function getDashboardPath(role: string | undefined): string {
  if (role === 'landlord') return '/landlord/dashboard';
  if (role === 'tenant') return '/tenant/dashboard';
  return '/';
}

function classifyConfirmError(err: unknown): Exclude<Status, 'verifying' | 'success' | 'needs_login' | 'no_token'> {
  if (err instanceof Error && 'statusCode' in err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 401 || status === 404) return 'invalid_token';
    if (status === 400) return 'bad_format';
  }
  return 'generic_error';
}

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, setWalletSession } = useAuth();

  const token = params.get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [resending, setResending] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!token) {
      setStatus('no_token');
      return;
    }
    // Don't gate on AuthContext.isAuthenticated — that state hydrates from a
    // localStorage marker which can be missing in fresh-tab/new-browser flows,
    // even when the access cookie is still valid. The browser sends the
    // cookie regardless of our React state; the backend is the source of
    // truth (401 → classified as invalid_token per the BE error contract).
    setStatus('verifying');
    try {
      const response = await confirmEmailVerification(token);
      // Backend has already rotated the cookies via Set-Cookie — feed the
      // returned UserInfo directly into AuthContext instead of re-fetching
      // /users/me (avoids a redundant round-trip and a race against the
      // freshly rotated session).
      setWalletSession(response.user);
      setStatus('success');
    } catch (err) {
      const next = classifyConfirmError(err);
      // Stash intent for a future post-login retry on 401-ish failures —
      // harmless when the user is already logged in.
      try {
        localStorage.setItem('auth_redirect_intent', `/verify-email?token=${encodeURIComponent(token)}`);
      } catch {
        // Quota / private-mode failure — non-fatal.
      }
      setStatus(next);
    }
  }, [token, setWalletSession]);

  // Auto-confirm on mount when both token and session are ready.
  useEffect(() => {
    void handleConfirm();
  }, [handleConfirm]);

  // Success → auto-redirect to role dashboard after a brief celebration.
  useEffect(() => {
    if (status !== 'success') return;
    const dashboard = getDashboardPath(profile?.role);
    const timer = window.setTimeout(() => navigate(dashboard, { replace: true }), SUCCESS_REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, profile?.role, navigate]);

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      await sendVerificationEmail();
      toast({
        title: 'Verification email sent',
        description: 'Check your inbox for a fresh link.',
      });
    } catch (err) {
      const code = err instanceof Error && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
      toast({
        title: code === 429 ? 'Please wait before requesting another email' : 'Could not send email',
        description: code === 400 ? 'Add an email to your profile first.' : undefined,
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <CardTitle>Email verification</CardTitle>
          <CardDescription>
            {status === 'success'
              ? 'Your email is confirmed.'
              : status === 'verifying'
                ? 'Confirming your email…'
                : 'We could not finish verifying your email.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'verifying' && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Redirecting you to your dashboard…
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to={getDashboardPath(profile?.role)}>Go now</Link>
              </Button>
            </div>
          )}

          {status === 'needs_login' && (
            <>
              <Alert>
                <AlertDescription>
                  Please log in first so we can confirm this verification link.
                </AlertDescription>
              </Alert>
              <Button asChild className="w-full">
                <Link to="/auth/login">Log in</Link>
              </Button>
            </>
          )}

          {status === 'no_token' && (
            <Alert variant="destructive">
              <AlertDescription>
                This page needs a verification token. Open the link from the email exactly as it was sent.
              </AlertDescription>
            </Alert>
          )}

          {status === 'invalid_token' && (
            <>
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <XCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  This link is no longer valid — it may have expired or already been used.
                </p>
              </div>
              <Button onClick={handleResend} disabled={resending} className="w-full">
                {resending ? 'Sending…' : 'Send a new verification email'}
              </Button>
            </>
          )}

          {status === 'bad_format' && (
            <Alert variant="destructive">
              <AlertDescription>
                The verification token in this link is malformed. Request a new email from your profile.
              </AlertDescription>
            </Alert>
          )}

          {status === 'generic_error' && (
            <>
              <Alert variant="destructive">
                <AlertDescription>
                  Something went wrong. Please try again or request a new email.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button onClick={handleConfirm} variant="outline" className="flex-1">
                  Retry
                </Button>
                <Button onClick={handleResend} disabled={resending} className="flex-1">
                  {resending ? 'Sending…' : 'New email'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
