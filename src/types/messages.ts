import { Payment, UserContext, PaymentRequest } from './messagePayload';

/**
 * The definitive map of all message types to their payload types
 * This is our single source of truth
 */
export const MESSAGE_PAYLOADS = {
  PAYMENT_REQUEST: {} as PaymentRequest,
  PAYMENT_SUCCESS: {} as Payment,
  PAYMENT_CANCELLED: undefined,
  CLOSE: undefined,
  USER_CONTEXT_REQUEST: undefined,
  USER_CONTEXT_RESPONSE: {} as UserContext,
} as const;

export const MESSAGE_TYPE = Object.keys(MESSAGE_PAYLOADS).reduce(
  (acc, key) => ({ ...acc, [key]: key }),
  {},
) as { [K in keyof typeof MESSAGE_PAYLOADS]: K };

export type MessageType = keyof typeof MESSAGE_PAYLOADS;

/**
 * Base interface for all message types
 */
export type Message<T extends MessageType = MessageType> = {
  type: T;
  payload: (typeof MESSAGE_PAYLOADS)[T];
};

/**
 * Typed message creator functions
 */
export const createMessage = {
  PAYMENT_REQUEST: (payload: PaymentRequest): Message<'PAYMENT_REQUEST'> => ({
    type: 'PAYMENT_REQUEST',
    payload,
  }),

  PAYMENT_SUCCESS: (payload: Payment): Message<'PAYMENT_SUCCESS'> => ({
    type: 'PAYMENT_SUCCESS',
    payload,
  }),

  PAYMENT_CANCELLED: (): Message<'PAYMENT_CANCELLED'> => ({
    type: 'PAYMENT_CANCELLED',
    payload: undefined,
  }),

  CLOSE: (): Message<'CLOSE'> => ({
    type: 'CLOSE',
    payload: undefined,
  }),

  USER_CONTEXT_REQUEST: (): Message<'USER_CONTEXT_REQUEST'> => ({
    type: 'USER_CONTEXT_REQUEST',
    payload: undefined,
  }),

  USER_CONTEXT_RESPONSE: (
    payload: UserContext,
  ): Message<'USER_CONTEXT_RESPONSE'> => ({
    type: 'USER_CONTEXT_RESPONSE',
    payload,
  }),
};
