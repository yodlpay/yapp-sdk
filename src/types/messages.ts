import { FiatCurrency } from './currency';

/**
 * Base interface for all message types exchanged between Yapp and parent window
 */
export interface BaseMessage {
  type: string;
  payload?: any;
}

/**
 * Message sent to close the Yapp iframe
 */
export interface CloseMessage extends BaseMessage {
  type: 'CLOSE';
}

/**
 * Message sent to request a payment
 */
export interface PaymentMessage extends BaseMessage {
  type: 'PAYMENT_REQUEST';
  payload: {
    address: string; // Recipient's blockchain address
    amount: number; // Payment amount
    currency: FiatCurrency; // Payment currency
    memo?: string; // Optional payment description
  };
}

/**
 * Message received when payment is successful
 */
export interface PaymentResponseMessage extends BaseMessage {
  type: 'PAYMENT_SUCCESS';
  payload: {
    txHash: string; // Transaction hash
    chainId: number; // Chain ID where transaction was executed
  };
}

/**
 * Message received when payment is cancelled
 */
export interface PaymentCancelledMessage extends BaseMessage {
  type: 'PAYMENT_CANCELLED';
}

/**
 * Community information structure
 */
export interface Community {
  address: string;
  ensName: string;
  userEnsName: string;
}

/**
 * Message received when user context is requested
 */
export interface UserContextResponseMessage extends BaseMessage {
  type: 'USER_CONTEXT_RESPONSE';
  payload: {
    address: string; // User's blockchain address
    primaryEnsName?: string; // Primary ENS name of user
    community?: Community | null; // Community information (null if not in a community)
  };
}
/**
 * Message received when payment is successful
 */
export interface UserContextRequestMessage extends BaseMessage {
  type: 'USER_CONTEXT_REQUEST';
}
