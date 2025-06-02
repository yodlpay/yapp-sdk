import { ChainId } from './chains';
import { FiatCurrency, FiatCurrencyString } from './currency';
import { Hex } from './utils';

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
 * Community information structure
 */
export interface CommunityConfiguration {
  yapps: string[]; // ENS names of Yapps featured in the community page
  provider: {
    members: string; // ENS that you gave permission that if that follows people then they become members
    yapps: string; // ENS that follows yapps that are visible in the community page
  };
}

/**
 * UserContext response payload
 */
export interface UserContext {
  address: Hex; // User's blockchain address
  primaryEnsName?: string; // Primary ENS name of user
  community?: Community | null; // Community information (null if not in a community)
}

export interface SiweRequestData {
  address: string;
  domain: string;
  uri: string;
  nonce?: string; // default to now in epoch
  statement?: string;
  chainId?: number; // default to mainnet
  version?: string; // default to 1
  issuedAt?: string; // default to now
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

export interface SiweResponseData {
  signature: string;
  message: string;
  address: string;
}

/**
 * Payment request configuration
 *
 * @example
 * ```typescript
 * const payment: PaymentConfig = {
 *   addressOrEns: '0x1234567890123456789012345678901234567890',
 *   amount: 99.99,
 *   currency: FiatCurrency.USD,
 *   memo: 'Premium subscription payment'
 * };
 *
 * const paymentWithoutAmount: PaymentConfig = {
 *   addressOrEns: '0x1234567890123456789012345678901234567890',
 * };
 * ```
 */
export interface PaymentRequestData {
  /** The recipient's blockchain address or ENS name */
  addressOrEns: string | Hex;
  /** The payment amount. If not provided, the user can enter any amount they choose */
  amount?: number;
  /** The currency code. If not provided, the user can choose any currency they want. */
  currency?: FiatCurrency | FiatCurrencyString;
  /** Optional payment memo/description */
  memo?: string;
  /** Payment redirect URL - Required when application runs outside of an iframe */
  redirectUrl?: string;
  /** Array of token symbols that can be used for payment. If not provided, the receiver's Yodl configuration will be used */
  tokens?: string[];
  /** Array of chain IDs that can be used for payment. If not provided, the recievers yodl config will be used */
  chainIds?: ChainId[];
}
