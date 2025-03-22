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

// Generate the MESSAGE_TYPE constant from our payload map
export const MESSAGE_TYPE = Object.keys(MESSAGE_PAYLOADS).reduce(
  (acc, key) => ({ ...acc, [key]: key }),
  {},
) as { [K in keyof typeof MESSAGE_PAYLOADS]: K };

// Extract the message type string literals
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

/**
 * Type guard functions to narrow message types at runtime
 */
export const isMessageOfType = <T extends MessageType>(
  message: any, // this is ok, as we only check the type of the message.
  type: T,
): message is Message<T> => {
  return message.type === type;
};

// Helper type for message handlers
export type MessageHandler<T extends MessageType> = (
  message: Message<T>,
) => void;

// Handle a message with proper type narrowing
function handleMessage(message: Message) {
  if (isMessageOfType(message, 'PAYMENT_SUCCESS')) {
    // TypeScript knows message.payload is of type Payment
    console.log(message.payload.txHash);
  } else if (isMessageOfType(message, 'USER_CONTEXT_RESPONSE')) {
    // TypeScript knows message.payload is of type UserContext
    console.log(message.payload.address);
  } else if (isMessageOfType(message, 'PAYMENT_CANCELLED')) {
    // No payload property exists here
    console.log('Payment was cancelled');
  }
}
