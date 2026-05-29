import { useEffect, useState } from 'react';
import { Shield, X, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'leasefi_security_recovery_acked_at';
const ACCOUNTS_URL = 'https://accounts.cspr.click/';

/**
 * Dismissible post-sign-up onboarding card. Shown on the dashboard until
 * the user acknowledges (persisted across sessions via localStorage). Sends
 * them to CSPR.click's account management surface, where they can add
 * recovery factors / manage the sign-in tied to their LeaseFi account.
 *
 * Copy is provider-agnostic — the social provider (Google/Apple/Email) is
 * never named because the backend can't distinguish a wallet sign-in from
 * a social one. See memory: [LeaseFi auth UI must be provider-agnostic].
 */
export function SecurityRecoveryCard() {
  // `null` while we're still reading localStorage, so the card doesn't
  // flash in for one frame on already-acked browsers.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    let acked = false;
    try {
      acked = !!localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable (private mode, embedded webview) — show the card.
    }
    setDismissed(acked);
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // non-fatal — at worst the card returns on next visit
    }
    setDismissed(true);
  };

  if (dismissed !== false) return null;

  return (
    <Card className="border-blue-200 bg-blue-50/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <Shield className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-semibold text-blue-900">
              Keep your account recoverable
            </h3>
            <p className="text-xs leading-relaxed text-blue-900/85">
              Your access is tied to the sign-in service you used to register.
              We don't store a password and can't reset access on your behalf.
              Turn on 2-factor authentication for that service, and manage
              recovery options through your CSPR.click account.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm" className="h-8">
                <a
                  href={ACCOUNTS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5"
                >
                  Manage sign-in account
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-blue-900 hover:bg-blue-100"
                onClick={handleDismiss}
              >
                I've done this
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 rounded p-1 text-blue-700/60 hover:bg-blue-100 hover:text-blue-900"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
