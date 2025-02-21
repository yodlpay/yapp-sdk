import { FiatCurrency } from '../types/currency';

/**
 * Checks if the provided currency string is a valid supported fiat currency
 *
 * @param currency - The currency string to validate
 * @returns boolean indicating if the currency is supported
 *
 * @example
 * ```typescript
 * isValidFiatCurrency('USD') // returns true
 * isValidFiatCurrency('INVALID') // returns false
 * ```
 */
export function isValidFiatCurrency(
  currency: string,
): currency is FiatCurrency {
  return Object.values(FiatCurrency).includes(currency as FiatCurrency);
}
