import { UserContext } from '../types/messagePayload';
import {
  createRequestMessage,
  MESSAGE_RESPONSE_TYPE,
  RequestMessage,
  ResponseMessage,
} from '../types/messages';
import { getSafeWindow, isBrowser } from '../utils/safeWindow';

/**
 * Manages secure communication between the Yapp and its parent window.
 *
 * Handles sending and receiving messages with proper origin validation,
 * primarily using the postMessage API for iframe-based communication.
 *
 * @throws {Error} If messages are sent outside an iframe or to invalid origins
 */
export class CommunicationManager {
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
   */
  protected isOriginAllowed(origin: string): boolean {
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
   * Registers a message listener for a specific message type.
   *
   * @param messageType - The type of message to listen for
   * @param listener - The callback function to execute when the message is received
   * @returns The registered listener for cleanup
   */
  protected addMessageListener(
    messageType: string,
    listener: (response: any) => void,
  ): (response: any) => void {
    const listeners = this.messageListeners.get(messageType) || [];
    listeners.push(listener);
    this.messageListeners.set(messageType, listeners);
    return listener;
  }

  /**
   * Removes a specific message listener for a message type.
   *
   * @param messageType - The type of message
   * @param listener - The listener to remove
   */
  protected removeMessageListener(
    messageType: string,
    listener: (response: any) => void,
  ): void {
    const listeners = this.messageListeners.get(messageType) || [];
    const filteredListeners = listeners.filter((l) => l !== listener);

    if (filteredListeners.length > 0) {
      this.messageListeners.set(messageType, filteredListeners);
    } else {
      this.messageListeners.delete(messageType);
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
   */
  public getUserContext(): Promise<UserContext> {
    return new Promise((resolve, reject) => {
      const win = getSafeWindow();
      if (!win || !win.parent) {
        reject(new Error('Cannot access window object'));
        return;
      }

      // Set up listener for the response
      const listener = (response: any) => {
        resolve(response.payload);
      };
      this.addMessageListener(
        MESSAGE_RESPONSE_TYPE.USER_CONTEXT_RESPONSE,
        listener,
      );

      // Set timeout (5 second)
      const timeoutId = setTimeout(() => {
        this.removeMessageListener(
          MESSAGE_RESPONSE_TYPE.USER_CONTEXT_RESPONSE,
          listener,
        );
        reject(new Error('User context request timed out'));
      }, 5000);

      // Send the request
      const message = createRequestMessage('USER_CONTEXT_REQUEST', undefined);

      try {
        this.sendMessageToParent(message, this.allowedOrigin);
      } catch (error) {
        clearTimeout(timeoutId);
        this.removeMessageListener(
          MESSAGE_RESPONSE_TYPE.USER_CONTEXT_RESPONSE,
          listener,
        );
        reject(error);
      }
    });
  }

  /**
   * Sends a close message to the parent window.
   *
   * @param targetOrigin - The target origin to send the message to
   * @throws {Error} If the origin is not allowed or if not running in an iframe
   */
  public sendCloseMessage(targetOrigin: string): void {
    const message = createRequestMessage('CLOSE', undefined);
    this.sendMessageToParent(message, targetOrigin);
  }

  /**
   * Internal method to send messages to parent window.
   *
   * @param message - The message to send
   * @param targetOrigin - The target origin to send the message to
   * @throws {Error} If the origin is not allowed or if not running in an iframe
   */
  protected sendMessageToParent(
    message: RequestMessage | ResponseMessage,
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
