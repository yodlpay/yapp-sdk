/**
 * ETH Follow Service Integration
 *
 * This file handles API calls to the ethfollow.xyz service.
 */

import {
  EfpFetchFollowersResponse,
  EfpFetchFollowingResponse,
  EfpFetchOptions,
} from '@types';

const API_BASE_URL_EFP = 'https://api.ethfollow.xyz/api/v1';

/**
 * Constructs a URL with query parameters
 * @param baseUrl - The base URL
 * @param options - The query options to append
 * @returns The URL with query parameters
 */
function constructUrlWithParams(
  endpoint: string,
  options?: EfpFetchOptions,
): string {
  if (!options) return `${API_BASE_URL_EFP}${endpoint}`;

  const params = new URLSearchParams();

  if (options.limit !== undefined)
    params.append('limit', options.limit.toString());
  if (options.offset !== undefined)
    params.append('offset', options.offset.toString());
  if (options.tags && options.tags.length > 0)
    params.append('tags', options.tags.join(','));
  if (options.sort) params.append('sort', options.sort);
  if (options.cache) params.append('cache', options.cache);

  const queryString = params.toString();

  return queryString
    ? `${API_BASE_URL_EFP}${endpoint}?${queryString}`
    : `${API_BASE_URL_EFP}${endpoint}`;
}

/**
 * Fetches following data for a specific ETH address/name
 * @param ensOrAddress - The ETH name or address to fetch following data for
 * @param options - Optional query parameters
 * @returns The API response with following data
 */
export async function fetchFollowing(
  ensOrAddress: string,
  options?: EfpFetchOptions,
): Promise<EfpFetchFollowingResponse> {
  const endpoint = `/users/${ensOrAddress}/following`;
  const url = constructUrlWithParams(endpoint, options);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `[EFP] API error: ${response.status} ${response.statusText}`,
      );
    }

    const following = await response.json();

    return following;
  } catch (error) {
    console.error('[EFP] Error fetching following:', error);
    throw error;
  }
}

/**
 * Fetches followers data for a specific ETH address/name
 * @param ensOrAddress - The ETH name or address to fetch followers data for
 * @param options - Optional query parameters
 * @returns The API response with followers data
 */
export async function fetchFollowers(
  ensOrAddress: string,
  options?: EfpFetchOptions,
): Promise<{ followers: EfpFetchFollowersResponse[] }> {
  const endpoint = `/users/${ensOrAddress}/followers`;
  const url = constructUrlWithParams(endpoint, options);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `[EFP] API error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error('[EFP] Error fetching followers:', error);
    throw error;
  }
}
