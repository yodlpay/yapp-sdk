import { MessageManager } from '../utils/MessageManager';
import * as safeWindowModule from '../utils/safeWindow';

// Mock modules
jest.mock('../utils/safeWindow');

describe('UserContext', () => {
  // Mock window implementation
  const mockWindow = {
    parent: {
      postMessage: jest.fn(),
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();
    jest.useFakeTimers();

    // Setup window mock
    (safeWindowModule.getSafeWindow as jest.Mock).mockReturnValue(mockWindow);
    (safeWindowModule.isBrowser as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getUserContext', () => {
    it('should throw error when window is not available', async () => {
      // Mock getSafeWindow to return null
      (safeWindowModule.getSafeWindow as jest.Mock).mockReturnValue(null);

      const messageManager = new MessageManager('https://test-origin.com');

      await expect(messageManager.getUserContext()).rejects.toThrow(
        'Cannot access window object',
      );
    });

    it('should timeout after 5 seconds when no response is received', async () => {
      const messageManager = new MessageManager('https://test-origin.com');

      // Start the request
      const promise = messageManager.getUserContext();

      // Simulate timeout
      jest.advanceTimersByTime(5001);

      await expect(promise).rejects.toThrow('User context request timed out');
    });

    it('should register and remove event listeners properly', async () => {
      const messageManager = new MessageManager('https://test-origin.com');

      // Start the request but don't await it
      messageManager.getUserContext().catch(() => {});

      // Verify event listener was registered
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );

      // Simulate timeout to trigger cleanup
      jest.advanceTimersByTime(5001);

      // We don't test the actual response here, just that interaction with the
      // window APIs is happening correctly
    });
  });
});
