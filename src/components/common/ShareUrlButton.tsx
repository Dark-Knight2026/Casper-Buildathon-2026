import React, { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';

interface ShareUrlButtonProps {
  url?: string;
  title?: string;
  description?: string;
}

/**
 * Button for sharing current URL with state
 * 
 * @example
 * <ShareUrlButton 
 *   title="Share this view"
 *   description="Anyone with this link can see the same filters and sorting"
 * />
 */
export const ShareUrlButton: React.FC<ShareUrlButtonProps> = ({
  url,
  title = 'Share this view',
  description = 'Copy the link to share this exact view',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = url || window.location.href;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-1">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          
          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="text-sm"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              size="sm"
              variant={copied ? 'default' : 'outline'}
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            This link includes your current filters, sorting, and pagination settings.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};