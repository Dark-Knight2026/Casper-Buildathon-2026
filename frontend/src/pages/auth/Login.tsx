import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Home, Loader2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { loginWithPassword } from '@/services/backendAuthService';
import { getDashboardRoute } from '@/types/user';
import { storePasswordCredential } from '@/lib/passwordCredential';

import { authErrorMessage, popPostAuthRedirect, validateEmailFormat } from './authValidation';

export default function Login() {
  const navigate = useNavigate();
  const { profile, setSession } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Single redirect path: fires on mount if already signed in, and again once
  // a successful login populates `profile`. Honors a stashed redirect intent
  // (gated-action bounce) before falling back to the role dashboard.
  useEffect(() => {
    if (!profile) return;
    const dest = popPostAuthRedirect() ?? getDashboardRoute(profile.role);
    navigate(dest, { replace: true });
  }, [profile, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const emailError = validateEmailFormat(email);
    const passwordError = password ? null : 'Password is required.';
    if (emailError || passwordError) {
      setFieldErrors({ email: emailError ?? undefined, password: passwordError ?? undefined });
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      const { user } = await loginWithPassword(email.trim().toLowerCase(), password);
      // Persist the pair to the browser credential store before redirecting —
      // our fetch+redirect flow otherwise misses the native "Save password?"
      // prompt. Fire-and-forget; no-ops on non-Chromium browsers.
      void storePasswordCredential({
        id: user.email ?? email.trim().toLowerCase(),
        password,
        name: `${user.first_name} ${user.last_name}`.trim(),
      });
      // setSession populates `profile`; the effect above performs the redirect.
      setSession(user);
    } catch (err) {
      // Anti-enumeration: one generic message for every credential failure.
      setFormError(
        authErrorMessage(err, {
          401: 'Invalid email or password.',
          403: 'Your account is not active. Please contact support.',
        }),
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Home className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">
            Sign in with your email and password
          </CardDescription>
        </CardHeader>

        <CardContent>
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={submitting}
            />
            <div className="space-y-1">
              <PasswordInput
                label="Password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                disabled={submitting}
              />
              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/auth/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
