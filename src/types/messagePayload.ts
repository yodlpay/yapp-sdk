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
}

/**
 * Cookie type with expiration and additional properties
 */
export type Cookie = {
  key: string;
  data: {
    exp: number;
    [key: string]: any;
  };
};

export type CookieWithOptionalExp = Omit<Cookie, 'data'> & {
  data: Omit<Cookie['data'], 'exp'> & {
    exp?: number;
  };
};

/**
 * Save cookies request payload
 *
 * Array of cookies to save in the super app's localStorage.
 */
export type SaveCookiesRequestData = Cookie[];

/**
 * Save cookies response payload
 *
 * Contains the array of cookies that were successfully saved.
 */
export type SaveCookiesResponseData = { cookies: Cookie[] };

/**
 * Get cookies request payload
 *
 * Optional array of cookie keys to retrieve from the super app's localStorage.
 * If not provided, all cookies are returned.
 */
export type GetCookiesRequestData = string[] | undefined;

/**
 * Get cookies response payload
 *
 * Contains the array of cookies that were retrieved.
 */
export type GetCookiesResponseData = { cookies: Cookie[] };
