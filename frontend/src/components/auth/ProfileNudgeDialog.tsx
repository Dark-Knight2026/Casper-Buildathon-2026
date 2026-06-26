import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProfileNudgeDialogProps {
  /** Where the "Complete profile" button sends the user (e.g. `/tenant/profile`). */
  profilePath: string;
  /** Headline copy. Defaults to a neutral, provider-agnostic prompt. */
  title?: string;
  /** Body copy. Defaults to a neutral, provider-agnostic prompt. */
  description?: string;
  /** Label of the primary action button. Defaults to "Complete profile". */
  ctaLabel?: string;
  /** Label of the dismiss button. Defaults to "Later". */
  dismissLabel?: string;
  /**
   * sessionStorage key used to remember a dismissal for the lifetime of the
   * tab. Override per layout (tenant vs landlord) so dismissing in one role
   * doesn't silence the prompt in another.
   */
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = 'leasefi_profile_nudge_dismissed';

/**
 * One-time popup that nudges users to fill in their profile when the backend
 * reports `is_profile_complete = false` (e.g. wallet-only users who arrive
 * with the placeholder `('Wallet','User')` row stamped at first login). The
 * dialog auto-dismisses on the profile page itself so it never interrupts
 * the very edit it asks for, and remembers a manual dismissal per browser tab.
 */
export function ProfileNudgeDialog({
  profilePath,
  title = 'Finish setting up your profile',
  description = "We don't have your contact details on file yet. Add your name, email, and phone number so landlords can reach you and your leases stay tied to a real identity.",
  ctaLabel = 'Complete profile',
  dismissLabel = 'Later',
  storageKey = DEFAULT_STORAGE_KEY,
}: ProfileNudgeDialogProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (profile.isProfileComplete !== false) return;
    if (pathname.startsWith(profilePath)) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(storageKey) === '1';
    } catch {
      // sessionStorage may be disabled (private mode) — fall through and show.
    }
    if (!dismissed) setOpen(true);
  }, [profile, pathname, profilePath, storageKey]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      try {
        sessionStorage.setItem(storageKey, '1');
      } catch {
        // see useEffect above — non-fatal
      }
    }
  };

  const goToProfile = () => {
    handleOpenChange(false);
    navigate(profilePath);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            {dismissLabel}
          </Button>
          <Button onClick={goToProfile}>{ctaLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
