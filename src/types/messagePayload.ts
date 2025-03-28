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
