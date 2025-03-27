import { createRequestMessage, FiatCurrency, Hex, MESSAGE_RESPONSE_TYPE, Payment, PaymentConfig, RequestMessage } from "@types";
import { CommunicationManager } from "./CommunicationManager";
import { createValidMemoFromUUID, isInIframe, isValidFiatCurrency, isValidMemoSize } from "@utils";
import { PAYMENT_TIMEOUT_MS, STORAGE_KEY, TEST_TIMEOUT_MS, URL_PARAMS, URL_PARAMS_REQUEST } from "@constants";

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
   */
  constructor(allowedOrigin: string) {
    super(allowedOrigin);
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
   */
  public sendPaymentRequest(
    address: Hex,
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
        address,
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

  private handleIframePayment(
    message: RequestMessage<'PAYMENT_REQUEST'>,
    resolve: (value: Payment) => void,
    reject: (reason: Error) => void,
  ): void {
    console.info(`Handling iframe payment for ${message.payload.address}`);

    // Add listener for payment success
    const successListener = (response: any) => {
      clearTimeout(timeout);
      this.removeMessageListener(
        MESSAGE_RESPONSE_TYPE.PAYMENT_CANCELLED,
        cancelListener,
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
      reject(new Error('Payment was cancelled'));
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
    ]);

    this.addMessageListener(
      MESSAGE_RESPONSE_TYPE.PAYMENT_SUCCESS,
      successListener,
    );

    this.addMessageListener(
      MESSAGE_RESPONSE_TYPE.PAYMENT_CANCELLED,
      cancelListener,
    );

    try {
      this.sendMessageToParent(message, this.getAllowedOrigin());
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

      if (error instanceof Error) {
        reject(error);
      } else {
        reject(new Error('Unknown error ' + error));
      }
    }
  }

  private handleRedirectPayment(
    message: RequestMessage<'PAYMENT_REQUEST'>,
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
    const paymentUrl = new URL(this.getAllowedOrigin());
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
   * Get the allowed origin for this payment manager.
   *
   * @returns The allowed origin
   */
  protected getAllowedOrigin(): string {
    return super['allowedOrigin'];
  }
}
