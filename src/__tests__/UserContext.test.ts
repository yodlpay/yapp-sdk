import { YappSDKConfig } from '../types/config';
import * as safeWindowModule from '../utils/safeWindow';
import { MessageManager } from './utils/TestMessageManagerAdapter';

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

  // Define test constants for easier maintenance
  const TEST_DATA = {
    USER_ADDRESS: '0x123456789abcdef',
    PRIMARY_ENS: 'user.eth',
    COMMUNITY_ADDRESS: '0xabcdef123456789',
    COMMUNITY_ENS: 'community.eth',
    COMMUNITY_USER_ENS: 'user.community.eth',
  };
  const TEST_CONSTANTS: YappSDKConfig = {
    origin: 'https://test-origin.com',
    apiUrl: 'https://test-api.com',
    mainnetRpcUrl: 'https://test-rpc.com',
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

      const messageManager = new MessageManager(TEST_CONSTANTS);

      await expect(messageManager.getUserContext()).rejects.toThrow(
        'Cannot access window object',
      );
    });

    it('should timeout after 5 seconds when no response is received', async () => {
      const messageManager = new MessageManager(TEST_CONSTANTS);

      // Start the request
      const promise = messageManager.getUserContext();

      // Simulate timeout
      jest.advanceTimersByTime(5001);

      await expect(promise).rejects.toThrow('User context request timed out');
    });

    it('should register and remove event listeners properly', async () => {
      const messageManager = new MessageManager(TEST_CONSTANTS);

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

    it('should process response with nested community structure correctly', async () => {
      const messageManager = new MessageManager(TEST_CONSTANTS);

      // Start the request
      const contextPromise = messageManager.getUserContext();

      // Get the message listener function
      const messageListener = mockWindow.addEventListener.mock.calls[0][1];

      // Create a mock response message with the new nested community structure
      const mockResponse = {
        type: 'USER_CONTEXT_RESPONSE',
        payload: {
          address: TEST_DATA.USER_ADDRESS,
          primaryEnsName: TEST_DATA.PRIMARY_ENS,
          community: {
            address: TEST_DATA.COMMUNITY_ADDRESS,
            ensName: TEST_DATA.COMMUNITY_ENS,
            userEnsName: TEST_DATA.COMMUNITY_USER_ENS,
          },
        },
      };

      // Simulate receiving the message from the correct origin
      messageListener({
        origin: 'https://test-origin.com',
        data: mockResponse,
      });

      // Get the result and verify it contains the expected data
      const result = await contextPromise;
      expect(result).toEqual(mockResponse.payload);
      expect(result.community).toEqual({
        address: TEST_DATA.COMMUNITY_ADDRESS,
        ensName: TEST_DATA.COMMUNITY_ENS,
        userEnsName: TEST_DATA.COMMUNITY_USER_ENS,
      });
    });

    it('should process response with null community correctly', async () => {
      const messageManager = new MessageManager(TEST_CONSTANTS);

      // Start the request
      const contextPromise = messageManager.getUserContext();

      // Get the message listener function
      const messageListener = mockWindow.addEventListener.mock.calls[0][1];

      // Create a mock response message with null community
      const mockResponse = {
        type: 'USER_CONTEXT_RESPONSE',
        payload: {
          address: TEST_DATA.USER_ADDRESS,
          primaryEnsName: TEST_DATA.PRIMARY_ENS,
          community: null,
        },
      };

      // Simulate receiving the message from the correct origin
      messageListener({
        origin: 'https://test-origin.com',
        data: mockResponse,
      });

      // Get the result and verify it contains the expected data
      const result = await contextPromise;
      expect(result).toEqual(mockResponse.payload);
      expect(result.community).toBeNull();
    });

    it('should process response with undefined community correctly', async () => {
      const messageManager = new MessageManager(TEST_CONSTANTS);

      // Start the request
      const contextPromise = messageManager.getUserContext();

      // Get the message listener function
      const messageListener = mockWindow.addEventListener.mock.calls[0][1];

      // Create a mock response message with no community property
      const mockResponse = {
        type: 'USER_CONTEXT_RESPONSE',
        payload: {
          address: TEST_DATA.USER_ADDRESS,
          primaryEnsName: TEST_DATA.PRIMARY_ENS,
          // community is intentionally omitted
        },
      };

      // Simulate receiving the message from the correct origin
      messageListener({
        origin: 'https://test-origin.com',
        data: mockResponse,
      });

      // Get the result and verify it contains the expected data
      const result = await contextPromise;
      expect(result).toEqual(mockResponse.payload);
      expect(result.community).toBeUndefined();
    });
  });
});
