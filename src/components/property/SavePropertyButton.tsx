import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useAuth } from '@/hooks/useAuth';
import { AuthPromptModal } from '@/components/auth/AuthPromptModal';
import {
  getFavoriteIds,
  addFavorite,
  removeFavorite,
} from '@/services/favoriteService';
import { ApiClient, ApiError } from '@/lib/api-client';

interface SavePropertyButtonProps {
  /** Listing this button saves/un-saves. */
  listingId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  /** When true renders as an icon-only round button (for card overlays) */
  iconOnly?: boolean;
  /** When true hides the "Save" label below the sm breakpoint */
  hideTextOnMobile?: boolean;
}

export function SavePropertyButton({
  listingId,
  variant = 'outline',
  size = 'default',
  className,
  iconOnly = false,
  hideTextOnMobile = false,
}: SavePropertyButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    requireAuth,
    isAuthenticated,
    isPromptOpen,
    promptContext,
    closePrompt,
    goToSignUp,
    goToLogin,
  } = useAuthPrompt();
  const { profile } = useAuth();
  const [pending, setPending] = useState(false);

  // Favorites are a tenant-only feature on the backend; a signed-in landlord
  // would just get a 403. Show the button to guests (so they're prompted to
  // sign in) and tenants only.
  const isTenant = profile?.role === 'tenant';

  // Shared across every SavePropertyButton on the page; toggling one updates
  // them all. Only fetched for a signed-in tenant.
  const { data: ids } = useQuery({
    queryKey: ['favorite-ids'],
    queryFn: getFavoriteIds,
    enabled: isAuthenticated && isTenant,
  });
  const isSaved = ids?.includes(listingId) ?? false;

  if (isAuthenticated && !isTenant) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const canProceed = requireAuth({
      action: 'save this property',
      redirectPath: window.location.pathname,
    });
    if (!canProceed) return;

    setPending(true);
    try {
      if (isSaved) {
        await removeFavorite(listingId);
        toast({
          title: 'Removed',
          description: 'Listing removed from your favorites.',
        });
      } else {
        await addFavorite(listingId);
        toast({
          title: 'Saved',
          description: 'Listing added to your favorites.',
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['favorite-ids'] });
      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch (error) {
      // A 409 means it's already saved (e.g. a double-click race) — reconcile
      // the toggle state rather than surfacing it as an error.
      if (error instanceof ApiError && error.statusCode === 409) {
        await queryClient.invalidateQueries({ queryKey: ['favorite-ids'] });
        await queryClient.invalidateQueries({ queryKey: ['favorites'] });
      } else {
        toast({
          title: 'Could not update favorites',
          description: ApiClient.handleError(error),
          variant: 'destructive',
        });
      }
    } finally {
      setPending(false);
    }
  };

  const heartFill = isSaved ? 'fill-red-500 text-red-500' : 'text-gray-500';

  const trigger = iconOnly ? (
    <button
      className={cn(
        'bg-card/90 hover:bg-card p-2 rounded-full shadow',
        className
      )}
      onClick={handleClick}
      disabled={pending}
      aria-label={isSaved ? 'Remove from favorites' : 'Save property'}
      aria-pressed={isSaved}
    >
      <Heart className={cn('h-4 w-4', heartFill)} />
    </button>
  ) : (
    <Button
      variant={variant}
      size={size}
      className={cn(
        // Saved: keep a plain white surface (no blue-tinted accent hover) with
        // a red heart — the "on" state reads from the heart, not the background.
        isSaved &&
          'bg-background text-foreground hover:bg-background hover:text-foreground',
        className
      )}
      onClick={handleClick}
      disabled={pending}
      aria-pressed={isSaved}
    >
      <Heart
        className={cn(
          'h-4 w-4',
          hideTextOnMobile ? 'sm:mr-2' : 'mr-2',
          isSaved && 'fill-red-500 text-red-500'
        )}
      />
      <span className={cn(hideTextOnMobile && 'hidden sm:inline')}>
        {isSaved ? 'Saved' : 'Save'}
      </span>
    </Button>
  );

  return (
    <>
      {trigger}
      {/* Auth prompt rendered locally so the button works standalone — no
          dependency on the parent page mounting the modal. */}
      {!isAuthenticated && (
        <AuthPromptModal
          isOpen={isPromptOpen}
          onClose={closePrompt}
          onSignUp={goToSignUp}
          onLogin={goToLogin}
          action={promptContext?.action}
        />
      )}
    </>
  );
}
