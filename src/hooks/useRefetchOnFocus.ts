import { useEffect, useRef } from 'react';

/**
 * Calls `onFocus` whenever the tab regains focus or becomes visible again.
 *
 * Used to silently re-fetch data the user may have changed in another tab —
 * e.g. confirming an email-verification / email-change link that the mail
 * client opened in a new tab. When the user switches back to the profile tab,
 * this fires so the page reflects the new server state without a manual reload.
 *
 * The listener is bound once; the latest callback is read through a ref so
 * re-renders don't re-bind. `focus` and `visibilitychange` can both fire for a
 * single tab switch, so bursts within 500ms are coalesced to one call.
 */
export function useRefetchOnFocus(onFocus: () => void): void {
  const callbackRef = useRef(onFocus);
  callbackRef.current = onFocus;

  useEffect(() => {
    let lastRun = 0;
    const run = () => {
      if (document.visibilityState !== 'visible') return;
      const now = performance.now();
      if (now - lastRun < 500) return;
      lastRun = now;
      callbackRef.current();
    };
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', run);
    return () => {
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, []);
}
