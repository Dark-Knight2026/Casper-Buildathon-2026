import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Home, Loader2, AlertCircle, MailCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { forgotPassword } from '@/services/backendAuthService';

import { authErrorMessage, validateEmailFormat } from './authValidation';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const error = validateEmailFormat(email);
    if (error) {
      setEmailError(error);
      return;
    }
    setEmailError(undefined);
    setFormError(null);
    setSubmitting(true);

    try {
      // The backend always answers "sent" regardless of whether the address
      // maps to a reset-eligible account (anti-enumeration), so we show the
      // same neutral confirmation on success — never branching on the result.
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setFormError(authErrorMessage(err));
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <MailCheck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">Check your email</CardTitle>
            <CardDescription className="text-center">
              If an account exists for <span className="font-medium">{email.trim().toLowerCase()}</span>,
              we've sent a link to reset your password. The link expires in 30 minutes.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link to="/auth/login" className="text-sm text-primary hover:underline font-medium">
              Back to sign in
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
          <CardTitle className="text-2xl text-center">Forgot your password?</CardTitle>
          <CardDescription className="text-center">
            Enter your email and we'll send you a reset link.
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
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              disabled={submitting}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                'Send reset link'
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
