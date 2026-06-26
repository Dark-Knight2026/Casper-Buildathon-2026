import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { clearCsprClickStorage } from '@/lib/csprclick';

describe('clearCsprClickStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes every csprclick:-prefixed key', () => {
    localStorage.setItem('csprclick:account', 'a');
    localStorage.setItem('csprclick:session', 'b');
    localStorage.setItem('csprclick:provider', 'c');

    clearCsprClickStorage();

    expect(localStorage.getItem('csprclick:account')).toBeNull();
    expect(localStorage.getItem('csprclick:session')).toBeNull();
    expect(localStorage.getItem('csprclick:provider')).toBeNull();
  });

  it('leaves unrelated keys intact', () => {
    localStorage.setItem('csprclick:account', 'a');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('auth_token', 'xyz');
    // A key that merely contains, but does not start with, the prefix.
    localStorage.setItem('x-csprclick:account', 'keep');

    clearCsprClickStorage();

    expect(localStorage.getItem('csprclick:account')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('auth_token')).toBe('xyz');
    expect(localStorage.getItem('x-csprclick:account')).toBe('keep');
  });

  it('does not throw when there are no csprclick: keys', () => {
    localStorage.setItem('theme', 'dark');

    expect(() => clearCsprClickStorage()).not.toThrow();
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  describe('when localStorage access throws', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('swallows the error (private-mode / embedded webview)', () => {
      localStorage.setItem('csprclick:account', 'a');
      // removeItem can throw in locked-down webviews; the helper must not blow up.
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('localStorage is not available');
      });

      expect(() => clearCsprClickStorage()).not.toThrow();
    });
  });
});
