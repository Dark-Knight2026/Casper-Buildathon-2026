import React, { useState } from 'react';
import { Keyboard, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getKeyboardShortcuts, formatShortcut, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

interface KeyboardShortcutsModalProps {
  trigger?: React.ReactNode;
}

/**
 * Modal displaying all available keyboard shortcuts
 * 
 * @example
 * <KeyboardShortcutsModal />
 * 
 * @example
 * <KeyboardShortcutsModal 
 *   trigger={<Button>Shortcuts</Button>}
 * />
 */
export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  trigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const shortcuts = getKeyboardShortcuts();

  const filteredShortcuts = shortcuts.filter(
    (shortcut) =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.keys.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryLabels = {
    general: 'General',
    navigation: 'Navigation',
    actions: 'Actions',
    editing: 'Editing',
  };

  const categoryOrder: Array<keyof typeof categoryLabels> = ['general', 'navigation', 'actions', 'editing'];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Keyboard className="h-4 w-4 mr-2" />
            Keyboard Shortcuts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and perform actions quickly
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Shortcuts by Category */}
          {categoryOrder.map((category) => {
            const categoryShortcuts = groupedShortcuts[category];
            if (!categoryShortcuts || categoryShortcuts.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  {categoryLabels[category]}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{shortcut.description}</span>
                        {shortcut.global && (
                          <Badge variant="secondary" className="text-xs">
                            Global
                          </Badge>
                        )}
                      </div>
                      <kbd className="flex items-center gap-1 px-2 py-1 text-xs font-mono bg-muted rounded border">
                        {formatShortcut(shortcut.keys)}
                      </kbd>
                    </div>
                  ))}
                </div>
                {category !== 'editing' && <Separator />}
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              No shortcuts found matching "{searchQuery}"
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Press{' '}
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border">
              {formatShortcut('mod+/')}
            </kbd>{' '}
            to open this dialog anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Keyboard shortcut indicator component
 */
interface ShortcutIndicatorProps {
  keys: string;
  className?: string;
}

export const ShortcutIndicator: React.FC<ShortcutIndicatorProps> = ({
  keys,
  className,
}) => {
  return (
    <kbd
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1',
        'text-xs font-mono',
        'bg-muted rounded border',
        'text-muted-foreground',
        className
      )}
    >
      {formatShortcut(keys)}
    </kbd>
  );
};