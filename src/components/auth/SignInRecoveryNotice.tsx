import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Pre-sign-up notice rendered on Register.tsx. Tells the user that their
 * account is bound to the sign-in service they're about to pick, and that
 * LeaseFi can't reset access if they lose it. Provider-agnostic copy —
 * never names Google/Apple/Email directly.
 */
export function SignInRecoveryNotice() {
  return (
    <Alert className="border-blue-200 bg-blue-50 text-blue-900">
      <Info className="h-4 w-4 !text-blue-600" />
      <AlertDescription className="text-xs leading-relaxed text-blue-900">
        Your account is linked to the sign-in service you choose below.
        If you ever lose access to that service, recovery goes through it —
        LeaseFi can't reset your access. We recommend enabling 2-factor
        authentication on your sign-in account.
      </AlertDescription>
    </Alert>
  );
}
