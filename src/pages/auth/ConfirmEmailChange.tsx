import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRoute } from '@/types/user';
import { confirmEmailChange } from '@/services/userProfileService';

type Status =
  | 'confirming'
  | 'success'
  | 'invalid_token'
  | 'email_taken'
  | 'no_token'
  | 'needs_login'
  | 'generic_error';

const SUCCESS_REDIRECT_DELAY_MS = 3000;

function classifyError(err: unknown): Exclude<Status, 'confirming' | 'success' | 'no_token'> {
  if (err instanceof Error && 'statusCode' in err) {
    const status = (err as { statusCode?: number }).statusCode;
    const code = (err as { code?: string }).code;
    // 401 is overloaded (endpoint requires auth): the middleware emits
    // invalid_token / missing_access_token when the caller is not logged in,
    // while the handler emits invalid_email_change_token for a missing / expired
    // / mismatched token. Only the former is a "log in first" situation —
    // distinguish by the machine code, not the status alone.
    if (status === 401 && (code === 'invalid_token' || code === 'missing_access_token')) {
      return 'needs_login';
    }
    // 409 means the target email was claimed by another account between the
    // change request and this confirmation. Retrying the same token will always
    // 409 again, so route it to its own dead-end screen (no Retry) with an
    // actionable message instead of the generic "try again" path.
    if (status === 409) {
      return 'email_taken';
    }
    // Bad / expired / consumed token (401 invalid_email_change_token, 404/410) or
    // a malformed token (400). None are fixed by logging in or retrying the same
    // link, so route them all to the dead-end invalid_token screen (no Retry).
    if (status === 401 || status === 404 || status === 410 || status === 400) {
      return 'invalid_token';
    }
  }
  return 'generic_error';
}

export default function ConfirmEmailChange() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, setWalletSession } = useAuth();

  // Capture the single-use token from the URL exactly once. We strip it from
  // the address bar on terminal states (effect below) so it can't leak via the
  // Referer header — which means we must NOT re-read it reactively, or it would
  // vanish mid-flow and break Retry / flip the screen to no_token.
  const tokenRef = useRef(params.get('token'));
  const token = tokenRef.current;
  const [status, setStatus] = useState<Status>('confirming');
  // One-shot guard: the change token is single-use, so confirm at most once per
  // mount even if `token` (a useCallback dep) changes and re-fires the effect,
  // or StrictMode double-invokes it in dev.
  const hasConfirmedRef = useRef(false);

  const handleConfirm = useCallback(async () => {
    if (!token) {
      setStatus('no_token');
      return;
    }
    if (hasConfirmedRef.current) return;
    hasConfirmedRef.current = true;
    // Don't gate on AuthContext.isAuthenticated — that state hydrates from a
    // localStorage marker which can be missing in fresh-tab/new-browser flows,
    // even when the access cookie is still valid. The browser sends the
    // cookie regardless of our React state, so we let the backend be the
    // source of truth: a 401 then maps cleanly to needs_login.
    setStatus('confirming');
    try {
      const updatedUser = await confirmEmailChange(token);
      // Backend returns the fresh ServerUserInfo with the new email applied;
      // feed it directly into AuthContext (no re-fetch needed).
      setWalletSession(updatedUser);
      setStatus('success');
    } catch (err) {
      const next = classifyError(err);
      if (next === 'needs_login') {
        try {
          localStorage.setItem(
            'auth_redirect_intent',
            `/confirm-email-change?token=${encodeURIComponent(token)}`,
          );
        } catch {
          // Quota / private-mode failure — non-fatal.
        }
      }
      setStatus(next);
    }
  }, [token, setWalletSession]);

  useEffect(() => {
    void handleConfirm();
  }, [handleConfirm]);

  useEffect(() => {
    if (status !== 'success') return;
    const dashboard = getDashboardRoute(profile?.role);
    const timer = window.setTimeout(() => navigate(dashboard, { replace: true }), SUCCESS_REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, profile?.role, navigate]);

  // Once we reach a terminal error state, scrub the token from the URL so it is
  // not sent in the Referer header on any later navigation. (success navigates
  // away on its own; no_token never carried a token.)
  useEffect(() => {
    const leaksToken =
      status === 'invalid_token' ||
      status === 'email_taken' ||
      status === 'needs_login' ||
      status === 'generic_error';
    if (token && leaksToken) {
      navigate(location.pathname, { replace: true });
    }
  }, [status, token, navigate, location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <CardTitle>Confirm email change</CardTitle>
          <CardDescription>
            {status === 'success'
              ? 'Your new email is active.'
              : status === 'confirming'
                ? 'Applying your new email…'
                : 'We could not apply the email change.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'confirming' && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" aria-hidden="true" />
              {profile?.email && (
                <p className="text-sm text-muted-foreground">
                  New email: <span className="font-medium text-foreground">{profile.email}</span>
                </p>
              )}
              <p className="text-sm text-muted-foreground">Redirecting you to your dashboard…</p>
              <Button asChild variant="outline" size="sm">
                <Link to={getDashboardRoute(profile?.role)}>Go now</Link>
              </Button>
            </div>
          )}

          {status === 'needs_login' && (
            <>
              <Alert>
                <AlertDescription>
                  Please log in first so we can apply your email change.
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
                This page needs a confirmation token. Open the link from the email exactly as it was sent.
              </AlertDescription>
            </Alert>
          )}

          {status === 'invalid_token' && (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <XCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                This confirmation link is no longer valid — it may have expired or already been used.
                Request a new change from your profile.
              </p>
            </div>
          )}

          {status === 'email_taken' && (
            <>
              <Alert variant="destructive">
                <AlertDescription>
                  This email is already registered to another account. Request a different
                  email change from your profile.
                </AlertDescription>
              </Alert>
              <Button asChild variant="outline" className="w-full">
                <Link to={getDashboardRoute(profile?.role)}>Back to dashboard</Link>
              </Button>
            </>
          )}

          {status === 'generic_error' && (
            <>
              <Alert variant="destructive">
                <AlertDescription>
                  Something went wrong. Please try again or request a fresh change from your profile.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => {
                  // Deliberate user retry re-arms the one-shot guard.
                  hasConfirmedRef.current = false;
                  void handleConfirm();
                }}
                variant="outline"
                className="w-full"
              >
                Retry
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
