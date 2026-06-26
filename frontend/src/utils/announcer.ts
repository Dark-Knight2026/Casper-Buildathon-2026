/**
 * Screen reader announcement utilities
 */

let announcerElement: HTMLDivElement | null = null;

/**
 * Initialize the announcer element
 */
function initializeAnnouncer(): HTMLDivElement {
  if (announcerElement) return announcerElement;

  announcerElement = document.createElement('div');
  announcerElement.setAttribute('role', 'status');
  announcerElement.setAttribute('aria-live', 'polite');
  announcerElement.setAttribute('aria-atomic', 'true');
  announcerElement.className = 'sr-only';
  announcerElement.style.position = 'absolute';
  announcerElement.style.left = '-10000px';
  announcerElement.style.width = '1px';
  announcerElement.style.height = '1px';
  announcerElement.style.overflow = 'hidden';

  document.body.appendChild(announcerElement);

  return announcerElement;
}

/**
 * Announce a message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcer = initializeAnnouncer();
  
  // Clear previous message
  announcer.textContent = '';
  
  // Update aria-live attribute
  announcer.setAttribute('aria-live', priority);
  
  // Set new message after a brief delay to ensure screen readers pick it up
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
}

/**
 * Announce a route change
 */
export function announceRouteChange(pageName: string): void {
  announce(`Navigated to ${pageName}`, 'polite');
}

/**
 * Announce form errors
 */
export function announceFormError(errors: string[]): void {
  if (errors.length === 0) return;
  
  const message = errors.length === 1
    ? `Error: ${errors[0]}`
    : `${errors.length} errors found: ${errors.join(', ')}`;
  
  announce(message, 'assertive');
}

/**
 * Announce success message
 */
export function announceSuccess(message: string): void {
  announce(`Success: ${message}`, 'polite');
}

/**
 * Announce loading state
 */
export function announceLoading(message: string = 'Loading'): void {
  announce(message, 'polite');
}

/**
 * Announce completion
 */
export function announceComplete(message: string = 'Complete'): void {
  announce(message, 'polite');
}

/**
 * Clear announcements
 */
export function clearAnnouncements(): void {
  if (announcerElement) {
    announcerElement.textContent = '';
  }
}

/**
 * Cleanup announcer element
 */
export function cleanupAnnouncer(): void {
  if (announcerElement && announcerElement.parentNode) {
    announcerElement.parentNode.removeChild(announcerElement);
    announcerElement = null;
  }
}