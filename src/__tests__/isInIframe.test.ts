import { isInIframe } from '../utils/isInIframe';

describe('isInIframe', () => {
  const originalWindow = { ...window };

  afterEach(() => {
    // Restore the original window object after each test
    Object.defineProperty(window, 'self', {
      value: originalWindow.self,
      writable: true
    });
    Object.defineProperty(window, 'top', {
      value: originalWindow.top,
      writable: true
    });
  });

  it('should return false when not in an iframe', () => {
    // Set window.self and window.top to be the same
    Object.defineProperty(window, 'self', {
      value: window,
      writable: true
    });
    Object.defineProperty(window, 'top', {
      value: window,
      writable: true
    });

    expect(isInIframe()).toBe(false);
  });

  it('should return true when in an iframe', () => {
    // Make window.self and window.top different
    Object.defineProperty(window, 'self', {
      value: {},
      writable: true
    });
    Object.defineProperty(window, 'top', {
      value: { different: true },
      writable: true
    });

    expect(isInIframe()).toBe(true);
  });

  it('should return true when access to window.top throws error', () => {
    // Simulate cross-origin error by making window.top throw
    Object.defineProperty(window, 'top', {
      get: () => {
        throw new Error('Security Error');
      }
    });

    expect(isInIframe()).toBe(true);
  });
});
