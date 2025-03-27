/**
 * Payment-related constants used throughout the application
 */

// Configuration constants
export const PAYMENT_TIMEOUT_MS = 300000; // 5 minutes
export const TEST_TIMEOUT_MS = 1000; // 1 second for tests
export const STORAGE_KEY = 'yodl_payment_request';

// URL parameters
export const URL_PARAMS = {
  MEMO: 'memo',
  STATUS: 'status',
  TX_HASH: 'txHash',
  CHAIN_ID: 'chainId',
  REDIRECT_URL: 'redirectUrl',
  STATUS_SUCCESS: 'success',
  STATUS_CANCELLED: 'cancelled',
} as const;

export const URL_PARAMS_REQUEST = {
  MEMO: URL_PARAMS.MEMO,
  REDIRECT_URL: URL_PARAMS.REDIRECT_URL,
  AMOUNT: 'amount',
  CURRENCY: 'currency',
} as const;
