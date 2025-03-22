import { MessageType } from '../utils/MessageManager';
import { FiatCurrency } from './currency';

/**
 * Base interface for all message types exchanged between Yapp and parent window
 */
export interface BaseMessage {
  type: MessageType;
  payload?: any;
}

/**
 * Message sent to close the Yapp iframe
 */
export interface CloseMessage extends BaseMessage {
  type: 'CLOSE';
}

/**
 * Payment request payload
 */
export interface PaymentRequest {
  address: string; // Recipient's blockchain address
  amount: number; // Payment amount
  currency: FiatCurrency; // Payment currency
  memo?: string; // Optional payment description
}

/**
 * Message sent to request a payment
 */
export interface PaymentRequestMessage extends BaseMessage {
  type: 'PAYMENT_REQUEST';
  payload: PaymentRequest;
}

/**
 * Payment response payload
 */
export interface Payment {
  txHash: string; // Transaction hash
  chainId: number; // Chain ID where transaction was executed
}

/**
 * Message received when payment is successful
 */
export interface PaymentResponseMessage extends BaseMessage {
  type: 'PAYMENT_SUCCESS';
  payload: Payment;
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
 * UserContext response payload
 */
export interface UserContext {
  address: string; // User's blockchain address
  primaryEnsName?: string; // Primary ENS name of user
  community?: Community | null; // Community information (null if not in a community)
}

/**
 * Message received when user context is requested
 */
export interface UserContextResponseMessage extends BaseMessage {
  type: 'USER_CONTEXT_RESPONSE';
  payload: UserContext;
}
/**
 * Message received when payment is successful
 */
export interface UserContextRequestMessage extends BaseMessage {
  type: 'USER_CONTEXT_REQUEST';
}
