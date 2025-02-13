import type { JWTPayload as JoseJWTPayload } from 'jose';

/**
 * Represents the expected structure of the JWT payload in YAPP applications.
 * This interface extends the base Jose JWT payload type with YAPP-specific claims.
 * All fields are optional but should be included when the relevant information is available.
 *
 * @example
 * ```typescript
 * const payload: JWTPayload = {
 *   // Standard JWT claims
 *   iss: "yapp.xyz",        // Token issuer
 *   sub: "user123",         // Subject (user identifier)
 *   iat: 1516239022,        // Issued at (timestamp)
 *   exp: 1516239022,        // Expiration time (timestamp)
 *
 *   // YAPP-specific claims
 *   a: "0x1234...abcd",     // User's Ethereum address
 *   p: "user.eth",          // Primary ENS name
 *   e: "user.community.eth" // Community ENS name
 * }
 * ```
 */
export interface JWTPayload extends JoseJWTPayload {
  /**
   * The user's Ethereum wallet address in hexadecimal format.
   * This is the primary identifier for the user in the Ethereum ecosystem.
   * @example "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
   */
  sub: string;


  /**
   * The user's community ENS name, if none given
   * This is the main human-readable identifier for the user.
   * @example "vitalik.eth"
   */
  ens: string | null;

  /**
   * The community's ENS name.
   * Identifies the specific community context for this token.
   * @example "community.eth"
   */
  iss: string;


  /**
   * The YAPP application's ENS name.
   * Identifies which YAPP application issued or is associated with this token.
   * @example "app.yapp.eth"
   */
  aud: string;

  exp: number; // expiry

  /**
   * Additional custom claims can be included in the payload.
   * These should be documented by the specific application using them.
   */
  [key: string]: unknown;
}
