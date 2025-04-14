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
  /** URL of the API */
  apiUrl: string;
  /** URL of the mainnet RPC */
  mainnetRpcUrl: string;
}
