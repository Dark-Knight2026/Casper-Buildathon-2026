import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { useSensitiveAction } from '@/hooks/auth/useSensitiveAction';
import { ApiError } from '@/lib/api-client';
import { ProfileApiErrorCode } from '@/lib/api-errors';
import { patchMyRole } from '@/services/userProfileService';
import type { SelfRegisterableRole } from '@/types/serverUser';

const ROLE_OPTIONS: ReadonlyArray<{ value: SelfRegisterableRole; label: string }> = [
  { value: 'tenant', label: 'Tenant' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'agent', label: 'Real Estate Agent' },
];

// Map the gate's machine-readable error reasons to user-facing copy. Kept
// inline because the strings are tightly coupled to the UI (toast/inline
// alert) — moving them out would split context across two files for no win.
const REAUTH_ERROR_COPY: Record<
  Extract<ReturnType<typeof useSensitiveAction>['state'], { status: 'error' }>['reason'],
  string
> = {
  cancelled: 'Wallet signature was dismissed. Try again to switch roles.',
  'no-wallet': 'Your wallet session is not available. Reconnect and try again.',
  'login-failed': 'Could not refresh your session. Please try again.',
  'still-blocked':
    'The session is still blocked after re-signing. Sign out completely and log in again.',
};

// Deep-link target for the "active leases block this change" CTA. Only
// tenant and landlord have a leases surface; agents (and any unknown role)
// get the explanatory copy without a dead-end button.
const leasesPathForRole = (
  role: SelfRegisterableRole | string | undefined
): string | null => {
  if (role === 'tenant') return '/tenant/leases';
  if (role === 'landlord') return '/landlord/leases';
  return null;
};

interface RoleSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole: SelfRegisterableRole | string | undefined;
}

export function RoleSwitchDialog({ open, onOpenChange, currentRole }: RoleSwitchDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { runAndReauth, state: reauthState, reset } = useSensitiveAction();

  const [selected, setSelected] = useState<SelfRegisterableRole | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset the local form and the reauth-gate error whenever the dialog
  // opens, so a previous cancelled/still-blocked state never bleeds into
  // the next attempt.
  useEffect(() => {
    if (open) {
      setSelected(null);
      setSubmitting(false);
      reset();
    }
  }, [open, reset]);

  const awaitingSignature = reauthState.status === 'awaiting-signature';
  const replaying = reauthState.status === 'replaying';
  const reauthError = reauthState.status === 'error' ? reauthState.reason : null;

  // Block close attempts while a wallet round-trip is mid-flight — closing
  // the dialog under it would leave the user confused about whether the
  // role change actually applied. The wallet popup itself is already modal,
  // so this only guards the underlying dialog chrome.
  const handleOpenChange = (next: boolean) => {
    if (!next && (awaitingSignature || replaying || submitting)) return;
    onOpenChange(next);
  };

  const isSameAsCurrent = selected !== null && selected === currentRole;
  const canSubmit = selected !== null && !isSameAsCurrent && !submitting;

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await runAndReauth(() => patchMyRole(selected));
      // useSensitiveAction has already cleared local session and navigated
      // to /auth/login by the time we resume here. Toast lands on the
      // login page so the user knows the action succeeded.
      toast({
        title: 'Role switched',
        description: `Sign in again to continue as ${selected}.`,
      });
    } catch (err) {
      // Errors fall into two buckets:
      //   - Reauth-gate error states (cancelled / no-wallet / login-failed /
      //     still-blocked) are already surfaced inline via `reauthError`.
      //   - Anything else is a server error. Map the known machine-readable
      //     codes to human copy; never surface `err.message` — it is the raw
      //     envelope token verbatim (e.g. "rate_limited") or backend prose.
      if (reauthState.status !== 'error') {
        const code = err instanceof ApiError ? err.code : undefined;
        if (code === ProfileApiErrorCode.RateLimited) {
          toast({
            variant: 'destructive',
            title: 'Role switch unavailable',
            description: 'You can only change your role once per 24 hours.',
          });
        } else if (code === ProfileApiErrorCode.ActiveLeasesBlocking) {
          const leasesPath = leasesPathForRole(currentRole);
          toast({
            variant: 'destructive',
            title: 'Active leases block this change',
            description:
              'Resolve or end your active leases before switching roles.',
            action: leasesPath ? (
              <ToastAction
                altText="Review your leases"
                onClick={() => navigate(leasesPath)}
              >
                Review leases
              </ToastAction>
            ) : undefined,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Role switch failed',
            description: 'Could not switch role. Please try again.',
          });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Switch account role</DialogTitle>
          <DialogDescription>
            Your role controls which dashboard and permissions you see across LeaseFi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="role-select" className="text-sm font-medium block">
              New role
            </label>
            <Select
              value={selected ?? undefined}
              onValueChange={(value) => setSelected(value as SelfRegisterableRole)}
              disabled={awaitingSignature || replaying || submitting}
            >
              <SelectTrigger id="role-select" className="w-full">
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSameAsCurrent && (
              <p className="text-xs text-muted-foreground">
                This is already your current role.
              </p>
            )}
          </div>

          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription className="text-xs">
              You'll be signed out and need to log in again — the backend issues a fresh
              session for your new role. If your last wallet signature is older than
              5 minutes, you'll also be asked to re-sign with your wallet first.
            </AlertDescription>
          </Alert>

          {awaitingSignature && (
            <p className="text-sm text-muted-foreground">
              Confirm with your wallet to continue.
            </p>
          )}

          {reauthError && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                {REAUTH_ERROR_COPY[reauthError]}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={awaitingSignature || replaying || submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit || awaitingSignature || replaying}>
            {(awaitingSignature || replaying || submitting) && (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            )}
            {awaitingSignature
              ? 'Waiting for signature…'
              : replaying
                ? 'Applying…'
                : 'Switch role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
