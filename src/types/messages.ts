import {
  Payment,
  PaymentRequestData,
  SiweRequestData,
  SiweResponseData,
  UserContext,
} from './messagePayload';

const MESSAGE_RESPONSE_PAYLOADS = {
  PAYMENT_SUCCESS: {} as Payment,
  PAYMENT_CANCELLED: undefined,
  USER_CONTEXT_RESPONSE: {} as UserContext,
  ENS_NOT_FOUND: undefined, // When user request payment for an ENS name that is not found
  SIWE_RESPONSE: {} as SiweResponseData, // Response from SIWE message signing
} as const;

const MESSAGE_REQUEST_PAYLOADS = {
  PAYMENT_REQUEST: {} as PaymentRequestData,
  USER_CONTEXT_REQUEST: undefined,
  CLOSE: undefined,
  SIWE_REQUEST: {} as SiweRequestData, // Request to sign a SIWE message
} as const;

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

export type MessageResponseType = keyof typeof MESSAGE_RESPONSE_PAYLOADS;
export type MessageRequestType = keyof typeof MESSAGE_REQUEST_PAYLOADS;

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

// Export these constants for use in the utility functions
export { MESSAGE_REQUEST_PAYLOADS, MESSAGE_RESPONSE_PAYLOADS };
