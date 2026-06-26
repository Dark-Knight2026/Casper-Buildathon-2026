/**
 * Accessibility Checker Component
 * Provides tools for testing and validating accessibility compliance
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getContrastRatio, meetsWCAGAA, getWCAGLevel } from '@/utils/colorContrast';

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
  wcagLevel?: string;
}

export default function AccessibilityChecker() {
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const runAccessibilityCheck = () => {
    setIsChecking(true);
    const foundIssues: AccessibilityIssue[] = [];

    // Check for images without alt text
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        foundIssues.push({
          type: 'error',
          message: `Image ${index + 1} missing alt text`,
          element: img.src,
          wcagLevel: 'A',
        });
      }
    });

    // Check for buttons without accessible names
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const hasText = button.textContent?.trim();
      const hasAriaLabel = button.getAttribute('aria-label');
      const hasAriaLabelledBy = button.getAttribute('aria-labelledby');

      if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
        foundIssues.push({
          type: 'error',
          message: `Button ${index + 1} missing accessible name`,
          wcagLevel: 'A',
        });
      }
    });

    // Check for form inputs without labels
    const inputs = document.querySelectorAll('input:not([type="hidden"])');
    inputs.forEach((input, index) => {
      const hasLabel = input.id && document.querySelector(`label[for="${input.id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledBy = input.getAttribute('aria-labelledby');

      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
        foundIssues.push({
          type: 'error',
          message: `Input ${index + 1} missing label`,
          wcagLevel: 'A',
        });
      }
    });

    // Check for links without href
    const links = document.querySelectorAll('a');
    links.forEach((link, index) => {
      if (!link.href || link.href === '#') {
        foundIssues.push({
          type: 'warning',
          message: `Link ${index + 1} missing valid href`,
          wcagLevel: 'A',
        });
      }
    });

    // Check for headings hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.substring(1));
      if (level - previousLevel > 1) {
        foundIssues.push({
          type: 'warning',
          message: `Heading level skipped from h${previousLevel} to h${level}`,
          wcagLevel: 'A',
        });
      }
      previousLevel = level;
    });

    // Check for color contrast (sample check)
    const textElements = document.querySelectorAll('p, span, div, button, a');
    const checkedColors = new Set<string>();
    
    textElements.forEach((element) => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      const colorKey = `${color}-${backgroundColor}`;

      if (!checkedColors.has(colorKey) && color && backgroundColor) {
        checkedColors.add(colorKey);
        
        try {
          // Convert RGB to hex for contrast checking
          const rgbToHex = (rgb: string) => {
            const match = rgb.match(/\d+/g);
            if (!match) return null;
            const [r, g, b] = match.map(Number);
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          };

          const hexColor = rgbToHex(color);
          const hexBg = rgbToHex(backgroundColor);

          if (hexColor && hexBg && hexColor !== hexBg) {
            const ratio = getContrastRatio(hexColor, hexBg);
            if (ratio < 4.5) {
              foundIssues.push({
                type: 'error',
                message: `Low color contrast: ${ratio.toFixed(2)}:1 (minimum 4.5:1)`,
                element: `${hexColor} on ${hexBg}`,
                wcagLevel: 'AA',
              });
            }
          }
        } catch (error) {
          // Skip invalid colors
        }
      }
    });

    // Add success message if no issues found
    if (foundIssues.length === 0) {
      foundIssues.push({
        type: 'info',
        message: 'No accessibility issues found in current view',
      });
    }

    setIssues(foundIssues);
    setIsChecking(false);
  };

  const getIssueIcon = (type: AccessibilityIssue['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const getIssueColor = (type: AccessibilityIssue['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-green-50 border-green-200';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Accessibility Checker</CardTitle>
        <CardDescription>
          Check the current page for WCAG AA compliance issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runAccessibilityCheck} disabled={isChecking}>
          {isChecking ? 'Checking...' : 'Run Accessibility Check'}
        </Button>

        {issues.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold">
                Found {issues.length} issue{issues.length !== 1 ? 's' : ''}
              </h3>
              <div className="flex gap-2">
                <Badge variant="destructive">
                  {issues.filter((i) => i.type === 'error').length} Errors
                </Badge>
                <Badge variant="outline" className="bg-yellow-100">
                  {issues.filter((i) => i.type === 'warning').length} Warnings
                </Badge>
                <Badge variant="outline" className="bg-green-100">
                  {issues.filter((i) => i.type === 'info').length} Info
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getIssueColor(issue.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1">
                      <p className="font-medium">{issue.message}</p>
                      {issue.element && (
                        <p className="text-sm text-gray-600 mt-1">
                          Element: {issue.element}
                        </p>
                      )}
                      {issue.wcagLevel && (
                        <Badge variant="outline" className="mt-2">
                          WCAG {issue.wcagLevel}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">
                Accessibility Testing Tips
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Use keyboard only (Tab, Enter, Escape, Arrow keys)</li>
                <li>Test with screen reader (NVDA, JAWS, VoiceOver)</li>
                <li>Check color contrast with browser DevTools</li>
                <li>Zoom to 200% and verify readability</li>
                <li>Test with high contrast mode enabled</li>
                <li>Verify all interactive elements are focusable</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}