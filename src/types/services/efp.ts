import { Hex } from '..';

// Define types for API responses
export interface EfpFetchFollowingResponse {
  following: EfpFollowing[];
}

export interface EfpFollowing {
  version: number;
  record_type: string;
  data: string;
  address?: Hex;
  tags: string[];
}

export interface EfpFetchFollowersResponse {
  efp_list_nft_token_id: string;
  address: Hex;
  tags: any[];
  is_following: boolean;
  is_blocked: boolean;
  is_muted: boolean;
  updated_at: string;
}

// Define response interface for taggedAs endpoint
export interface EfpTaggedAsResponse {
  address: Hex;
  tags: string[];
  tagCounts: {
    tag: string;
    count: number;
  }[];
  taggedAddresses: {
    address: Hex;
    tag: string;
  }[];
}

// Define query parameter options for API calls
export interface EfpFetchOptions {
  limit?: number;
  offset?: number;
  tags?: string[];
  sort?: 'latest' | 'earliest' | 'followers';
  cache?: 'fresh';
}
