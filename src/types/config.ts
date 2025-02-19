import { FiatCurrency } from './currency';

export interface YappSDKConfigPublic {
  /** URL of super app */
  origin?: string;
  /** The ENS name of the yapp */
  ensName: string;
  /** The public key in PEM format used for encryption */
  publicKey?: string;
  /** Disable origin validation */
  disableOriginValidation?: boolean;
}

/**
 * Configuration options for the YappSDK
 *
 * @example
 * ```typescript
 * const config: YappSDKConfig = {
 *   publicKey: '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----'
 * };
 * ```
 */
export interface YappSDKConfig {
  /** URL of super app */
  origin: string;
  /** The ENS name of the yapp */
  ensName: string;
  /** The public key in PEM format used for encryption */
  publicKey: string;
  /** Disable origin */
  disableOriginValidation: boolean;
}

/**
 * Payment request configuration
 *
 * @example
 * ```typescript
 * const payment: PaymentConfig = {
 *   amount: 99.99,
 *   currency: FiatCurrency.USD,
 *   memo: 'Premium subscription payment'
 * };
 * ```
 */
export interface PaymentConfig {
  /** The payment amount */
  amount: number;
  /** The currency code */
  currency: FiatCurrency;
  /** Optional payment memo/description */
  memo?: string;
}
