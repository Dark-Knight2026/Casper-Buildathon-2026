/**
 * Color contrast utilities for WCAG AA compliance
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format. Use hex format (#RRGGBB)');
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 3 : 4.5;
  return ratio >= requiredRatio;
}

/**
 * Check if color combination meets WCAG AAA standards
 */
export function meetsWCAGAAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 4.5 : 7;
  return ratio >= requiredRatio;
}

/**
 * Get WCAG compliance level
 */
export function getWCAGLevel(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): 'AAA' | 'AA' | 'Fail' {
  if (meetsWCAGAAA(foreground, background, isLargeText)) {
    return 'AAA';
  }
  if (meetsWCAGAA(foreground, background, isLargeText)) {
    return 'AA';
  }
  return 'Fail';
}

/**
 * Suggest an accessible color by adjusting lightness
 */
export function suggestAccessibleColor(
  baseColor: string,
  backgroundColor: string,
  isLargeText: boolean = false
): string {
  const requiredRatio = isLargeText ? 3 : 4.5;
  const rgb = hexToRgb(baseColor);
  const bgRgb = hexToRgb(backgroundColor);

  if (!rgb || !bgRgb) {
    throw new Error('Invalid color format');
  }

  const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  // Try darkening first
  for (let factor = 1; factor >= 0; factor -= 0.05) {
    const adjustedR = Math.round(rgb.r * factor);
    const adjustedG = Math.round(rgb.g * factor);
    const adjustedB = Math.round(rgb.b * factor);
    const adjustedLum = getLuminance(adjustedR, adjustedG, adjustedB);

    const ratio =
      bgLum > adjustedLum
        ? (bgLum + 0.05) / (adjustedLum + 0.05)
        : (adjustedLum + 0.05) / (bgLum + 0.05);

    if (ratio >= requiredRatio) {
      return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG
        .toString(16)
        .padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
    }
  }

  // Try lightening
  for (let factor = 1; factor <= 2; factor += 0.05) {
    const adjustedR = Math.min(255, Math.round(rgb.r * factor));
    const adjustedG = Math.min(255, Math.round(rgb.g * factor));
    const adjustedB = Math.min(255, Math.round(rgb.b * factor));
    const adjustedLum = getLuminance(adjustedR, adjustedG, adjustedB);

    const ratio =
      bgLum > adjustedLum
        ? (bgLum + 0.05) / (adjustedLum + 0.05)
        : (adjustedLum + 0.05) / (bgLum + 0.05);

    if (ratio >= requiredRatio) {
      return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG
        .toString(16)
        .padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
    }
  }

  // If no accessible color found, return black or white based on background
  return bgLum > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Check if a color is light or dark
 */
export function isLightColor(color: string): boolean {
  const rgb = hexToRgb(color);
  if (!rgb) return false;
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5;
}

/**
 * Get contrasting text color (black or white) for a background
 */
export function getContrastingTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#ffffff';
}

/**
 * Validate color palette for accessibility
 */
export function validateColorPalette(palette: {
  [key: string]: string;
}): { [key: string]: { color: string; accessible: boolean; ratio: number } } {
  const results: {
    [key: string]: { color: string; accessible: boolean; ratio: number };
  } = {};

  const background = palette.background || '#ffffff';

  for (const [key, color] of Object.entries(palette)) {
    if (key === 'background') continue;

    const ratio = getContrastRatio(color, background);
    const accessible = ratio >= 4.5;

    results[key] = {
      color,
      accessible,
      ratio: Math.round(ratio * 100) / 100,
    };
  }

  return results;
}

/**
 * WCAG color contrast presets
 */
export const WCAG_PRESETS = {
  // High contrast pairs
  blackOnWhite: { foreground: '#000000', background: '#ffffff', ratio: 21 },
  whiteOnBlack: { foreground: '#ffffff', background: '#000000', ratio: 21 },

  // Common accessible pairs (AA compliant)
  darkGrayOnWhite: { foreground: '#333333', background: '#ffffff', ratio: 12.63 },
  whiteOnDarkBlue: { foreground: '#ffffff', background: '#1e40af', ratio: 8.59 },
  whiteOnGreen: { foreground: '#ffffff', background: '#16a34a', ratio: 4.54 },
  whiteOnRed: { foreground: '#ffffff', background: '#dc2626', ratio: 5.9 },

  // Text on colored backgrounds
  darkTextOnLightBlue: { foreground: '#1e40af', background: '#dbeafe', ratio: 7.26 },
  darkTextOnLightGreen: { foreground: '#166534', background: '#dcfce7', ratio: 7.73 },
  darkTextOnLightYellow: { foreground: '#92400e', background: '#fef3c7', ratio: 8.32 },
  darkTextOnLightRed: { foreground: '#991b1b', background: '#fee2e2', ratio: 8.59 },
};