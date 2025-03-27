import {
  PAYMENT_TIMEOUT_MS,
  STORAGE_KEY,
  TEST_TIMEOUT_MS,
  URL_PARAMS,
  URL_PARAMS_REQUEST,
} from '@constants';
import {
  FiatCurrency,
  Hex,
  MESSAGE_RESPONSE_TYPE,
  Payment,
  PaymentConfig,
  PaymentStatus,
  RequestMessage,
} from '@types';
import {
  createRequestMessage,
  createValidMemoFromUUID,
  isInIframe,
  isValidFiatCurrency,
  isValidMemoSize,
} from '@utils';
import { CommunicationManager } from './CommunicationManager';

/**
 * Manages payment-related communication and processes.
 *
 * Handles the payment flows in two modes:
 * 1. Iframe mode: Communication via postMessage API
 * 2. Redirect mode: Communication via URL parameters and page redirects
 *
 * @extends CommunicationManager
 */
export class PaymentManager extends CommunicationManager {
  /**
   * Creates a new PaymentManager instance.
   *
   * @param allowedOrigin - The allowed origin for communication
   * @param apiUrl - The API URL
   */
  constructor(allowedOrigin: string, apiUrl: string) {
    super(allowedOrigin, apiUrl);
  }

  /**
   * Sends a payment request message to the parent window and waits for response.
   * Supports two modes of operation:
   * - Iframe mode: Uses postMessage API for communication
   * - Redirect mode: Uses URL parameters and page redirects
   *
   * @param addressOrEns - The recipient's blockchain address or ENS name
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
   *   - ENS name is not found ("ENS name not found: [name]")
   */
  public sendPaymentRequest(
    addressOrEns: string,
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

      const message = createRequestMessage('PAYMENT_REQUEST', {
        addressOrEns,
        amount: config.amount,
        currency: config.currency,
        memo: config.memo,
      });

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

  /**
   * Handles payment requests in iframe mode using postMessage API.
   * Sets up event listeners for payment success, cancellation, and ENS resolution errors.
   *
   * @param message - The payment request message to send to the parent window
   * @param resolve - The promise resolve function
   * @param reject - The promise reject function
   * @private
   */
  private handleIframePayment(
    message: RequestMessage<'PAYMENT_REQUEST'>,
    resolve: (value: Payment) => void,
    reject: (reason: Error) => void,
  ): void {
    console.info(`Handling iframe payment for ${message.payload.addressOrEns}`);

    // Add listener for payment success
    const successListener = (response: any) => {
      clearTimeout(timeout);
      this.removeMessageListener(
        MESSAGE_RESPONSE_TYPE.PAYMENT_CANCELLED,
        cancelListener,
      );
      this.removeMessageListener(
        MESSAGE_RESPONSE_TYPE.ENS_NOT_FOUND,
        ensNotFoundListener,
      );
      resolve(response.payload);
    };

    // Add listener for payment cancellation
    const cancelListener = () => {
      clearTimeout(timeout);
      this.removeMessageListener(
        MESSAGE_RESPONSE_TYPE.PAYMENT_SUCCESS,
        successListener,
      );
      this.removeMessageListener(
        MESSAGE_RESPONSE_TYPE.ENS_NOT_FOUND,
        ensNotFoundListener,
      );
      reject(new Error('Payment was cancelled'));
    };

    // Add listener for ENS not found
    const ensNotFoundListener = (response: any) => {
      clearTimeout(timeout);
      this.removeMessageListener(
        MESSAGE_RESPONSE_TYPE.PAYMENT_SUCCESS,
        successListener,
      );
      this.removeMessageListener(
        MESSAGE_RESPONSE_TYPE.PAYMENT_CANCELLED,
        cancelListener,
      );
      const ensName = response.payload?.ensName || message.payload.addressOrEns;
      reject(new Error(`ENS name not found: ${ensName}`));
    };

    const timeout = this.setupPaymentTimeout(reject, [
      {
        type: MESSAGE_RESPONSE_TYPE.PAYMENT_SUCCESS,
        listener: successListener,
      },
      {
        type: MESSAGE_RESPONSE_TYPE.PAYMENT_CANCELLED,
        listener: cancelListener,
      },
      {
        type: MESSAGE_RESPONSE_TYPE.ENS_NOT_FOUND,
        listener: ensNotFoundListener,
      },
    ]);

    this.addMessageListener(
      MESSAGE_RESPONSE_TYPE.PAYMENT_SUCCESS,
      successListener,
    );

    this.addMessageListener(
      MESSAGE_RESPONSE_TYPE.PAYMENT_CANCELLED,
      cancelListener,
    );

    this.addMessageListener(
      MESSAGE_RESPONSE_TYPE.ENS_NOT_FOUND,
      ensNotFoundListener,
    );

    try {
      this.sendMessageToParent(message, super.getAllowedOrigin());
    } catch (error) {
      clearTimeout(timeout);
      this.removeMessageListener(
        MESSAGE_RESPONSE_TYPE.PAYMENT_SUCCESS,
        successListener,
      );
      this.removeMessageListener(
        MESSAGE_RESPONSE_TYPE.PAYMENT_CANCELLED,
        cancelListener,
      );
      this.removeMessageListener(
        MESSAGE_RESPONSE_TYPE.ENS_NOT_FOUND,
        ensNotFoundListener,
      );

      if (error instanceof Error) {
        reject(error);
      } else {
        reject(new Error('Unknown error ' + error));
      }
    }
  }

  /**
   * Handles payment requests in redirect mode.
   * Stores payment info in session storage, sets up return handler, and redirects to payment page.
   *
   * @param message - The payment request message
   * @param redirectUrl - URL to redirect back to after payment
   * @param resolve - The promise resolve function
   * @param reject - The promise reject function
   * @private
   */
  private handleRedirectPayment(
    message: RequestMessage<'PAYMENT_REQUEST'>,
    redirectUrl: string,
    resolve: (value: Payment) => void,
    reject: (reason: Error) => void,
  ): void {
    console.info(
      `Handling redirect payment for ${message.payload.addressOrEns}`,
    );

    // Generate or use existing memo
    const memo =
      message.payload.memo ||
      createValidMemoFromUUID(message.payload.addressOrEns);

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
    const paymentUrl = new URL(super.getAllowedOrigin());
    paymentUrl.pathname = `/${message.payload.addressOrEns}`;

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

  /**
   * Sets up a handler for processing URL parameters when redirected back from the payment page.
   * Uses the memo to match the returning payment with the original request.
   * Handles success, cancellation, and timeout scenarios.
   *
   * @param memo - The payment memo used to match returning payments
   * @param resolve - The promise resolve function
   * @param reject - The promise reject function
   * @private
   */
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
      const txHash = urlParams.get(URL_PARAMS.TX_HASH) as Hex;
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

  /**
   * Sets up a timeout for payment requests.
   * If the timeout is reached, cleans up all listeners and rejects the promise with a timeout error.
   *
   * @param reject - The promise reject function
   * @param listenersToCleanup - Array of message listeners to clean up on timeout
   * @returns A timeout ID that can be used to clear the timeout
   * @private
   */
  private setupPaymentTimeout(
    reject: (reason: Error) => void,
    listenersToCleanup: Array<{
      type: string;
      listener: (response: any) => void;
    }>,
  ): NodeJS.Timeout {
    return setTimeout(
      () => {
        // Clean up all listeners
        listenersToCleanup.forEach(({ type, listener }) => {
          this.removeMessageListener(type, listener);
        });

        reject(new Error('Payment request timed out'));
      },
      process.env.NODE_ENV === 'test' ? TEST_TIMEOUT_MS : PAYMENT_TIMEOUT_MS,
    );
  }

  /**
   * Get the status of a payment.
   *
   * @param txHash - The transaction hash of the payment
   * @returns Promise that resolves with payment status
   * @throws {Error} If the SDK is not initialized or request times out
   */
  public async getPayment(txHash: Hex) {
    const response = await fetch(
      `${this.getApiUrl()}/api/v1/payments/${txHash}`,
    );
    const payment = (await response.json()) as PaymentStatus;

    if ('error' in payment) {
      throw new Error(payment.error);
    }

    return payment.payment;
  }
}
