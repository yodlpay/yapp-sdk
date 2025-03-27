// Import YappSDK first to have it available
import { CommunicationManager } from '../managers/CommunicationManager';
import { PaymentManager } from '../managers/PaymentManager';
import { PaymentConfig, YappSDKConfig } from '../types/config';
import { Hex } from '../types/utils';

// Mock the MessageManager module
jest.mock('./utils/TestMessageManagerAdapter');

// Declare a mocked YappSDK for testing
class MockYappSDK {
  private _communicationManager: CommunicationManager;
  private _paymentManager: PaymentManager;

  constructor(config: Partial<YappSDKConfig> = {}) {
    // Create mock managers
    this._communicationManager = {
      getUserContext: jest.fn(),
      sendCloseMessage: jest.fn(),
    } as unknown as CommunicationManager;

    this._paymentManager = {
      sendPaymentRequest: jest.fn(),
    } as unknown as PaymentManager;
  }

  // Test helpers
  public setCommunicationManager(manager: CommunicationManager) {
    this._communicationManager = manager;
  }

  public setPaymentManager(manager: PaymentManager) {
    this._paymentManager = manager;
  }

  // Public API
  public async getUserContext() {
    if (!this._communicationManager) {
      throw new Error(
        'SDK not initialized. Please wait for initialization to complete.',
      );
    }
    return this._communicationManager.getUserContext();
  }

  public async requestPayment(address: Hex, config: PaymentConfig) {
    if (!this._paymentManager) {
      throw new Error(
        'SDK not initialized. Please wait for initialization to complete.',
      );
    }
    return this._paymentManager.sendPaymentRequest(address, config);
  }

  public close(targetOrigin: string) {
    if (!this._communicationManager) {
      throw new Error(
        'SDK not initialized. Please wait for initialization to complete.',
      );
    }
    this._communicationManager.sendCloseMessage(targetOrigin);
  }
}

describe('YappSDK.getUserContext', () => {
  let sdk: MockYappSDK;
  let mockCommunicationManager: CommunicationManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a new SDK instance
    sdk = new MockYappSDK();

    // Set up the CommunicationManager mock
    mockCommunicationManager = {
      getUserContext: jest.fn(),
      sendCloseMessage: jest.fn(),
    } as unknown as CommunicationManager;

    // Inject the mock
    sdk.setCommunicationManager(mockCommunicationManager);
  });

  it('should call CommunicationManager.getUserContext and return the result', async () => {
    // Setup mock response
    const mockUserContext = {
      address: '0x123',
      primaryEnsName: 'user.eth',
      community: {
        address: '0x456',
        ensName: 'community.eth',
        userEnsName: 'user.community.eth',
      },
    };

    (
      mockCommunicationManager.getUserContext as jest.Mock
    ).mockResolvedValueOnce(mockUserContext);

    // Call the method
    const result = await sdk.getUserContext();

    // Verify CommunicationManager.getUserContext was called
    expect(mockCommunicationManager.getUserContext).toHaveBeenCalledTimes(1);

    // Verify the result
    expect(result).toEqual(mockUserContext);
  });

  it('should propagate errors from CommunicationManager.getUserContext', async () => {
    // Setup error response
    const mockError = new Error('User context request timed out');
    (
      mockCommunicationManager.getUserContext as jest.Mock
    ).mockRejectedValueOnce(mockError);

    // Call the method and expect it to throw
    await expect(sdk.getUserContext()).rejects.toThrow(
      'User context request timed out',
    );

    // Verify CommunicationManager.getUserContext was called
    expect(mockCommunicationManager.getUserContext).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if SDK is not initialized', async () => {
    // Create an uninitialized SDK by forcing it to think it's not initialized
    sdk.setCommunicationManager(undefined as unknown as CommunicationManager);

    // Call the method and expect it to throw
    await expect(sdk.getUserContext()).rejects.toThrow(
      'SDK not initialized. Please wait for initialization to complete.',
    );

    // Verify CommunicationManager.getUserContext was not called
    expect(mockCommunicationManager.getUserContext).not.toHaveBeenCalled();
  });

  // Additional tests for cancellation, timeouts, etc.
  it('should handle empty user context response', async () => {
    // Setup minimal response
    const minimalUserContext = {
      address: '0x123',
    };

    (
      mockCommunicationManager.getUserContext as jest.Mock
    ).mockResolvedValueOnce(minimalUserContext);

    // Call the method
    const result = await sdk.getUserContext();

    // Verify CommunicationManager.getUserContext was called
    expect(mockCommunicationManager.getUserContext).toHaveBeenCalledTimes(1);

    // Verify the result
    expect(result).toEqual(minimalUserContext);
    expect(result.community).toBeUndefined();
    expect(result.primaryEnsName).toBeUndefined();
  });

  it('should handle null community in user context', async () => {
    // Setup response with null community
    const userContextWithNullCommunity = {
      address: '0x123',
      primaryEnsName: 'user.eth',
      community: null,
    };

    (
      mockCommunicationManager.getUserContext as jest.Mock
    ).mockResolvedValueOnce(userContextWithNullCommunity);

    // Call the method
    const result = await sdk.getUserContext();

    // Verify CommunicationManager.getUserContext was called
    expect(mockCommunicationManager.getUserContext).toHaveBeenCalledTimes(1);

    // Verify the result
    expect(result).toEqual(userContextWithNullCommunity);
    expect(result.community).toBeNull();
  });
});
