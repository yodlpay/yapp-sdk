import { PaymentConfig } from '../types/config';
import { CloseMessage, PaymentMessage } from '../types/messages';

/**
 * Manages communication between the Yapp and its parent window.
 *
 * The MessageManager handles sending messages securely from
 * the Yapp to its parent application, ensuring proper origin validation.
 *
 * @example
 * ```typescript
 * const messaging = new MessageManager('https://allowed-origin.com');
 *
 * // Send a payment request
 * messaging.sendPaymentRequest('recipient@example.com', {
 *   amount: 100,
 *   currency: 'USD',
 *   memo: 'Service payment'
 * });
 * ```
 */
export class MessageManager {
  private readonly allowedOrigin: string;

  constructor(allowedOrigin: string) {
    this.allowedOrigin = allowedOrigin;
  }

  /**
   * Validates if the provided origin is in the list of allowed origins.
   *
   * @example
   * ```typescript
   * if (messaging.isOriginAllowed('https://trusted-domain.com')) {
   *   // Process message
   * }
   * ```
   */
  private isOriginAllowed(origin: string): boolean {
    try {
      const allowedUrl = new URL(this.allowedOrigin);
      const testUrl = new URL(origin);
      return allowedUrl.origin === testUrl.origin;
    } catch (error) {
      console.warn(`Invalid origin format: ${origin}`);
      return false;
    }
  }

  /**
   * Sends a payment request message to the parent window.
   *
   * @param address - The address to send the payment to
   * @param config - Payment configuration options
   *
   * @example
   * ```typescript
   * // Request a simple payment
   * messaging.sendPaymentRequest('user@example.com', {
   *   amount: 50,
   *   currency: 'USD'
   * });
   *
   * // Request payment with memo
   * messaging.sendPaymentRequest('store@example.com', {
   *   amount: 99.99,
   *   currency: 'EUR',
   *   memo: 'Premium subscription - 1 year'
   * });
   * ```
   */
  public sendPaymentRequest(address: string, config: PaymentConfig): void {
    const message: PaymentMessage = {
      type: 'PAYMENT_REQUEST',
      payload: {
        address,
        amount: config.amount,
        currency: config.currency,
        memo: config.memo,
      },
    };
    this.sendMessageToParent(message, this.allowedOrigin);
  }

  /**
   * Sends a close message to the parent window.
   */
  public sendCloseMessage(targetOrigin: string): void {
    const message: CloseMessage = {
      type: 'CLOSE',
    };
    this.sendMessageToParent(message, targetOrigin);
  }

  /**
   * Internal method to send messages to parent window.
   */
  private sendMessageToParent(
    message: CloseMessage | PaymentMessage,
    targetOrigin: string
  ): void {
    if (!this.isOriginAllowed(targetOrigin)) {
      throw new Error(
        `Origin "${targetOrigin}" is not allowed to receive messages`
      );
    }

    if (window.parent === window) {
      throw new Error('Cannot send message: SDK is not running in an iframe');
    }

    window.parent.postMessage(message, targetOrigin);
  }
}
