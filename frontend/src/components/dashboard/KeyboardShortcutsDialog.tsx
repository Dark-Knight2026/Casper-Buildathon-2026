import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const { keyboardShortcuts } = useDashboardPreferences();

  const renderKey = (key: string) => (
    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
      {key}
    </kbd>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Use these keyboard shortcuts to navigate and perform actions quickly.
          </p>

          <div className="grid gap-3">
            {keyboardShortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <span className="text-sm font-medium">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.ctrl && (
                    <>
                      {renderKey('Ctrl')}
                      <span className="text-gray-400">+</span>
                    </>
                  )}
                  {shortcut.shift && (
                    <>
                      {renderKey('Shift')}
                      <span className="text-gray-400">+</span>
                    </>
                  )}
                  {shortcut.alt && (
                    <>
                      {renderKey('Alt')}
                      <span className="text-gray-400">+</span>
                    </>
                  )}
                  {renderKey(shortcut.key.toUpperCase())}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Command className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Pro Tip
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Press <kbd className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 rounded">K</kbd> anytime to see this list of shortcuts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}