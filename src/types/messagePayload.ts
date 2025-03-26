import { FiatCurrency } from './currency';
import { Hex } from './utils';

/**
 * Payment request payload
 */
export interface PaymentRequest {
  address: Hex; // Recipient's blockchain address
  amount: number; // Payment amount
  currency: FiatCurrency; // Payment currency
  memo?: string; // Optional payment description
}

/**
 * Payment response payload
 */
export interface Payment {
  txHash: Hex; // Transaction hash
  chainId: number; // Chain ID where transaction was executed
}

/**
 * Community information structure
 */
export interface Community {
  address: Hex;
  ensName: string;
  userEnsName: string;
}

/**
 * UserContext response payload
 */
export interface UserContext {
  address: Hex; // User's blockchain address
  primaryEnsName?: string; // Primary ENS name of user
  community?: Community | null; // Community information (null if not in a community)
}
