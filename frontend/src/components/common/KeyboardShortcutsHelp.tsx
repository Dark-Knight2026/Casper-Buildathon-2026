import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation
  { keys: ['Tab'], description: 'Navigate forward', category: 'Navigation' },
  { keys: ['Shift', 'Tab'], description: 'Navigate backward', category: 'Navigation' },
  { keys: ['/'], description: 'Focus search', category: 'Navigation' },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Navigation' },
  
  // Actions
  { keys: ['Enter'], description: 'Submit form / Activate button', category: 'Actions' },
  { keys: ['Space'], description: 'Toggle checkbox / Activate button', category: 'Actions' },
  { keys: ['Escape'], description: 'Close modal / Cancel action', category: 'Actions' },
  
  // Lists and Menus
  { keys: ['↑'], description: 'Navigate up in list/menu', category: 'Lists & Menus' },
  { keys: ['↓'], description: 'Navigate down in list/menu', category: 'Lists & Menus' },
  { keys: ['←'], description: 'Navigate left in horizontal list', category: 'Lists & Menus' },
  { keys: ['→'], description: 'Navigate right in horizontal list', category: 'Lists & Menus' },
  { keys: ['Home'], description: 'Go to first item', category: 'Lists & Menus' },
  { keys: ['End'], description: 'Go to last item', category: 'Lists & Menus' },
];

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useKeyboardNavigation({
    shortcuts: [
      {
        key: '?',
        shiftKey: true,
        handler: () => setIsOpen(true),
        description: 'Show keyboard shortcuts help',
      },
    ],
  });

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="h-5 w-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Use these keyboard shortcuts to navigate and interact with the application
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3">{category}</h3>
                <div className="space-y-2">
                  {shortcuts
                    .filter((s) => s.category === category)
                    .map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <span className="text-sm text-gray-700">
                          {shortcut.description}
                        </span>
                        <div className="flex gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <kbd
                              key={keyIndex}
                              className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}