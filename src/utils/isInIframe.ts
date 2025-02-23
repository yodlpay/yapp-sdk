import { getSafeWindow } from './safeWindow';

/**
 * Checks if the current code is running inside an iframe
 * @returns {boolean} True if running in an iframe, false otherwise
 */
export function isInIframe(): boolean {
  // Use getSafeWindow to check if in a browser environment
  const win = getSafeWindow();
  if (win === null) {
    return false;
  }

  try {
    return win.self !== win.top;
  } catch (e) {
    // If we can't access window.top due to same-origin policy,
    // we're definitely in a cross-origin iframe
    return true;
  }
}
