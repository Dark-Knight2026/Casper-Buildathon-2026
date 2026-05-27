import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { AuthPromptModal } from '@/components/auth/AuthPromptModal';

interface SavePropertyButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  /** When true renders as an icon-only round button (for card overlays) */
  iconOnly?: boolean;
  /** When true hides the "Save" label below the sm breakpoint */
  hideTextOnMobile?: boolean;
}

export function SavePropertyButton({
  variant = 'outline',
  size = 'default',
  className,
  iconOnly = false,
  hideTextOnMobile = false,
}: SavePropertyButtonProps) {
  const { toast } = useToast();
  const {
    requireAuth,
    isAuthenticated,
    isPromptOpen,
    promptContext,
    closePrompt,
    goToSignUp,
    goToLogin,
  } = useAuthPrompt();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Guest path — open the AuthPromptModal (rendered below) with a Save-
    // flavored copy so the user gets the same prompt UX as other CTAs.
    const canProceed = requireAuth({
      action: 'save this property',
      redirectPath: window.location.pathname,
    });
    if (!canProceed) return;

    // TODO(backend): once /api/v1/properties/:id/favorite exists, call
    // favoriteService.toggle() here. For now we still show a placeholder
    // toast to confirm the click landed.
    toast({
      title: 'Saved',
      description: 'Property added to your favorites.',
    });
  };

  const trigger = iconOnly ? (
    <button
      className={cn('bg-card/90 hover:bg-card p-2 rounded-full shadow', className)}
      onClick={handleClick}
      aria-label="Save property"
    >
      <Heart className="h-4 w-4 text-gray-500" />
    </button>
  ) : (
    <Button variant={variant} size={size} className={className} onClick={handleClick}>
      <Heart className={cn('h-4 w-4', hideTextOnMobile ? 'sm:mr-2' : 'mr-2')} />
      <span className={cn(hideTextOnMobile && 'hidden sm:inline')}>Save</span>
    </Button>
  );

  return (
    <>
      {trigger}
      {/* Auth prompt rendered locally so the button works standalone — no
          dependency on the parent page mounting the modal. The hook's state
          is component-local, so multiple SavePropertyButtons on the same
          page each carry their own (closed) modal until clicked. */}
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
