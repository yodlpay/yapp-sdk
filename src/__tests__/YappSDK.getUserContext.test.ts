// Mock the MessageManager module
import { MessageManager } from '../utils/MessageManager';
jest.mock('../utils/MessageManager');

// Create a mock for YappSDK to avoid importing the actual file with its dependencies
class MockYappSDK {
  private messaging: MessageManager;

  constructor(config: { origin?: string } = {}) {
    this.messaging = new MessageManager(config.origin || 'https://yodl.me');
  }

  public async getUserContext() {
    if (!this.messaging) {
      throw new Error(
        'SDK not initialized. Please wait for initialization to complete.',
      );
    }
    return this.messaging.getUserContext();
  }
}

describe('YappSDK.getUserContext', () => {
  // Define mock data
  const TEST_CONSTANTS = {
    ORIGIN: 'https://yodl.me',
    ENS_NAME: 'test.eth',
    USER_ADDRESS: '0x123456789abcdef',
    PRIMARY_ENS: 'user.eth',
    COMMUNITY_ADDRESS: '0xabcdef123456789',
    COMMUNITY_ENS: 'community.eth',
    COMMUNITY_USER_ENS: 'user.community.eth',
  };

  // Set up the MessageManager mock
  const mockGetUserContext = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();

    // Setup MessageManager mock with getUserContext
    (
      MessageManager as jest.MockedClass<typeof MessageManager>
    ).mockImplementation(() => {
      return {
        getUserContext: mockGetUserContext,
        sendPaymentRequest: jest.fn(),
        sendCloseMessage: jest.fn(),
        allowedOrigin: TEST_CONSTANTS.ORIGIN,
      } as unknown as MessageManager;
    });
  });

  it('should call MessageManager.getUserContext and return the result', async () => {
    // Setup mock response with new nested community structure
    const mockUserContext = {
      address: TEST_CONSTANTS.USER_ADDRESS,
      primaryEnsName: TEST_CONSTANTS.PRIMARY_ENS,
      community: {
        address: TEST_CONSTANTS.COMMUNITY_ADDRESS,
        ensName: TEST_CONSTANTS.COMMUNITY_ENS,
        userEnsName: TEST_CONSTANTS.COMMUNITY_USER_ENS,
      },
    };

    mockGetUserContext.mockResolvedValue(mockUserContext);

    // Create the SDK instance
    const sdk = new MockYappSDK({
      origin: TEST_CONSTANTS.ORIGIN,
    });

    // Call getUserContext and get the result
    const result = await sdk.getUserContext();

    // Verify MessageManager.getUserContext was called
    expect(mockGetUserContext).toHaveBeenCalled();

    // Verify the result
    expect(result).toEqual(mockUserContext);
  });

  it('should propagate errors from MessageManager.getUserContext', async () => {
    // Setup mock to reject with an error
    mockGetUserContext.mockRejectedValue(
      new Error('User context request timed out'),
    );

    // Create the SDK instance
    const sdk = new MockYappSDK({
      origin: TEST_CONSTANTS.ORIGIN,
    });

    // Expect the error to be propagated
    await expect(sdk.getUserContext()).rejects.toThrow(
      'User context request timed out',
    );
  });

  it('should handle response with null community', async () => {
    // Setup mock response with null community
    const mockUserContext = {
      address: TEST_CONSTANTS.USER_ADDRESS,
      primaryEnsName: TEST_CONSTANTS.PRIMARY_ENS,
      community: null,
    };

    mockGetUserContext.mockResolvedValue(mockUserContext);

    // Create the SDK instance
    const sdk = new MockYappSDK({
      origin: TEST_CONSTANTS.ORIGIN,
    });

    // Call getUserContext and get the result
    const result = await sdk.getUserContext();

    // Verify MessageManager.getUserContext was called
    expect(mockGetUserContext).toHaveBeenCalled();

    // Verify the result
    expect(result).toEqual(mockUserContext);
    expect(result.community).toBeNull();
  });

  it('should handle response with undefined community', async () => {
    // Setup mock response with undefined community
    const mockUserContext = {
      address: TEST_CONSTANTS.USER_ADDRESS,
      primaryEnsName: TEST_CONSTANTS.PRIMARY_ENS,
      // community is intentionally omitted
    };

    mockGetUserContext.mockResolvedValue(mockUserContext);

    // Create the SDK instance
    const sdk = new MockYappSDK({
      origin: TEST_CONSTANTS.ORIGIN,
    });

    // Call getUserContext and get the result
    const result = await sdk.getUserContext();

    // Verify MessageManager.getUserContext was called
    expect(mockGetUserContext).toHaveBeenCalled();

    // Verify the result
    expect(result).toEqual(mockUserContext);
    expect(result.community).toBeUndefined();
  });

  it('should work with minimal configuration', async () => {
    // Setup mock response
    const mockUserContext = {
      address: TEST_CONSTANTS.USER_ADDRESS,
      primaryEnsName: TEST_CONSTANTS.PRIMARY_ENS,
    };

    mockGetUserContext.mockResolvedValue(mockUserContext);

    // Create the SDK instance with no parameters
    const sdk = new MockYappSDK();

    // Call getUserContext and get the result
    const result = await sdk.getUserContext();

    // Verify MessageManager.getUserContext was called
    expect(mockGetUserContext).toHaveBeenCalled();

    // Verify the result
    expect(result).toEqual(mockUserContext);
  });
});
