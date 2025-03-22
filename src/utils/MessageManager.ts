import { PaymentConfig } from '../types/config';
import { FiatCurrency } from '../types/currency';
import {
  CloseMessage,
  Payment,
  PaymentRequestMessage,
  PaymentResponseMessage,
  UserContext,
  UserContextRequestMessage,
  UserContextResponseMessage,
} from '../types/messages';
import { isValidFiatCurrency } from './currencyValidation';
import { isInIframe } from './isInIframe';
import { createValidMemoFromUUID, isValidMemoSize } from './memoValidation';
import { getSafeWindow, isBrowser } from './safeWindow';

// Message types
export const MESSAGE_TYPE = {
  PAYMENT_REQUEST: 'PAYMENT_REQUEST',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_CANCELLED: 'PAYMENT_CANCELLED',
  CLOSE: 'CLOSE',
  USER_CONTEXT_REQUEST: 'USER_CONTEXT_REQUEST',
  USER_CONTEXT_RESPONSE: 'USER_CONTEXT_RESPONSE',
} as const;

export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];

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
 * It supports two payment flow modes:
 * 1. Iframe mode: Communication via postMessage API
 * 2. Redirect mode: Communication via URL parameters and page redirects
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
 *     currency: FiatCurrency.USD,
 *     memo: 'Service payment',
 *     redirectUrl: 'https://myapp.com/payment-callback' // Required when not in iframe
 *   });
 *
 *   // Handle successful response
 *   console.log(`Transaction: ${response.txHash} on chain ${response.chainId}`);
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
   * Compares the origins by parsing them as URLs and checking their origin property.
   *
   * @param origin - The origin to validate
   * @returns True if the origin is allowed, false otherwise
   * @private
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
   * Sends a user context request message to the parent window and waits for response.
   * This method retrieves information about the current user's blockchain identity.
   *
   * @returns Promise that resolves with user context information including address, ENS names, and community details
   * @throws {Error} If:
   *   - Request times out ("User context request timed out") after 5 seconds
   *   - Message is sent to an invalid origin
   *
   * @example
   * ```typescript
   * try {
   *   const userContext = await messaging.getUserContext();
   *
   *   // Handle successful response
   *   console.log('User address:', userContext.address);
   *   console.log('Primary ENS:', userContext.primaryEnsName);
   *
   *   // Handle nested community object
   *   if (userContext.community) {
   *     console.log('Community address:', userContext.community.address);
   *     console.log('Community ENS:', userContext.community.ensName);
   *     console.log('Community User ENS:', userContext.community.userEnsName);
   *   }
   * } catch (error) {
   *   if (error.message === 'User context request timed out') {
   *     console.log('Request timed out after 5 seconds');
   *   } else {
   *     console.error('Failed to get user context:', error);
   *   }
   * }
   * ```
   */
  public getUserContext(): Promise<UserContext> {
    return new Promise((resolve, reject) => {
      const win = getSafeWindow();
      if (!win || !win.parent) {
        reject(new Error('Cannot access window object'));
        return;
      }

      // Set up listener for the response
      const listeners =
        this.messageListeners.get(MESSAGE_TYPE.USER_CONTEXT_RESPONSE) || [];
      listeners.push((response) => {
        resolve(response.payload);
      });
      this.messageListeners.set(MESSAGE_TYPE.USER_CONTEXT_RESPONSE, listeners);

      // Set timeout (5 second)
      const timeoutId = setTimeout(() => {
        const remainingListeners =
          this.messageListeners.get(MESSAGE_TYPE.USER_CONTEXT_RESPONSE) || [];
        const filteredListeners = remainingListeners.filter(
          (l) => !listeners.includes(l),
        );

        if (filteredListeners.length > 0) {
          this.messageListeners.set(
            MESSAGE_TYPE.USER_CONTEXT_RESPONSE,
            filteredListeners,
          );
        } else {
          this.messageListeners.delete(MESSAGE_TYPE.USER_CONTEXT_RESPONSE);
        }

        reject(new Error('User context request timed out'));
      }, 5000);

      // Send the request
      const message: UserContextRequestMessage = {
        type: MESSAGE_TYPE.USER_CONTEXT_REQUEST,
      };

      win.parent.postMessage(message, this.allowedOrigin);
    });
  }

  /**
   * Sends a payment request message to the parent window and waits for response.
   * Supports two modes of operation:
   * - Iframe mode: Uses postMessage API for communication
   * - Redirect mode: Uses URL parameters and page redirects
   *
   * @param address - The recipient's blockchain address
   * @param config - Payment configuration options including amount, currency, memo, and redirectUrl
   * @returns Promise that resolves with payment response containing txHash and chainId
   * @throws {Error} If:
   *   - Payment is cancelled ("Payment was cancelled")
   *   - Payment times out ("Payment request timed out") after 5 minutes
   *   - Memo exceeds maximum size of 32 bytes
   *   - Currency is invalid
   *   - Amount is not a positive number
   *   - Running outside iframe without redirectUrl
   *   - Message is sent to an invalid origin
   *
   * @example
   * ```typescript
   * try {
   *   const response = await messaging.sendPaymentRequest('0x123...', {
   *     amount: 100,
   *     currency: FiatCurrency.USD,
   *     memo: 'Premium subscription',
   *     redirectUrl: 'https://myapp.com/callback' // Required when not in iframe
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
  ): Promise<Payment> {
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

      const message: PaymentRequestMessage = {
        type: MESSAGE_TYPE.PAYMENT_REQUEST,
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

      this.handleRedirectPayment(message, config.redirectUrl, resolve, reject);
    });
  }

  private handleIframePayment(
    message: PaymentRequestMessage,
    resolve: (value: Payment) => void,
    reject: (reason: Error) => void,
  ): void {
    console.info(`Handling iframe payment for ${message.payload.address}`);

    // Add listener for payment success
    const successListeners =
      this.messageListeners.get(MESSAGE_TYPE.PAYMENT_SUCCESS) || [];
    const timeout = this.setupPaymentTimeout(reject);

    successListeners.push((response: PaymentResponseMessage) => {
      clearTimeout(timeout);
      this.messageListeners.delete(MESSAGE_TYPE.PAYMENT_CANCELLED);
      resolve(response.payload);
    });
    this.messageListeners.set(MESSAGE_TYPE.PAYMENT_SUCCESS, successListeners);

    // Add listener for payment cancellation
    const cancelListeners =
      this.messageListeners.get(MESSAGE_TYPE.PAYMENT_CANCELLED) || [];
    cancelListeners.push(() => {
      clearTimeout(timeout);
      this.messageListeners.delete(MESSAGE_TYPE.PAYMENT_SUCCESS);
      reject(new Error('Payment was cancelled'));
    });
    this.messageListeners.set(MESSAGE_TYPE.PAYMENT_CANCELLED, cancelListeners);

    try {
      this.sendMessageToParent(message, this.allowedOrigin);
    } catch (error) {
      clearTimeout(timeout);
      this.messageListeners.delete(MESSAGE_TYPE.PAYMENT_SUCCESS);
      this.messageListeners.delete(MESSAGE_TYPE.PAYMENT_CANCELLED);

      if (error instanceof Error) {
        reject(error);
      } else {
        reject(new Error('Unknown error ' + error));
      }
    }
  }

  private handleRedirectPayment(
    message: PaymentRequestMessage,
    redirectUrl: string,
    resolve: (value: Payment) => void,
    reject: (reason: Error) => void,
  ): void {
    console.info(`Handling redirect payment for ${message.payload.address}`);

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
    resolve: (value: Payment) => void,
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

        if (txHash && chainId) {
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
        this.messageListeners.delete(MESSAGE_TYPE.PAYMENT_SUCCESS);
        this.messageListeners.delete(MESSAGE_TYPE.PAYMENT_CANCELLED);
        reject(new Error('Payment request timed out'));
      },
      process.env.NODE_ENV === 'test' ? TEST_TIMEOUT_MS : PAYMENT_TIMEOUT_MS,
    );
  }

  /**
   * Sends a close message to the parent window.
   *
   * @param targetOrigin - The target origin to send the message to
   * @throws {Error} If the origin is not allowed or if not running in an iframe
   *
   * @example
   * ```typescript
   * // Close the Yapp iframe
   * messaging.sendCloseMessage('https://allowed-origin.com');
   * ```
   */
  public sendCloseMessage(targetOrigin: string): void {
    const message: CloseMessage = {
      type: MESSAGE_TYPE.CLOSE,
    };
    this.sendMessageToParent(message, targetOrigin);
  }

  /**
   * Internal method to send messages to parent window.
   *
   * @param message - The message to send
   * @param targetOrigin - The target origin to send the message to
   * @throws {Error} If the origin is not allowed or if not running in an iframe
   * @private
   */
  private sendMessageToParent(
    message: CloseMessage | PaymentRequestMessage,
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
