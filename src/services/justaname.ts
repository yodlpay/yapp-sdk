/**
 * JustaName Service Integration
 *
 * This file handles API calls to the justaname.id service.
 */

import {
  Hex,
  JustaNameConfig,
  JustaNameSubnameResponse
} from '@types';

const API_BASE_URL_EFP = 'https://api.justaname.id/ens/v1';

/**
 * Constructs a URL with query parameters
 * @param baseUrl - The base URL
 * @param options - The query options to append
 * @returns The URL with query parameters
 */
function constructUrlWithParams(
  endpoint: string,
): string {
  return `${API_BASE_URL_EFP}${endpoint}`;
}

  /**
   * Fetches subname data for a specific ETH name
   * @param ens - The ETH name to fetch subname data for
   * @returns The API response with subname data
   */
export async function fetchSubname(
  ens: string,
): Promise<JustaNameConfig> {
  const endpoint = `/subname/subname?subname=${ens}&chainId=1`;
  const url = constructUrlWithParams(endpoint);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `[JustaName] API error: ${response.status} ${response.statusText}`,
      );
    }


    const {result: {data}} = await response.json() as JustaNameSubnameResponse;

    const ethAddress = data.records.coins.find((coin) => coin.name === 'eth')?.value;

    return {
      ...data,
      address: ethAddress as Hex,
    }
  } catch (error) {
    console.error('[JustaName] Error fetching subname:', error);
    throw error;
  }
}

