import { CommunicationManager, PaymentManager, SiweManager } from '@managers';
import {
  GetPaymentsQuery,
  Hex,
  Payment,
  PaymentConfig,
  SiweRequestData,
  SiweResponseData,
  UserContext,
  YappSDKConfig,
} from '@types';
import { getSafeWindow } from '@utils/safeWindow';

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
  /** Instance of CommunicationManager handling messaging and basic communication */
  private communicationManager!: CommunicationManager;

  /** Instance of PaymentManager handling payment operations */
  private paymentManager!: PaymentManager;

  /** Instance of SiweManager handling Sign-In with Ethereum operations */
  private siweManager!: SiweManager;

  /** @internal */
  private config!: YappSDKConfig;

  /**
   * Creates a new instance of YappSDK.
   *
   * @param config - Configuration options for the SDK
   * @param config.origin - The allowed origin domain (defaults to 'https://yodl.me')
   */
  constructor(config?: Partial<YappSDKConfig>) {
    this.config = {
      origin: config?.origin || 'https://yodl.me',
      apiUrl: config?.apiUrl || 'https://tx.yodl.me',
    } as YappSDKConfig;

    this.initialize(this.config);
  }

  /**
   * Initializes the managers with the provided config.
   *
   * @param config - Configuration options
   * @private
   */
  private async initialize(config: YappSDKConfig) {
    this.communicationManager = new CommunicationManager(
      config.origin,
      config.apiUrl,
    );
    this.paymentManager = new PaymentManager(config.origin, config.apiUrl);
    this.siweManager = new SiweManager(config.origin, config.apiUrl);
  }

  /**
   * Ensures the SDK is properly initialized
   * @private
   * @throws {Error} If the SDK is not initialized
   */
  private ensureInitialized(): void {
    if (
      !this.communicationManager ||
      !this.paymentManager ||
      !this.siweManager
    ) {
      throw new Error(
        'SDK not initialized. Please wait for initialization to complete.',
      );
    }
  }

  /**
   * Sends a payment request to the parent window and waits for confirmation.
   *
   * @param addressOrEns - The recipient's Ethereum address (0x...) or ENS name (e.g., 'name.eth')
   * @param config - Payment configuration options
   * @returns Promise that resolves with payment response when successful
   * @throws {Error} If the SDK is not initialized, payment is cancelled, or times out
   *
   * @example
   * ```typescript
   * // Using Ethereum address
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
   *
   * // Using ENS name
   * try {
   *   const response = await sdk.requestPayment('vitalik.eth', {
   *     amount: 100,
   *     currency: FiatCurrency.USD,
   *     memo: 'Donation'
   *   });
   *   // Handle successful payment
   * } catch (error) {
   *   // Handle errors
   * }
   * ```
   */
  public async requestPayment(
    addressOrEns: string,
    config: PaymentConfig,
  ): Promise<Payment> {
    this.ensureInitialized();
    return await this.paymentManager.sendPaymentRequest(addressOrEns, config);
  }

  /**
   * Get user context information from the parent window.
   *
   * @returns Promise that resolves with user context information
   * @throws {Error} If the SDK is not initialized or request times out
   */
  public async getUserContext(): Promise<UserContext> {
    this.ensureInitialized();
    return await this.communicationManager.getUserContext();
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
  public parsePaymentFromUrl(): Partial<Payment> {
    const win = getSafeWindow();

    const urlParams = new URLSearchParams(win?.location.search);
    const txHash = urlParams.get('txHash') as Hex;
    const chainId = urlParams.get('chainId');

    return {
      txHash,
      chainId: chainId ? parseInt(chainId, 10) : undefined,
    };
  }

  /**
   * Get the status of a payment.
   *
   * @param txHash - The transaction hash of the payment
   * @returns Promise that resolves with payment status
   * @throws {Error} If the SDK is not initialized or request times out
   */
  public async getPayment(txHash: Hex) {
    return await this.paymentManager.getPayment(txHash);
  }

  /**
   * Get payments for a given query.
   *
   * @param query - The query to get payments for
   * @returns Promise that resolves with payments
   * @throws {Error} If the SDK is not initialized or request times out
   */
  public async getPayments(query: Partial<GetPaymentsQuery>) {
    return await this.paymentManager.getPayments(query);
  }

  /**
   * Signs a SIWE (Sign-In with Ethereum) message using the connected wallet
   *
   * @param siweData - The SIWE message data to be signed
   * @returns Promise that resolves with a signature and address when successful
   * @throws {Error} If the SDK is not initialized, signature is cancelled, or times out
   *
   * @example
   * ```typescript
   * try {
   *   const response = await sdk.signSiweMessage({
   *     domain: 'example.com',
   *     uri: 'https://example.com/login',
   *     version: '1',
   *     chainId: 1,
   *     nonce: 'random-nonce-123',
   *     issuedAt: new Date().toISOString(),
   *     statement: 'Sign in with Ethereum to the app.'
   *   });
   *
   *   console.log('Signature:', response.signature);
   *   console.log('Address:', response.address);
   * } catch (error) {
   *   if (error.message === 'Signature request was cancelled') {
   *     console.log('User cancelled the signing request');
   *   } else {
   *     console.error('Signing failed:', error.message);
   *   }
   * }
   * ```
   */
  public async signSiweMessage(
    siweData: SiweRequestData,
  ): Promise<SiweResponseData> {
    this.ensureInitialized();
    return await this.siweManager.signSiweMessage(siweData);
  }

  /**
   * Sends a close message to the parent window.
   *
   * @param targetOrigin - The origin of the parent window
   * @throws {Error} If the SDK is not initialized
   */
  public close(targetOrigin: string): void {
    this.ensureInitialized();
    this.communicationManager.sendCloseMessage(targetOrigin);
  }
}

// Export FiatCurrency for convenience
export * from './types';
export * from './utils';

export default YappSDK;
