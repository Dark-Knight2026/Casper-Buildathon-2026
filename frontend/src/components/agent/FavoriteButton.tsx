import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/use-toast';

interface FavoriteButtonProps {
  agentId: string;
  agentName: string;
  variant?: 'default' | 'icon-only';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export default function FavoriteButton({ 
  agentId, 
  agentName, 
  variant = 'default',
  size = 'default' 
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const favorite = isFavorite(agentId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(agentId);
    
    toast({
      title: favorite ? 'Removed from Favorites' : 'Added to Favorites',
      description: favorite 
        ? `${agentName} has been removed from your favorites.`
        : `${agentName} has been added to your favorites.`,
    });
  };

  if (variant === 'icon-only') {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={handleClick}
        className={`${favorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'} transition-colors`}
      >
        <Heart className={`h-5 w-5 ${favorite ? 'fill-current' : ''}`} />
      </Button>
    );
  }

  return (
    <Button
      variant={favorite ? 'default' : 'outline'}
      size={size}
      onClick={handleClick}
      className={favorite ? 'bg-red-500 hover:bg-red-600' : ''}
    >
      <Heart className={`h-4 w-4 mr-2 ${favorite ? 'fill-current' : ''}`} />
      {favorite ? 'Favorited' : 'Add to Favorites'}
    </Button>
  );
}