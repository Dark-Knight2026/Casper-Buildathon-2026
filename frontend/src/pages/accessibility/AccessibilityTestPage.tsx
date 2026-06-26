/**
 * Accessibility Test Page
 * Demonstrates accessibility features and provides testing tools
 */

import { useState } from 'react';
import { Keyboard, Eye, Volume2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AccessibilityChecker from '@/components/accessibility/AccessibilityChecker';
import KeyboardShortcutsHelp from '@/components/common/KeyboardShortcutsHelp';
import { getContrastRatio, meetsWCAGAA, WCAG_PRESETS } from '@/utils/colorContrast';

export default function AccessibilityTestPage() {
  const [color1, setColor1] = useState('#2563eb');
  const [color2, setColor2] = useState('#ffffff');
  const [contrastRatio, setContrastRatio] = useState<number | null>(null);
  const [meetsAA, setMeetsAA] = useState<boolean | null>(null);

  const checkContrast = () => {
    try {
      const ratio = getContrastRatio(color1, color2);
      const passes = meetsWCAGAA(color1, color2);
      setContrastRatio(ratio);
      setMeetsAA(passes);
    } catch (error) {
      console.error('Error checking contrast:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Accessibility Testing</h1>
            <p className="text-gray-600 mt-2">
              Test and validate WCAG AA compliance
            </p>
          </div>
          <KeyboardShortcutsHelp />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="checker" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="checker">
              <Eye className="h-4 w-4 mr-2" />
              Checker
            </TabsTrigger>
            <TabsTrigger value="contrast">
              <Palette className="h-4 w-4 mr-2" />
              Contrast
            </TabsTrigger>
            <TabsTrigger value="keyboard">
              <Keyboard className="h-4 w-4 mr-2" />
              Keyboard
            </TabsTrigger>
            <TabsTrigger value="screen-reader">
              <Volume2 className="h-4 w-4 mr-2" />
              Screen Reader
            </TabsTrigger>
          </TabsList>

          {/* Accessibility Checker Tab */}
          <TabsContent value="checker" className="space-y-4">
            <AccessibilityChecker />
          </TabsContent>

          {/* Color Contrast Tab */}
          <TabsContent value="contrast" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Color Contrast Checker</CardTitle>
                <CardDescription>
                  Check if color combinations meet WCAG AA standards (4.5:1 for normal text)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="color1">Foreground Color</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="color1"
                        type="color"
                        value={color1}
                        onChange={(e) => setColor1(e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={color1}
                        onChange={(e) => setColor1(e.target.value)}
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="color2">Background Color</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="color2"
                        type="color"
                        value={color2}
                        onChange={(e) => setColor2(e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={color2}
                        onChange={(e) => setColor2(e.target.value)}
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={checkContrast}>Check Contrast</Button>

                {contrastRatio !== null && (
                  <div className="space-y-4">
                    <div
                      className="p-8 rounded-lg text-center"
                      style={{ backgroundColor: color2, color: color1 }}
                    >
                      <p className="text-2xl font-bold">Sample Text</p>
                      <p className="text-sm mt-2">This is how your text will look</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Contrast Ratio</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold">
                            {contrastRatio.toFixed(2)}:1
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">WCAG AA</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p
                            className={`text-3xl font-bold ${
                              meetsAA ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {meetsAA ? 'Pass' : 'Fail'}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Preset Colors */}
                <div>
                  <h3 className="font-semibold mb-3">WCAG AA Compliant Presets</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(WCAG_PRESETS).map(([name, preset]) => (
                      <button
                        key={name}
                        onClick={() => {
                          setColor1(preset.foreground);
                          setColor2(preset.background);
                        }}
                        className="p-4 rounded-lg border hover:border-blue-500 transition-colors"
                        style={{
                          backgroundColor: preset.background,
                          color: preset.foreground,
                        }}
                      >
                        <p className="font-medium text-sm">
                          {name.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-xs mt-1">{preset.ratio.toFixed(1)}:1</p>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keyboard Navigation Tab */}
          <TabsContent value="keyboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Keyboard Navigation Guide</CardTitle>
                <CardDescription>
                  All functionality should be accessible via keyboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Basic Navigation</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 border rounded">Tab</kbd>
                        <span>Move focus forward</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 border rounded">Shift</kbd>
                        <span>+</span>
                        <kbd className="px-2 py-1 bg-gray-100 border rounded">Tab</kbd>
                        <span>Move focus backward</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 border rounded">Enter</kbd>
                        <span>Activate button or submit form</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 border rounded">Space</kbd>
                        <span>Toggle checkbox or activate button</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 border rounded">Escape</kbd>
                        <span>Close modal or cancel action</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Arrow Keys</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 border rounded">↑ ↓</kbd>
                        <span>Navigate vertical lists and menus</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 border rounded">← →</kbd>
                        <span>Navigate horizontal lists and tabs</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 border rounded">Home</kbd>
                        <span>Jump to first item</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 border rounded">End</kbd>
                        <span>Jump to last item</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Application Shortcuts</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 border rounded">/</kbd>
                        <span>Focus search input</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 border rounded">?</kbd>
                        <span>Show keyboard shortcuts help</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Testing Tips</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Unplug your mouse and navigate using only keyboard</li>
                    <li>Verify all interactive elements can be reached</li>
                    <li>Check that focus indicators are visible</li>
                    <li>Ensure focus order is logical</li>
                    <li>Test that modals trap focus correctly</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Screen Reader Tab */}
          <TabsContent value="screen-reader" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Screen Reader Testing</CardTitle>
                <CardDescription>
                  Ensure content is accessible to screen reader users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Screen Readers</h3>
                    <ul className="space-y-2 text-sm">
                      <li>
                        <strong>NVDA (Windows):</strong> Free and open source
                      </li>
                      <li>
                        <strong>JAWS (Windows):</strong> Industry standard, paid
                      </li>
                      <li>
                        <strong>VoiceOver (macOS/iOS):</strong> Built-in, press Cmd+F5
                      </li>
                      <li>
                        <strong>TalkBack (Android):</strong> Built-in accessibility service
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">What to Test</h3>
                    <ul className="space-y-2 text-sm list-disc list-inside">
                      <li>All text content is read aloud</li>
                      <li>Images have descriptive alt text</li>
                      <li>Form labels are associated with inputs</li>
                      <li>Error messages are announced</li>
                      <li>Loading states are communicated</li>
                      <li>Modal titles and descriptions are read</li>
                      <li>Table headers are associated with data</li>
                      <li>Navigation landmarks are identified</li>
                      <li>Page titles are descriptive</li>
                      <li>Language is identified</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">ARIA Attributes</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <code className="px-2 py-1 bg-gray-100 rounded">aria-label</code> -
                        Provides accessible name
                      </p>
                      <p>
                        <code className="px-2 py-1 bg-gray-100 rounded">aria-describedby</code> -
                        References description
                      </p>
                      <p>
                        <code className="px-2 py-1 bg-gray-100 rounded">aria-live</code> -
                        Announces dynamic content
                      </p>
                      <p>
                        <code className="px-2 py-1 bg-gray-100 rounded">role</code> -
                        Defines element purpose
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Best Practices</h4>
                  <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                    <li>Use semantic HTML elements</li>
                    <li>Provide text alternatives for non-text content</li>
                    <li>Ensure proper heading hierarchy</li>
                    <li>Use ARIA attributes appropriately</li>
                    <li>Test with actual screen readers</li>
                    <li>Keep content structure logical</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}