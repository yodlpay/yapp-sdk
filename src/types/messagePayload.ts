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
