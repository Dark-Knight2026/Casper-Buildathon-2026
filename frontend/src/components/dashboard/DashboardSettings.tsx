import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { Settings, Sun, Moon, Monitor, Keyboard, Zap, RotateCcw, Move, FileJson, Sparkles } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import AdvancedWidgetLayoutEditor from './AdvancedWidgetLayoutEditor';
import DashboardTemplates from './DashboardTemplates';
import DashboardExportImport from './DashboardExportImport';

interface DashboardSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DashboardSettings({ open, onOpenChange }: DashboardSettingsProps) {
  const {
    preferences,
    updateTheme,
    toggleKeyboardShortcuts,
    resetOnboarding,
    toggleCompactMode,
    toggleAnimations,
    resetToDefaults
  } = useDashboardPreferences();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <DialogTitle>Dashboard Settings</DialogTitle>
          </div>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="appearance">
              <Sun className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="layout">
              <Move className="h-4 w-4 mr-2" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Sparkles className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="export-import">
              <FileJson className="h-4 w-4 mr-2" />
              Export/Import
            </TabsTrigger>
            <TabsTrigger value="shortcuts">
              <Keyboard className="h-4 w-4 mr-2" />
              Shortcuts
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Zap className="h-4 w-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Theme</h3>
              <RadioGroup
                value={preferences.theme}
                onValueChange={(value) => updateTheme(value as 'light' | 'dark' | 'system')}
              >
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <RadioGroupItem value="light" id="light" className="peer sr-only" />
                    <Label
                      htmlFor="light"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-blue-600 cursor-pointer"
                    >
                      <Sun className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">Light</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                    <Label
                      htmlFor="dark"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-blue-600 cursor-pointer dark:bg-gray-800 dark:border-gray-700"
                    >
                      <Moon className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">Dark</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="system" id="system" className="peer sr-only" />
                    <Label
                      htmlFor="system"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-blue-600 cursor-pointer"
                    >
                      <Monitor className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">System</span>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="compact-mode">Compact Mode</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Reduce spacing and padding for a denser layout
                  </p>
                </div>
                <Switch
                  id="compact-mode"
                  checked={preferences.compactMode}
                  onCheckedChange={toggleCompactMode}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="animations">Enable Animations</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show smooth transitions and animations
                  </p>
                </div>
                <Switch
                  id="animations"
                  checked={preferences.animationsEnabled}
                  onCheckedChange={toggleAnimations}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-6 mt-6">
            <AdvancedWidgetLayoutEditor onSave={() => {
              // Optional: could close dialog or show success message
            }} />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6 mt-6">
            <DashboardTemplates onApplyTemplate={() => {
              // Optional: could close dialog after applying template
            }} />
          </TabsContent>

          <TabsContent value="export-import" className="space-y-6 mt-6">
            <DashboardExportImport />
          </TabsContent>

          <TabsContent value="shortcuts" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="keyboard-shortcuts">Enable Keyboard Shortcuts</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Use keyboard shortcuts for quick navigation
                </p>
              </div>
              <Switch
                id="keyboard-shortcuts"
                checked={preferences.keyboardShortcutsEnabled}
                onCheckedChange={toggleKeyboardShortcuts}
              />
            </div>

            {preferences.keyboardShortcutsEnabled && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Press <kbd className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-800 rounded">Ctrl</kbd> + <kbd className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-800 rounded">K</kbd> to view all available shortcuts
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Onboarding</h3>
              <Button
                variant="outline"
                onClick={resetOnboarding}
              >
                Restart Onboarding Tour
              </Button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Show the welcome tour again to learn about dashboard features
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Reset Settings</h3>
              <Button
                variant="destructive"
                onClick={resetToDefaults}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Reset all dashboard settings to their default values
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}