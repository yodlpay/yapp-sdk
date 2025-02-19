import * as jose from 'jose';
import { YODL_PUBLIC_KEY } from './constants/keys';
import {
  PaymentConfig,
  YappSDKConfig,
  YappSDKConfigPublic,
} from './types/config';
import { JWTPayload } from './types/jwt';
import { MessageManager } from './utils/MessageManager';
import { isInIframe } from './utils/isInIframe';

/**
 * Error thrown when JWT audience validation fails.
 * This typically occurs when the JWT's 'aud' claim doesn't match the expected value.
 *
 */
export class JWTAudError extends Error {
  constructor(message: string = 'JWT issued for a different yapp') {
    super(message);
    this.name = 'JWTAudError';
  }
}

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
  private messaging!: MessageManager;
  private config!: YappSDKConfig;

  /**
   * Creates a new instance of YappSDK.
   *
   * @param config - Configuration options for the SDK
   *
   * @throws {Error} If the public key is invalid or initialization fails
   */
  constructor(config: YappSDKConfigPublic) {
    if (!config.ensName || config.ensName == '') {
      // add better checks for valid ENS names.
      throw new Error('ensName is required');
    }

    this.config = {
      origin: config.origin || 'https://yodl.me',
      ensName: config.ensName,
      publicKey: config.publicKey || YODL_PUBLIC_KEY,
      disableOriginValidation: config.disableOriginValidation || false,
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
    this.messaging = new MessageManager(
      config.origin,
      config.disableOriginValidation,
    );
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
   * Validates and decodes a JWT token.
   *
   * @param token - The JWT token to validate and decode
   * @returns The decoded payload data if the token is valid
   * @throws {Error} If the token is invalid or verification fails
   */
  public async verify(jwt: string): Promise<JWTPayload | undefined> {
    const publicKey = await jose.importSPKI(this.config.publicKey, 'ES256');

    const { payload } = await jose.jwtVerify<JWTPayload>(jwt, publicKey, {
      algorithms: ['ES256'],
    });

    if (payload.aud !== this.config.ensName) {
      throw new JWTAudError(`JWT issued for different yapp (${payload.aud})`);
    }

    return payload;
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
