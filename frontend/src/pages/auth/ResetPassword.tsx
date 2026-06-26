import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Home, Loader2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { resetPassword } from '@/services/backendAuthService';
import { getDashboardRoute } from '@/types/user';
import { storePasswordCredential } from '@/lib/passwordCredential';

import { PASSWORD_HINT, authErrorMessage, popPostAuthRedirect, validatePasswordPolicy } from './authValidation';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { profile, setSession } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // resetPassword auto-logs the user in; redirect once `profile` is populated.
  useEffect(() => {
    if (!profile) return;
    const dest = popPostAuthRedirect() ?? getDashboardRoute(profile.role);
    navigate(dest, { replace: true });
  }, [profile, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const passwordError = validatePasswordPolicy(password);
    const confirmError = password !== confirm ? 'Passwords do not match.' : null;
    if (passwordError || confirmError) {
      setFieldErrors({ password: passwordError ?? undefined, confirm: confirmError ?? undefined });
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      const { user } = await resetPassword(token, password);
      // Update the saved credential with the new password (id falls back to ''
      // → helper no-ops if the session somehow carries no email).
      void storePasswordCredential({
        id: user.email ?? '',
        password,
        name: `${user.first_name} ${user.last_name}`.trim(),
      });
      setSession(user);
    } catch (err) {
      setFormError(
        authErrorMessage(err, {
          400: 'This reset link is invalid or has expired. Please request a new one.',
          404: 'This account no longer exists.',
        }),
      );
      setSubmitting(false);
    }
  };

  // No token in the URL → the link is malformed; send the user back to forgot.
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-center">Invalid reset link</CardTitle>
            <CardDescription className="text-center">
              This password reset link is missing or malformed. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium">
              Request a new link
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Home className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Set a new password</CardTitle>
          <CardDescription className="text-center">
            Choose a new password for your account.
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
            <PasswordInput
              label="New password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              helperText={fieldErrors.password ? undefined : PASSWORD_HINT}
              disabled={submitting}
            />
            <PasswordInput
              label="Confirm new password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={fieldErrors.confirm}
              disabled={submitting}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting…
                </>
              ) : (
                'Reset password'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Link to="/auth/login" className="text-sm text-primary hover:underline font-medium">
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
