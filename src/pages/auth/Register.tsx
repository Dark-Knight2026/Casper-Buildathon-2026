import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Home, Loader2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { register } from '@/services/backendAuthService';
import { getDashboardRoute } from '@/types/user';

import { RoleSelector } from './register/RoleSelector';
import {
  PASSWORD_HINT,
  authErrorMessage,
  popPostAuthRedirect,
  validateEmailFormat,
  validatePasswordPolicy,
  validateRequiredName,
} from './authValidation';

// The signup UI offers only tenant/landlord. `agent` is self-registerable on
// the backend but is onboarded through a separate flow, so it is intentionally
// not selectable here.
type SupportedRole = 'tenant' | 'landlord';
const SUPPORTED_ROLES: readonly SupportedRole[] = ['tenant', 'landlord'];

function isSupportedRole(value: string | null): value is SupportedRole {
  return value !== null && (SUPPORTED_ROLES as readonly string[]).includes(value);
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
}

export default function Register() {
  const navigate = useNavigate();
  const { profile, setSession } = useAuth();
  const [searchParams] = useSearchParams();

  // Honor ?role=… deep-links. Unsupported values fall back to 'tenant'.
  const rawRole = searchParams.get('role');
  const [role, setRole] = useState<SupportedRole>(
    isSupportedRole(rawRole) ? rawRole : 'tenant',
  );

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect once registration auto-logs the user in (or if already signed in).
  useEffect(() => {
    if (!profile) return;
    const dest = popPostAuthRedirect() ?? getDashboardRoute(profile.role);
    navigate(dest, { replace: true });
  }, [profile, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors: FieldErrors = {
      firstName: validateRequiredName('First name', firstName) ?? undefined,
      lastName: validateRequiredName('Last name', lastName) ?? undefined,
      email: validateEmailFormat(email) ?? undefined,
      password: validatePasswordPolicy(password) ?? undefined,
    };
    if (errors.firstName || errors.lastName || errors.email || errors.password) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      const { user } = await register({
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
      });
      // register auto-logs in; setSession populates `profile` → effect redirects.
      setSession(user);
    } catch (err) {
      setFormError(
        authErrorMessage(err, {
          409: 'An account with this email already exists. Try signing in instead.',
          400: 'Please check your details and try again.',
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
          <CardTitle className="text-2xl text-center">Create an account</CardTitle>
          <CardDescription className="text-center">
            Sign up with your email to get started
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
            <RoleSelector value={role} onChange={setRole} disabled={submitting} />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={fieldErrors.firstName}
                disabled={submitting}
              />
              <Input
                label="Last name"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={fieldErrors.lastName}
                disabled={submitting}
              />
            </div>

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={submitting}
            />

            <PasswordInput
              label="Password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              helperText={fieldErrors.password ? undefined : PASSWORD_HINT}
              disabled={submitting}
            />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
