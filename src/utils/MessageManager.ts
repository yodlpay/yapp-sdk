import { PaymentConfig } from '../types/config';
import { FiatCurrency } from '../types/currency';
import {
  CloseMessage,
  PaymentMessage,
  PaymentResponseMessage,
} from '../types/messages';
import { isValidFiatCurrency } from './currencyValidation';
import { isValidMemoSize } from './memoValidation';
import { getSafeWindow, isBrowser } from './safeWindow';

/**
 * Manages communication between the Yapp and its parent window.
 *
 * The MessageManager handles sending messages securely from
 * the Yapp to its parent application, ensuring proper origin validation.
 *
 * @throws {Error} If messages are sent outside an iframe or to invalid origins
 *
 * @example
 * ```typescript
 * const messaging = new MessageManager('https://allowed-origin.com');
 *
 * try {
 *   // Send a payment request
 *   const response = await messaging.sendPaymentRequest('0x123...', {
 *     amount: 100,
 *     currency: 'USD',
 *     memo: 'Service payment'
 *   });
 * } catch (error) {
 *   // Handle errors
 * }
 * ```
 */
export class MessageManager {
  private readonly allowedOrigin: string;
  private messageListeners: Map<string, ((response: any) => void)[]> =
    new Map();

  constructor(allowedOrigin: string) {
    this.allowedOrigin = allowedOrigin;
    if (isBrowser()) {
      this.setupMessageListener();
    }
  }

  private setupMessageListener(): void {
    const win = getSafeWindow();
    if (!win) {
      return;
    }

    win.addEventListener('message', (event) => {
      if (!this.isOriginAllowed(event.origin)) {
        return;
      }

      const message = event.data;
      const listeners = this.messageListeners.get(message.type);
      if (listeners) {
        listeners.forEach((listener) => listener(message));
        this.messageListeners.delete(message.type);
      }
    });
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
   * Sends a payment request message to the parent window and waits for response.
   *
   * @param address - The recipient's blockchain address
   * @param config - Payment configuration options
   * @returns Promise that resolves with payment response containing txHash and chainId
   * @throws {Error} If payment is cancelled ("Payment was cancelled"), times out ("Payment request timed out"),
   *                 is sent outside an iframe, or to an invalid origin
   *
   * @example
   * ```typescript
   * try {
   *   const response = await messaging.sendPaymentRequest('0x123...', {
   *     amount: 100,
   *     currency: FiatCurrency.USD,
   *     memo: 'Premium subscription'
   *   });
   *
   *   // Handle successful payment
   *   console.log('Transaction hash:', response.txHash);
   *   console.log('Chain ID:', response.chainId);
   * } catch (error) {
   *   if (error.message === 'Payment was cancelled') {
   *     console.log('User cancelled the payment');
   *   } else if (error.message === 'Payment request timed out') {
   *     console.log('Payment timed out after 5 minutes');
   *   } else {
   *     console.error('Payment failed:', error);
   *   }
   * }
   * ```
   */
  public sendPaymentRequest(
    address: string,
    config: PaymentConfig,
  ): Promise<PaymentResponseMessage['payload']> {
    return new Promise((resolve, reject) => {
      // Validate memo size
      if (config.memo && !isValidMemoSize(config.memo)) {
        reject(new Error('Memo exceeds maximum size of 32 bytes'));
        return;
      }

      // Validate currency
      if (!isValidFiatCurrency(config.currency)) {
        reject(
          new Error(
            `Invalid currency "${config.currency}". Must be one of: ${Object.values(FiatCurrency).join(', ')}`,
          ),
        );
        return;
      }

      // Validate amount
      if (typeof config.amount !== 'number' || config.amount <= 0) {
        reject(new Error('Amount must be a positive number'));
        return;
      }

      const message: PaymentMessage = {
        type: 'PAYMENT_REQUEST',
        payload: {
          address,
          amount: config.amount,
          currency: config.currency,
          memo: config.memo,
        },
      };

      // Add listener for payment success
      const successListeners =
        this.messageListeners.get('PAYMENT_SUCCESS') || [];
      successListeners.push((response: PaymentResponseMessage) => {
        clearTimeout(timeout);
        this.messageListeners.delete('PAYMENT_CANCELLED');
        resolve(response.payload);
      });
      this.messageListeners.set('PAYMENT_SUCCESS', successListeners);

      // Add listener for payment cancellation
      const cancelListeners =
        this.messageListeners.get('PAYMENT_CANCELLED') || [];
      cancelListeners.push(() => {
        clearTimeout(timeout);
        this.messageListeners.delete('PAYMENT_SUCCESS');
        reject(new Error('Payment was cancelled'));
      });
      this.messageListeners.set('PAYMENT_CANCELLED', cancelListeners);

      // Add timeout
      const timeout = setTimeout(
        () => {
          this.messageListeners.delete('PAYMENT_SUCCESS');
          this.messageListeners.delete('PAYMENT_CANCELLED');
          reject(new Error('Payment request timed out'));
        },
        process.env.NODE_ENV === 'test' ? 1000 : 300000,
      ); // 1 second timeout in test, 5 minutes in production

      try {
        this.sendMessageToParent(message, this.allowedOrigin);
      } catch (error) {
        clearTimeout(timeout);
        this.messageListeners.delete('PAYMENT_SUCCESS');
        this.messageListeners.delete('PAYMENT_CANCELLED');
        reject(error);
      }
    });
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
    targetOrigin: string,
  ): void {
    if (!this.isOriginAllowed(targetOrigin)) {
      throw new Error(
        `Invalid origin "${targetOrigin}". Expected "${this.allowedOrigin}".`,
      );
    }

    const win = getSafeWindow();
    if (!win || win.parent === win) {
      throw new Error('Cannot send message: SDK is not running in an iframe');
    }

    win.parent.postMessage(message, targetOrigin);
  }
}
