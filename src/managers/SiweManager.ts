import { CommunicationManager } from './CommunicationManager';
import { MESSAGE_RESPONSE_TYPE, RequestMessage } from '../types/messages';
import { SiweRequestData, SiweResponseData } from '../types/messagePayload';
import { createRequestMessage } from '../utils/messageUtils';
import { isInIframe } from '../utils/isInIframe';
import { YappSDKConfig } from '@types';

export class SiweManager extends CommunicationManager {
  constructor(config: YappSDKConfig) {
    super(config);
  }

  /**
   * Signs a SIWE (Sign-In with Ethereum) message
   *
   * @param siweData - The SIWE message data to be signed
   * @returns Promise that resolves with a signature and address when successful
   * @throws {Error} If the request is cancelled, times out, or encounters other errors
   */
  public async signSiweMessage(
    siweData: SiweRequestData,
  ): Promise<SiweResponseData> {
    return new Promise((resolve, reject) => {
      // Create the message
      const message = createRequestMessage('SIWE_REQUEST', siweData);

      // Check if running in iframe
      if (!isInIframe()) {
        reject(new Error('SIWE signing is only supported in iframe mode'));
        return;
      }

      // Add listener for signature success
      const successListener = (response: any) => {
        clearTimeout(timeout);
        this.removeMessageListener(
          MESSAGE_RESPONSE_TYPE.PAYMENT_CANCELLED,
          cancelListener,
        );
        resolve(response.payload);
      };

      // Add listener for cancellation
      const cancelListener = () => {
        clearTimeout(timeout);
        this.removeMessageListener(
          MESSAGE_RESPONSE_TYPE.SIWE_RESPONSE,
          successListener,
        );
        reject(new Error('Signature request was cancelled'));
      };

      // Set up timeout
      const timeout = setTimeout(
        () => {
          this.removeMessageListener(
            MESSAGE_RESPONSE_TYPE.SIWE_RESPONSE,
            successListener,
          );
          this.removeMessageListener(
            MESSAGE_RESPONSE_TYPE.PAYMENT_CANCELLED,
            cancelListener,
          );
          reject(new Error('Signature request timed out'));
        },
        5 * 60 * 1000,
      ); // 5 minute timeout like payment

      // Register listeners
      this.addMessageListener(
        MESSAGE_RESPONSE_TYPE.SIWE_RESPONSE,
        successListener,
      );

      this.addMessageListener(
        MESSAGE_RESPONSE_TYPE.PAYMENT_CANCELLED,
        cancelListener,
      );

      // Send the message
      try {
        this.sendMessageToParent(message, super.getAllowedOrigin());
      } catch (error) {
        clearTimeout(timeout);
        this.removeMessageListener(
          MESSAGE_RESPONSE_TYPE.SIWE_RESPONSE,
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
    });
  }
}
