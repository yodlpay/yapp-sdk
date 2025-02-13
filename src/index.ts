import { PaymentConfig, YappSDKConfig } from './types/config';
import { JWTPayload } from './types/jwt';
import { MessageManager } from './utils/MessageManager';
import { SecurityManager } from './utils/SecurityManager';
import { isInIframe } from './utils/isInIframe';

/**
 * YappSDK - Main SDK class for handling security and authentication.
 *
 * This class provides the core functionality for the Yapp SDK, managing security,
 * origin validation, and communication with the parent application.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const sdk = new YappSDK('https://allowed-domain.com', {
 *   publicKey: publicKeyPem
 * });
 *
 * // Validate a JWT token
 * const decodedData = await sdk.validateToken(jwtToken);
 * ```
 *
 * @example
 * Sending messages:
 * ```typescript
 * // Request a payment
 * sdk.requestPayment('recipient@example.com', {
 *   amount: 50,
 *   currency: 'USD',
 *   memo: 'Service fee'
 * });
 * ```
 */
class YappSDK {
  /** Instance of SecurityManager handling encryption and origin validation */
  private security!: SecurityManager;
  private messaging!: MessageManager;

  /**
   * Creates a new instance of YappSDK.
   *
   * @param address - The allowed origin domain that can interact with the SDK
   * @param config - Configuration options for the SDK
   *
   * @throws {Error} If the public key is invalid or initialization fails
   */
  constructor(address: string, config: YappSDKConfig) {
    this.initialize(address, config);
  }

  /**
   * Initializes the SecurityManager with the provided credentials.
   *
   * @param address - The allowed origin
   * @param config - Configuration options
   * @private
   */
  private async initialize(address: string, config: YappSDKConfig) {
    this.security = await SecurityManager.create(config.publicKey);
    this.messaging = new MessageManager(address);
  }

  /**
   * Ensures the SDK is properly initialized
   * @private
   * @throws {Error} If the SDK is not initialized
   */
  private ensureInitialized(): void {
    if (!this.security || !this.messaging) {
      throw new Error(
        'SDK not initialized. Please wait for initialization to complete.'
      );
    }
  }

  /**
   * Validates and decodes a JWT token.
   *
   * @param token - The JWT token to validate and decode
   * @returns The decoded payload data if the token is valid
   * @throws {Error} If the token is invalid or verification fails
   */
  public async validateToken(token: string): Promise<JWTPayload> {
    this.ensureInitialized();
    return this.security.verifyAndDecodeToken(token);
  }

  /**
   * Sends a payment request to the parent window.
   *
   * @param address - The address to send the payment to
   * @param config - Payment configuration options
   * @throws {Error} If the SDK is not initialized or the origin is not allowed
   */
  public requestPayment(address: string, config: PaymentConfig): void {
    this.ensureInitialized();
    this.messaging.sendPaymentRequest(address, config);
  }

  /**
   * Sends a close message to the parent window.
   *
   * @param targetOrigin - The origin of the parent window
   * @throws {Error} If the SDK is not initialized or the origin is not allowed
   */
  public close(targetOrigin: string): void {
    this.ensureInitialized();
    this.messaging.sendCloseMessage(targetOrigin);
  }
}

export { isInIframe };

export default YappSDK;
