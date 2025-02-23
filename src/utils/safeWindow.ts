/**
 * Returns the window object if in browser environment, null otherwise
 * @returns window object or null in SSR
 */
export const getSafeWindow = (): Window | null => {
  if (!isBrowser()) {
    return null;
  }
  return window;
};

/**
 * Checks if code is running in a browser environment
 * @returns true if in browser, false if in SSR
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};
