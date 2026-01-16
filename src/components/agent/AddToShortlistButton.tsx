import { useState } from 'react';
import { FolderPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/use-toast';

interface AddToShortlistButtonProps {
  agentId: string;
  agentName: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export default function AddToShortlistButton({
  agentId,
  agentName,
  variant = 'outline',
  size = 'sm',
}: AddToShortlistButtonProps) {
  const { shortlists, addToShortlist, removeFromShortlist, isInShortlist } = useFavorites();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleToggle = (shortlistId: string, shortlistName: string) => {
    const inList = isInShortlist(shortlistId, agentId);
    
    if (inList) {
      removeFromShortlist(shortlistId, agentId);
      toast({
        title: 'Removed from Shortlist',
        description: `${agentName} removed from "${shortlistName}".`,
      });
    } else {
      addToShortlist(shortlistId, agentId);
      toast({
        title: 'Added to Shortlist',
        description: `${agentName} added to "${shortlistName}".`,
      });
    }
  };

  if (shortlists.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <FolderPlus className="h-4 w-4 mr-2" />
          Add to List
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Add to Shortlist</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {shortlists.map((list) => {
          const inList = isInShortlist(list.id, agentId);
          return (
            <DropdownMenuItem
              key={list.id}
              onClick={() => handleToggle(list.id, list.name)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{list.name}</span>
              {inList && <Check className="h-4 w-4 text-green-600" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}