import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SavePropertyButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  /** When true renders as an icon-only round button (for card overlays) */
  iconOnly?: boolean;
}

export function SavePropertyButton({
  variant = 'outline',
  size = 'default',
  className,
  iconOnly = false,
}: SavePropertyButtonProps) {
  const { toast } = useToast();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: 'Sign in or create an account',
      description: 'You need to register to save properties.',
    });
  };

  if (iconOnly) {
    return (
      <button
        className={cn('bg-card/90 hover:bg-card p-2 rounded-full shadow', className)}
        onClick={handleClick}
        aria-label="Save property"
      >
        <Heart className="h-4 w-4 text-gray-500" />
      </button>
    );
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={handleClick}>
      <Heart className="h-4 w-4 mr-2" />
      Save
    </Button>
  );
}
