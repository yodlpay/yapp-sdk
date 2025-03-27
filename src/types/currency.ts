/**
 * Supported fiat currencies for payments
 */
export enum FiatCurrency {
  EUR = 'EUR',
  USD = 'USD',
  GBP = 'GBP',
  JPY = 'JPY',
  CNY = 'CNY',
  KRW = 'KRW',
  INR = 'INR',
  RUB = 'RUB',
  TRY = 'TRY',
  BRL = 'BRL',
  CAD = 'CAD',
  AUD = 'AUD',
  NZD = 'NZD',
  CHF = 'CHF',
  ILS = 'ILS',
  MXN = 'MXN',
  IDR = 'IDR',
  THB = 'THB',
  VND = 'VND',
  SGD = 'SGD',
  PHP = 'PHP',
  PLN = 'PLN',
  SEK = 'SEK',
}

/**
 * String literal type for fiat currency codes
 * Allows using string literals like 'USD' instead of FiatCurrency.USD
 */
export type FiatCurrencyString = keyof typeof FiatCurrency;
