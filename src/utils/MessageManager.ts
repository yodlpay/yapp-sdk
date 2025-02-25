import { PaymentConfig } from '../types/config';
import { FiatCurrency } from '../types/currency';
import {
  CloseMessage,
  PaymentMessage,
  PaymentResponseMessage,
} from '../types/messages';
import { isValidFiatCurrency } from './currencyValidation';
import { isInIframe } from './isInIframe';
import { createValidMemoFromUUID, isValidMemoSize } from './memoValidation';
import { getSafeWindow, isBrowser } from './safeWindow';

// Message types
const MESSAGE_TYPE = {
  REQUEST: 'PAYMENT_REQUEST',
  SUCCESS: 'PAYMENT_SUCCESS',
  CANCELLED: 'PAYMENT_CANCELLED',
  CLOSE: 'CLOSE',
} as const;

// Configuration constants
const PAYMENT_TIMEOUT_MS = 300000; // 5 minutes
const TEST_TIMEOUT_MS = 1000; // 1 second for tests
const STORAGE_KEY = 'yodl_payment_request';

// URL parameters
const URL_PARAMS = {
  MEMO: 'memo',
  STATUS: 'status',
  TX_HASH: 'txHash',
  CHAIN_ID: 'chainId',
  REDIRECT_URL: 'redirectUrl',
  STATUS_SUCCESS: 'success',
  STATUS_CANCELLED: 'cancelled',
} as const;

const URL_PARAMS_REQUEST = {
  MEMO: URL_PARAMS.MEMO,
  REDIRECT_URL: URL_PARAMS.REDIRECT_URL,
  AMOUNT: 'amount',
  CURRENCY: 'currency',
} as const;

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
      // First try to recover any pending payment
      this.recoverPendingPayment()
        .then((recoveredPayment) => {
          if (recoveredPayment) {
            resolve(recoveredPayment);
            return;
          }

          // Continue with normal payment flow if no recovery
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
            type: MESSAGE_TYPE.REQUEST,
            payload: {
              address,
              amount: config.amount,
              currency: config.currency,
              memo: config.memo,
            },
          };

          // Check if running in iframe
          if (isInIframe()) {
            this.handleIframePayment(message, resolve, reject);
            return;
          }

          if (!config.redirectUrl) {
            reject(
              new Error(
                'Redirect URL is required when running outside of an iframe',
              ),
            );
            return;
          }

          this.handleRedirectPayment(
            message,
            config.redirectUrl,
            resolve,
            reject,
          );
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  private handleIframePayment(
    message: PaymentMessage,
    resolve: (value: PaymentResponseMessage['payload']) => void,
    reject: (reason: Error) => void,
  ): void {
    // Add listener for payment success
    const successListeners =
      this.messageListeners.get(MESSAGE_TYPE.SUCCESS) || [];
    const timeout = this.setupPaymentTimeout(reject);

    successListeners.push((response: PaymentResponseMessage) => {
      clearTimeout(timeout);
      this.messageListeners.delete(MESSAGE_TYPE.CANCELLED);
      resolve(response.payload);
    });
    this.messageListeners.set(MESSAGE_TYPE.SUCCESS, successListeners);

    // Add listener for payment cancellation
    const cancelListeners =
      this.messageListeners.get(MESSAGE_TYPE.CANCELLED) || [];
    cancelListeners.push(() => {
      clearTimeout(timeout);
      this.messageListeners.delete(MESSAGE_TYPE.SUCCESS);
      reject(new Error('Payment was cancelled'));
    });
    this.messageListeners.set(MESSAGE_TYPE.CANCELLED, cancelListeners);

    try {
      this.sendMessageToParent(message, this.allowedOrigin);
    } catch (error) {
      clearTimeout(timeout);
      this.messageListeners.delete(MESSAGE_TYPE.SUCCESS);
      this.messageListeners.delete(MESSAGE_TYPE.CANCELLED);

      if (error instanceof Error) {
        reject(error);
      } else {
        reject(new Error('Unknown error ' + error));
      }
    }
  }

  private handleRedirectPayment(
    message: PaymentMessage,
    redirectUrl: string,
    resolve: (value: PaymentResponseMessage['payload']) => void,
    reject: (reason: Error) => void,
  ): void {
    // Generate or use existing memo
    const memo =
      message.payload.memo || createValidMemoFromUUID(message.payload.address);

    // Check if we have a pending payment with the same memo
    const existingPayment = sessionStorage.getItem(STORAGE_KEY);
    if (existingPayment) {
      try {
        const parsedPayment = JSON.parse(existingPayment);
        // If we have a timeout ID, clear it
        if (parsedPayment.timeoutId) {
          clearTimeout(parsedPayment.timeoutId);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // Store payment data in session storage
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        ...message.payload,
        memo,
        redirectUrl, // Store the redirect URL for potential recovery
      }),
    );

    // Setup the return handler BEFORE redirecting
    this.setupReturnUrlHandler(memo, resolve, reject);

    // Open payment page in current window
    const paymentUrl = new URL(this.allowedOrigin);
    paymentUrl.pathname = `/${message.payload.address}`;

    // Encode all parameters properly
    paymentUrl.searchParams.set(
      URL_PARAMS_REQUEST.REDIRECT_URL,
      encodeURIComponent(redirectUrl),
    );
    paymentUrl.searchParams.set(URL_PARAMS_REQUEST.MEMO, memo);
    paymentUrl.searchParams.set(
      URL_PARAMS_REQUEST.AMOUNT,
      message.payload.amount.toString(),
    );
    paymentUrl.searchParams.set(
      URL_PARAMS_REQUEST.CURRENCY,
      message.payload.currency,
    );

    // Navigate to the payment URL
    window.location.href = paymentUrl.toString();
  }

  private setupReturnUrlHandler(
    memo: string,
    resolve: (value: PaymentResponseMessage['payload']) => void,
    reject: (reason: Error) => void,
  ): void {
    // Create a function to handle URL parameters
    const handleReturn = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const returnedMemo = urlParams.get(URL_PARAMS.MEMO);
      const status = urlParams.get(URL_PARAMS.STATUS);
      const txHash = urlParams.get(URL_PARAMS.TX_HASH);
      const chainId = urlParams.get(URL_PARAMS.CHAIN_ID);

      // Only process if this is our memo
      if (returnedMemo === memo) {
        // Clean up URL parameters
        const cleanUrl = window.location.href.split('?')[0];
        window.history.replaceState({}, document.title, cleanUrl);

        // Clean up storage regardless of outcome
        sessionStorage.removeItem(STORAGE_KEY);

        // Remove the visibility change listener
        document.removeEventListener('visibilitychange', visibilityHandler);

        if (status === URL_PARAMS.STATUS_SUCCESS && txHash && chainId) {
          resolve({
            txHash,
            chainId: parseInt(chainId, 10),
          });
        } else if (status === URL_PARAMS.STATUS_CANCELLED) {
          reject(new Error('Payment was cancelled'));
        } else {
          reject(new Error('Payment failed'));
        }
      }
    };

    // Create a named function for the visibility handler so we can remove it later
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        handleReturn();
      }
    };

    // Set up visibility change listener for tab switch
    document.addEventListener('visibilitychange', visibilityHandler);

    // Check if we're already on the return URL
    handleReturn();

    // Set up a timeout to clean up if no response is received
    const cleanupTimeout = setTimeout(
      () => {
        document.removeEventListener('visibilitychange', visibilityHandler);
        reject(new Error('Payment request timed out'));
        sessionStorage.removeItem(STORAGE_KEY);
      },
      process.env.NODE_ENV === 'test' ? TEST_TIMEOUT_MS : PAYMENT_TIMEOUT_MS,
    );

    // Store the timeout ID in session storage so we can clear it if needed
    const existingData = sessionStorage.getItem(STORAGE_KEY);
    if (existingData) {
      const parsedData = JSON.parse(existingData);
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...parsedData,
          timeoutId: cleanupTimeout,
        }),
      );
    }
  }

  private setupPaymentTimeout(reject: (reason: Error) => void): NodeJS.Timeout {
    return setTimeout(
      () => {
        this.messageListeners.delete(MESSAGE_TYPE.SUCCESS);
        this.messageListeners.delete(MESSAGE_TYPE.CANCELLED);
        reject(new Error('Payment request timed out'));
      },
      process.env.NODE_ENV === 'test' ? TEST_TIMEOUT_MS : PAYMENT_TIMEOUT_MS,
    );
  }

  /**
   * Sends a close message to the parent window.
   */
  public sendCloseMessage(targetOrigin: string): void {
    const message: CloseMessage = {
      type: MESSAGE_TYPE.CLOSE,
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

  /**
   * Attempts to recover an in-progress payment after page reload
   * @returns Promise that resolves if a payment is recovered and completed
   */
  public recoverPendingPayment(): Promise<
    PaymentResponseMessage['payload'] | null
  > {
    return new Promise((resolve, reject) => {
      // First check if we have URL parameters that indicate a completed payment
      const urlParams = new URLSearchParams(window.location.search);
      const txHash = urlParams.get(URL_PARAMS.TX_HASH);
      const chainId = urlParams.get(URL_PARAMS.CHAIN_ID);
      const status = urlParams.get(URL_PARAMS.STATUS);

      // If we have transaction data in the URL, return it immediately
      if (txHash && chainId) {
        // Clean up URL parameters
        const cleanUrl = window.location.href.split('?')[0];
        window.history.replaceState({}, document.title, cleanUrl);

        // Clean up storage
        sessionStorage.removeItem(STORAGE_KEY);

        resolve({
          txHash,
          chainId: parseInt(chainId, 10),
        });
        return;
      }

      // If payment was cancelled via URL params
      if (status === URL_PARAMS.STATUS_CANCELLED) {
        // Clean up URL parameters
        const cleanUrl = window.location.href.split('?')[0];
        window.history.replaceState({}, document.title, cleanUrl);

        // Clean up storage
        sessionStorage.removeItem(STORAGE_KEY);

        reject(new Error('Payment was cancelled'));
        return;
      }

      // Continue with existing session storage recovery logic
      const storedPayment = sessionStorage.getItem(STORAGE_KEY);
      if (!storedPayment) {
        resolve(null);
        return;
      }

      try {
        const payment = JSON.parse(storedPayment);
        const now = Date.now();

        // Check if the payment request is still valid (not expired)
        if (payment.timestamp && now - payment.timestamp > PAYMENT_TIMEOUT_MS) {
          sessionStorage.removeItem(STORAGE_KEY);
          resolve(null);
          return;
        }

        // If we have a memo, set up the return handler
        if (payment.memo) {
          this.setupReturnUrlHandler(payment.memo, resolve, reject);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
          resolve(null);
        }
      } catch (error) {
        console.warn('Failed to recover payment:', error);
        sessionStorage.removeItem(STORAGE_KEY);
        resolve(null);
      }
    });
  }
}
