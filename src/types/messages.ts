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
    address: string;  // Recipient's blockchain address
    amount: number;   // Payment amount
    currency: FiatCurrency;  // Payment currency
    memo?: string;    // Optional payment description
  };
}

/**
 * Message received when payment is successful
 */
export interface PaymentResponseMessage extends BaseMessage {
  type: 'PAYMENT_SUCCESS';
  payload: {
    txHash: string;   // Transaction hash
    chainId: number;  // Chain ID where transaction was executed
  };
}

/**
 * Message received when payment is cancelled
 */
export interface PaymentCancelledMessage extends BaseMessage {
  type: 'PAYMENT_CANCELLED';
}
