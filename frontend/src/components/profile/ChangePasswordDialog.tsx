import { useState, type FormEvent } from 'react';

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
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { useToast } from '@/hooks/use-toast';
import { changePassword } from '@/services/userProfileService';
import { ApiError } from '@/lib/api-client';
import { ProfileApiErrorCode } from '@/lib/api-errors';
import { PASSWORD_HINT, validatePasswordPolicy } from '@/pages/auth/authValidation';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FieldErrors {
  current?: string;
  next?: string;
  confirm?: string;
}

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {
      current: current ? undefined : 'Enter your current password.',
      next: validatePasswordPolicy(next) ?? undefined,
      confirm: next !== confirm ? 'Passwords do not match.' : undefined,
    };
    if (errors.current || errors.next || errors.confirm) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      // Change branch: send the current password for verification. On success
      // the backend revokes other sessions and rotates the current one, so the
      // active device stays signed in — no redirect needed.
      await changePassword({ current_password: current, new_password: next });
      toast({
        title: 'Password changed',
        description: 'Other devices have been signed out.',
      });
      handleOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          setFieldErrors({ current: 'Current password is incorrect.' });
          setSubmitting(false);
          return;
        }
        if (err.code === ProfileApiErrorCode.ReauthenticationRequired) {
          setFormError('Please sign in again, then change your password.');
          setSubmitting(false);
          return;
        }
        if (err.statusCode === 400) {
          setFieldErrors({ next: 'Choose a stronger password.' });
          setSubmitting(false);
          return;
        }
      }
      setFormError('Could not change your password. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Changing your password signs you out on all other devices.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="cp-current" className="block">Current password</Label>
            <PasswordInput
              id="cp-current"
              name="currentPassword"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              error={fieldErrors.current}
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cp-new" className="block">New password</Label>
            <PasswordInput
              id="cp-new"
              name="newPassword"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              error={fieldErrors.next}
              helperText={fieldErrors.next ? undefined : PASSWORD_HINT}
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cp-confirm" className="block">Confirm new password</Label>
            <PasswordInput
              id="cp-confirm"
              name="confirmPassword"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={fieldErrors.confirm}
              disabled={submitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Change password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
