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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { requestEmailChange } from '@/services/userProfileService';

// Plain-vanilla RFC 5322-lite check. We delegate strict validation to the
// backend; this is just to prevent obvious typos from costing a round-trip.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current email — displayed read-only as context. */
  currentEmail?: string;
}

export function ChangeEmailDialog({ open, onOpenChange, currentEmail }: Props) {
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Reset transient state whenever the dialog closes so the next open is fresh.
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setNewEmail('');
      setSentTo(null);
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const trimmed = newEmail.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      toast({ title: 'Enter a valid email address', variant: 'destructive' });
      return;
    }
    if (trimmed.toLowerCase() === currentEmail?.toLowerCase()) {
      toast({ title: 'That is already your email', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await requestEmailChange(trimmed);
      setSentTo(trimmed);
    } catch (err) {
      const code = err instanceof Error && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
      if (code === 409) {
        toast({
          title: 'Email already in use',
          description: 'Pick a different address.',
          variant: 'destructive',
        });
      } else if (code === 429) {
        toast({
          title: 'Please wait',
          description: 'Too many requests — try again in a moment.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Could not request email change',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change email</DialogTitle>
          <DialogDescription>
            We'll send a confirmation link to your new address. The change only takes effect
            after you click that link.
          </DialogDescription>
        </DialogHeader>

        {sentTo ? (
          <div className="space-y-4 py-2">
            <Alert>
              <AlertDescription>
                Confirmation email queued for <span className="font-medium">{sentTo}</span>.
                Check your inbox (and spam) — delivery can take a minute.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {currentEmail && (
              <div className="space-y-1">
                <Label className="text-muted-foreground">Current</Label>
                <p className="text-sm break-all">{currentEmail}</p>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="change-email-new">New email</Label>
              <Input
                id="change-email-new"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                disabled={submitting}
                autoFocus
                required
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
              <Button type="submit" disabled={submitting || !newEmail.trim()}>
                {submitting ? 'Sending…' : 'Send confirmation link'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
