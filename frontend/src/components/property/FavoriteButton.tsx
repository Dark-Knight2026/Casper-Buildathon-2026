import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { propertyActionsService } from '@/services/propertyActionsService';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FavoriteButtonProps {
  propertyId: string;
  initialFavorited?: boolean;
  onToggle?: (isFavorited: boolean) => void;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function FavoriteButton({
  propertyId,
  initialFavorited = false,
  onToggle,
  className,
  variant = 'ghost',
  size = 'icon',
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const { requireAuth } = useAuthPrompt();
  const { toast } = useToast();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if property is favorited on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user) {
        setCheckingStatus(false);
        return;
      }

      try {
        const favorited = await propertyActionsService.checkIfFavorited(user.id, propertyId);
        setIsFavorited(favorited);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkFavoriteStatus();
  }, [user, propertyId]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event

    // If user is not authenticated, show auth prompt
    const canProceed = requireAuth({
      action: 'save favorite',
      redirectPath: `/properties/${propertyId}`,
    });

    if (!canProceed || !user) {
      return;
    }

    setLoading(true);
    try {
      if (isFavorited) {
        // Remove from favorites
        await propertyActionsService.removeFromFavorites(user.id, propertyId);
        setIsFavorited(false);
        toast({
          title: 'Removed from favorites',
          description: 'Property removed from your saved list.',
        });
        onToggle?.(false);
      } else {
        // Add to favorites
        await propertyActionsService.addToFavorites(user.id, propertyId);
        setIsFavorited(true);
        toast({
          title: 'Added to favorites',
          description: 'Property saved to your favorites.',
        });
        onToggle?.(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update favorites';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      disabled={loading || checkingStatus}
      className={cn(
        'transition-all duration-200',
        isFavorited && 'text-red-500 hover:text-red-600',
        className
      )}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={cn(
          'h-5 w-5 transition-all',
          isFavorited && 'fill-current'
        )}
      />
      {size !== 'icon' && (
        <span className="ml-2">
          {isFavorited ? 'Saved' : 'Save'}
        </span>
      )}
    </Button>
  );
}

export default FavoriteButton;