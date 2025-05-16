import {
  MESSAGE_RESPONSE_TYPE,
  SaveCookiesRequestData,
  SaveCookiesResponseData,
  GetCookiesRequestData,
  GetCookiesResponseData,
  YappSDKConfig,
  Cookie,
} from '@types';
import { createRequestMessage, isInIframe } from '@utils';
import { CommunicationManager } from './CommunicationManager';

/**
 * Manages cookie/localStorage communication and processes.
 *
 * Exposes setters and getters for yapp cookies stored in super app localStorage.
 *
 * @extends CommunicationManager
 */
export class CookieManager extends CommunicationManager {
  private readonly IFRAME_REQUIRED_ERROR =
    'Access to Yapp Cookiestore is only supported in iframe mode';
  private readonly DEFAULT_EXPIRY = 1000 * 60 * 60 * 24 * 7; // 7 days

  /**
   * Creates a new PaymentManager instance.
   *
   * @param config - The configuration options for the SDK
   */
  constructor(config: YappSDKConfig) {
    super(config);
  }

  /**
   * Saves cookies in the super app localStorage.
   *
   * @param cookies - The cookies to save
   * @returns Promise that resolves with the saved cookies
   * @throws (Error) If the cookie persistence request times out or an unknown error occurs
   */
  public async saveCookies(
    cookies: SaveCookiesRequestData,
  ): Promise<SaveCookiesResponseData> {
    return new Promise((resolve, reject) => {
      // Added expiry if not provided. Defaults to 7 days
      const cookiesWithExpiry: Cookie[] = cookies.map((cookie) => ({
        key: cookie.key,
        data: {
          ...cookie.data,
          exp: cookie.data.exp || Date.now() + this.DEFAULT_EXPIRY,
        },
      }));

      // Create the message
      const message = createRequestMessage(
        'SAVE_COOKIES_REQUEST',
        cookiesWithExpiry,
      );

      // Check if running in iframe
      if (!isInIframe()) {
        reject(new Error(this.IFRAME_REQUIRED_ERROR));
        return;
      }

      // Add listener for cookie persistence success
      const successListener = (response: any) => {
        clearTimeout(timeout);
        resolve(response.payload);
      };

      // Set up timeout
      const timeout = setTimeout(
        () => {
          this.removeMessageListener(
            MESSAGE_RESPONSE_TYPE.SAVE_COOKIES_RESPONSE,
            successListener,
          );
          reject(new Error('Cookie persistence request timed out'));
        },
        5 * 60 * 1000,
      ); // 5 minute timeout like payment

      this.addMessageListener(
        MESSAGE_RESPONSE_TYPE.SAVE_COOKIES_RESPONSE,
        successListener,
      );

      // Send the message
      try {
        this.sendMessageToParent(message, super.getAllowedOrigin());
      } catch (error) {
        clearTimeout(timeout);
        this.removeMessageListener(
          MESSAGE_RESPONSE_TYPE.SAVE_COOKIES_RESPONSE,
          successListener,
        );

        if (error instanceof Error) {
          reject(error);
        } else {
          reject(new Error('Unknown error ' + error));
        }
      }
    });
  }

  /**
   * Gets cookies from the super app localStorage.
   *
   * @param keys - Optional array of cookie keys to retrieve
   * @returns Promise that resolves with the requested cookies
   * @throws (Error) If the cookie retrieval request times out or an unknown error occurs
   */
  public async getCookies(
    keys?: GetCookiesRequestData,
  ): Promise<GetCookiesResponseData> {
    return new Promise((resolve, reject) => {
      // Create the message
      const message = createRequestMessage('GET_COOKIES_REQUEST', keys);

      // Check if running in iframe
      if (!isInIframe()) {
        reject(new Error(this.IFRAME_REQUIRED_ERROR));
        return;
      }

      // Add listener for cookie retrieval success
      const successListener = (response: any) => {
        clearTimeout(timeout);
        resolve(response.payload);
      };

      // Set up timeout
      const timeout = setTimeout(
        () => {
          this.removeMessageListener(
            MESSAGE_RESPONSE_TYPE.GET_COOKIES_RESPONSE,
            successListener,
          );
          reject(new Error('Cookie retrieval request timed out'));
        },
        5 * 60 * 1000,
      ); // 5 minute timeout like payment

      this.addMessageListener(
        MESSAGE_RESPONSE_TYPE.GET_COOKIES_RESPONSE,
        successListener,
      );

      // Send the message
      try {
        this.sendMessageToParent(message, super.getAllowedOrigin());
      } catch (error) {
        clearTimeout(timeout);
        this.removeMessageListener(
          MESSAGE_RESPONSE_TYPE.GET_COOKIES_RESPONSE,
          successListener,
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
