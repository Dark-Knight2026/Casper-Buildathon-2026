/**
 * Storage utilities for the CSPR.click SDK.
 *
 * The SDK persists its session state under localStorage keys prefixed with
 * `csprclick:` (e.g. `csprclick:account`). Several auth-recovery code paths
 * need to wipe those keys to break out of the "Session expired" loop when
 * the iframe session at accounts.cspr.click has died but the cached entries
 * keep convincing the SDK to retry. Centralised here so a future prefix
 * change or additional key only has to be updated in one place.
 */

const CSPRCLICK_KEY_PREFIX = 'csprclick:';

/**
 * Remove every localStorage entry whose key starts with `csprclick:`.
 *
 * Silently no-ops if `localStorage` access throws (private-mode browsers,
 * embedded webviews) — recovery should not fail because storage is
 * unavailable; the SDK will re-init from scratch on the next mount anyway.
 */
export function clearCsprClickStorage(): void {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CSPRCLICK_KEY_PREFIX)) localStorage.removeItem(key);
    });
  } catch {
    // localStorage may be unavailable (private mode, embedded webview).
  }
}
