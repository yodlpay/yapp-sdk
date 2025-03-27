import { FiatCurrency, FiatCurrencyString } from './currency';

/**
 * Configuration options for the YappSDK
 *
 * @example
 * ```typescript
 * const config: YappSDKConfig = {
 *   origin: 'https://yodl.me'
 * };
 * ```
 */
export interface YappSDKConfig {
  /** URL of super app */
  origin: string;
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
  currency: FiatCurrency | FiatCurrencyString;
  /** Optional payment memo/description */
  memo?: string;
  /** Payment redirect URL - Required when application runs outside of an iframe */
  redirectUrl?: string;
}
