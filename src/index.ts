import {
  PaymentConfig,
  YappSDKConfig,
  YappSDKConfigPublic,
} from './types/config';
import { FiatCurrency } from './types/currency';
import { MessageManager } from './utils/MessageManager';
import { isInIframe } from './utils/isInIframe';
import { Payment, UserContext } from './types/messagePayload';
import { Hex } from './types/utils';

/**
 * YappSDK - Main SDK class for handling payments and authentication.
 *
 * This class provides the core functionality for the Yapp SDK, managing security,
 * origin validation, JWT verification, and payment requests.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const sdk = new YappSDK();
 * // Or with custom origin
 * const sdk = new YappSDK({
 *   origin: 'https://allowed-domain.com'
 * });
 * ```
 *
 * @example
 * Payment request:
 * ```typescript
 * try {
 *   const response = await sdk.requestPayment('0x123...', {
 *     amount: 50,
 *     currency: FiatCurrency.USD,
 *     memo: 'Service fee'
 *   });
 *   console.log('Transaction hash:', response.txHash);
 * } catch (error) {
 *   console.error('Payment failed:', error);
 * }
 * ```
 *
 * @example
 * Handling redirect payments:
 * ```typescript
 * // On your redirect page (e.g., /payment-callback):
 * const sdk = new YappSDK();
 *
 * // Check if this page load is a payment return
 * const paymentResult = sdk.parsePaymentFromUrl();
 *
 * if (paymentResult) {
 *   // Payment was successful - txHash and chainId are present in the URL
 *   console.log('Payment completed on chain:', paymentResult.chainId);
 *   console.log('Transaction hash:', paymentResult.txHash);
 *
 *   // Update your UI or redirect to a success page
 *   updatePaymentStatus('success', paymentResult);
 * } else {
 *   // Check if payment was cancelled or handle other cases
 *   console.log('No payment data found in URL');
 * }
 * ```
 */
class YappSDK {
  /** Instance of MessageManager handling messaging and origin validation */
  private messaging!: MessageManager;
  private config!: YappSDKConfig;

  /**
   * Creates a new instance of YappSDK.
   *
   * @param config - Configuration options for the SDK
   * @param config.origin - The allowed origin domain (defaults to 'https://yodl.me')
   */
  constructor(config: YappSDKConfigPublic = {}) {
    this.config = {
      origin: config.origin || 'https://yodl.me',
    } as YappSDKConfig;

    this.initialize(this.config);
  }

  /**
   * Initializes the SecurityManager with the provided credentials.
   *
   * @param config - Configuration options
   * @private
   */
  private async initialize(config: YappSDKConfig) {
    this.messaging = new MessageManager(config.origin);
  }

  /**
   * Ensures the SDK is properly initialized
   * @private
   * @throws {Error} If the SDK is not initialized
   */
  private ensureInitialized(): void {
    if (!this.messaging) {
      throw new Error(
        'SDK not initialized. Please wait for initialization to complete.',
      );
    }
  }

  /**
   * Sends a payment request to the parent window and waits for confirmation.
   *
   * @param address - The address to send the payment to
   * @param config - Payment configuration options
   * @returns Promise that resolves with payment response when successful
   * @throws {Error} If the SDK is not initialized, payment is cancelled, or times out
   *
   * @example
   * ```typescript
   * try {
   *   const response = await sdk.requestPayment('0x742d35Cc6634C0532925a3b844Bc454e4438f44e', {
   *     amount: 50,
   *     currency: FiatCurrency.USD,
   *     memo: 'Service fee'
   *   });
   *
   *   // Handle successful payment
   *   console.log('Transaction completed on chain:', response.chainId);
   *   console.log('Transaction hash:', response.txHash);
   * } catch (error) {
   *   if (error.message === 'Payment was cancelled') {
   *     // Handle user cancellation
   *     console.log('User cancelled the payment');
   *   } else {
   *     // Handle other errors (timeout, network issues, etc)
   *     console.error('Payment failed:', error.message);
   *   }
   * }
   * ```
   */
  public async requestPayment(
    address: Hex,
    config: PaymentConfig,
  ): Promise<Payment> {
    this.ensureInitialized();
    return await this.messaging.sendPaymentRequest(address, config);
  }

  /**
   * Get user context information from the parent window.
   *
   * @returns Promise that resolves with user context information
   * @throws {Error} If the SDK is not initialized or request times out
   */
  public async getUserContext(): Promise<UserContext> {
    this.ensureInitialized();
    return await this.messaging.getUserContext();
  }

  /**
   * Parses payment information from URL parameters.
   * This is useful when implementing a redirect flow where users complete payments in a new tab.
   *
   * @returns Payment response if URL contains valid payment parameters, null otherwise
   *
   * @example
   * ```typescript
   * // On your redirect page:
   * const sdk = new YappSDK();
   *
   * const paymentResult = sdk.parsePaymentFromUrl();
   * if (paymentResult) {
   *   console.log('Payment completed:', paymentResult.txHash);
   *   // Process successful payment
   * }
   * ```
   */
  public parsePaymentFromUrl(): Payment | null {
    // Extract URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const txHash = urlParams.get('txHash') as Hex;
    const chainId = urlParams.get('chainId');

    // If we have transaction data in the URL, return it
    if (txHash && chainId) {
      return {
        txHash,
        chainId: parseInt(chainId, 10),
      };
    }

    return null;
  }

  /**
   * Sends a close message to the parent window.
   *
   * @param targetOrigin - The origin of the parent window
   * @throws {Error} If the SDK is not initialized
   */
  public close(targetOrigin: string): void {
    this.ensureInitialized();
    this.messaging.sendCloseMessage(targetOrigin);
  }
}

// Export FiatCurrency for convenience
export { FiatCurrency };
export { isInIframe };
export * from './types';

export default YappSDK;
