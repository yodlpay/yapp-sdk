import { Payment, UserContext, PaymentRequest } from './messagePayload';

/**
 * The definitive map of all message types to their payload types
 * This is our single source of truth
 */

export const MESSAGE_RESPONSE_PAYLOADS = {
  PAYMENT_SUCCESS: {} as Payment,
  PAYMENT_CANCELLED: undefined,
  USER_CONTEXT_RESPONSE: {} as UserContext,
} as const;

export const MESSAGE_REQUEST_PAYLOADS = {
  PAYMENT_REQUEST: {} as PaymentRequest,
  USER_CONTEXT_REQUEST: undefined,
  CLOSE: undefined,
} as const;

// Generate the MESSAGE_TYPE constant from our payload map
export const MESSAGE_RESPONSE_TYPE = Object.keys(
  MESSAGE_RESPONSE_PAYLOADS,
).reduce((acc, key) => ({ ...acc, [key]: key }), {}) as {
  [K in keyof typeof MESSAGE_RESPONSE_PAYLOADS]: K;
};

export const MESSAGE_REQUEST_TYPE = Object.keys(
  MESSAGE_REQUEST_PAYLOADS,
).reduce((acc, key) => ({ ...acc, [key]: key }), {}) as {
  [K in keyof typeof MESSAGE_REQUEST_PAYLOADS]: K;
};

// Extract the message type string literals
export type MessageResponseType = keyof typeof MESSAGE_RESPONSE_PAYLOADS;
export type MessageRequestType = keyof typeof MESSAGE_REQUEST_PAYLOADS;

/**
 * Base interface for all message types
 */
export type ResponseMessage<
  T extends MessageResponseType = MessageResponseType,
> = {
  type: T;
  payload: (typeof MESSAGE_RESPONSE_PAYLOADS)[T];
};

export type RequestMessage<T extends MessageRequestType = MessageRequestType> =
  {
    type: T;
    payload: (typeof MESSAGE_REQUEST_PAYLOADS)[T];
  };

export const createResponseMessage = <T extends MessageResponseType>(
  type: T,
  payload?: (typeof MESSAGE_RESPONSE_PAYLOADS)[T],
): ResponseMessage<T> =>
  ({
    type,
    payload,
  }) as ResponseMessage<T>;

export const createRequestMessage = <T extends MessageRequestType>(
  type: T,
  payload?: (typeof MESSAGE_REQUEST_PAYLOADS)[T],
): RequestMessage<T> =>
  ({
    type,
    payload,
  }) as RequestMessage<T>;
