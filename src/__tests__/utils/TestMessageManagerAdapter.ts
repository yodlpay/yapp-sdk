import { CommunicationManager } from '../../managers/CommunicationManager';
import { PaymentManager } from '../../managers/PaymentManager';
import { PaymentConfig } from '../../types/config';
import { Payment, UserContext } from '../../types/messagePayload';
import { RequestMessage } from '../../types/messages';
import { Hex } from '../../types/utils';

/**
 * Adapter class for tests that were previously using MessageManager
 *
 * This class provides the same interface as the old MessageManager,
 * but delegates to the new specialized manager classes.
 *
 * @internal This class is only for test compatibility and should not be used in production code
 */
export class MessageManager {
  private communicationManager: CommunicationManager;
  private paymentManager: PaymentManager;

  /** @internal For testing purposes only */
  public readonly allowedOrigin: string;

  constructor(allowedOrigin: string, apiUrl: string) {
    this.allowedOrigin = allowedOrigin;
    this.communicationManager = new CommunicationManager(allowedOrigin, apiUrl);
    this.paymentManager = new PaymentManager(allowedOrigin, apiUrl);
  }

  public getUserContext(): Promise<UserContext> {
    return this.communicationManager.getUserContext();
  }

  public sendPaymentRequest(
    address: Hex,
    config: PaymentConfig,
  ): Promise<Payment> {
    return this.paymentManager.sendPaymentRequest(address, config);
  }

  public sendCloseMessage(targetOrigin: string): void {
    this.communicationManager.sendCloseMessage(targetOrigin);
  }

  /** @internal For testing purposes only */
  public isOriginAllowed(origin: string): boolean {
    return (
      origin === this.allowedOrigin ||
      new URL(origin).origin === new URL(this.allowedOrigin).origin
    );
  }

  /**
   * @internal For testing purposes only - handles iframe payment flow
   */
  public handleIframePayment(
    message: RequestMessage<'PAYMENT_REQUEST'>,
    resolve: (value: Payment) => void,
    reject: (reason: Error) => void,
  ): void {
    // Implementation just for test mocking - actual implementation in PaymentManager
    console.info(
      `[TEST] Mock iframe payment for ${message.payload.addressOrEns}`,
    );
  }

  /**
   * @internal For testing purposes only - handles redirect payment flow
   */
  public handleRedirectPayment(
    message: RequestMessage<'PAYMENT_REQUEST'>,
    redirectUrl: string,
    resolve: (value: Payment) => void,
    reject: (reason: Error) => void,
  ): void {
    // Implementation just for test mocking - actual implementation in PaymentManager
    console.info(
      `[TEST] Mock redirect payment for ${message.payload.addressOrEns}`,
    );
  }

  /**
   * @internal For testing purposes only - sends message to parent window
   */
  public sendMessageToParent(message: any, targetOrigin: string): void {
    if (!this.isOriginAllowed(targetOrigin)) {
      throw new Error(
        `Invalid origin "${targetOrigin}". Expected "${this.allowedOrigin}".`,
      );
    }

    // Delegate to communication manager
    this.communicationManager['sendMessageToParent'](message, targetOrigin);
  }
}
