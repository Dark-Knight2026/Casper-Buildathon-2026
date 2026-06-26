/**
 * Focus management utilities for accessibility
 */

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
    (el) => {
      // Filter out hidden elements
      return (
        el.offsetParent !== null &&
        !el.hasAttribute('hidden') &&
        window.getComputedStyle(el).visibility !== 'hidden'
      );
    }
  );
}

/**
 * Focus the first focusable element in a container
 */
export function focusFirstElement(container: HTMLElement): boolean {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
    return true;
  }
  return false;
}

/**
 * Focus the last focusable element in a container
 */
export function focusLastElement(container: HTMLElement): boolean {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[focusableElements.length - 1].focus();
    return true;
  }
  return false;
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableElements = getFocusableElements(document.body);
  return focusableElements.includes(element);
}

/**
 * Get the next focusable element
 */
export function getNextFocusableElement(
  currentElement: HTMLElement,
  container: HTMLElement = document.body
): HTMLElement | null {
  const focusableElements = getFocusableElements(container);
  const currentIndex = focusableElements.indexOf(currentElement);
  
  if (currentIndex === -1) return null;
  
  const nextIndex = (currentIndex + 1) % focusableElements.length;
  return focusableElements[nextIndex];
}

/**
 * Get the previous focusable element
 */
export function getPreviousFocusableElement(
  currentElement: HTMLElement,
  container: HTMLElement = document.body
): HTMLElement | null {
  const focusableElements = getFocusableElements(container);
  const currentIndex = focusableElements.indexOf(currentElement);
  
  if (currentIndex === -1) return null;
  
  const previousIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length;
  return focusableElements[previousIndex];
}

/**
 * Create a focus trap within a container
 */
export function createFocusTrap(container: HTMLElement): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Restore focus to a previously focused element
 */
export function restoreFocus(element: HTMLElement | null): void {
  if (element && isFocusable(element)) {
    element.focus();
  }
}

/**
 * Save the currently focused element
 */
export function saveFocus(): HTMLElement | null {
  return document.activeElement as HTMLElement;
}