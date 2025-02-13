import * as jose from 'jose';
import { JWTPayload } from '../types/jwt';

/**
 * Manages security operations including JWT token validation and verification.
 *
 * The SecurityManager handles cryptographic operations using RSA-256 public key
 * encryption for secure token validation. It is specifically designed to work with
 * YAPP's JWT tokens that contain Ethereum and ENS-related claims.
 *
 * @example
 * ```typescript
 * // Initialize the security manager with RSA public key
 * const publicKeyPem = `-----BEGIN PUBLIC KEY-----
 * MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
 * -----END PUBLIC KEY-----`;
 *
 * const security = await SecurityManager.create(publicKeyPem);
 *
 * // Verify and decode a JWT token with YAPP-specific claims
 * try {
 *   const payload = await security.verifyAndDecodeToken(jwtToken);
 *
 *   // Access standard JWT claims
 *   console.log('Issuer:', payload.iss);          // e.g., "yapp.xyz"
 *   console.log('Subject:', payload.sub);         // e.g., "user123"
 *   console.log('Issued at:', payload.iat);       // Unix timestamp
 *   console.log('Expires at:', payload.exp);      // Unix timestamp
 *
 *   // Access YAPP-specific claims
 *   console.log('ETH Address:', payload.a);       // e.g., "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
 *   console.log('Primary ENS:', payload.p);       // e.g., "user.eth"
 *   console.log('Community ENS:', payload.e);     // e.g., "user.community.eth"
 *   console.log('Community:', payload.c);         // e.g., "community.eth"
 *   console.log('YAPP App:', payload.y);          // e.g., "app.yapp.eth"
 * } catch (error) {
 *   console.error('Token validation failed:', error);
 * }
 * ```
 */
export class SecurityManager {
  private publicKey!: jose.KeyLike;

  private constructor(publicKey: jose.KeyLike) {
    this.publicKey = publicKey;
  }

  /**
   * Creates a new instance of SecurityManager with the provided public key.
   *
   * @param publicKeyPem - The RSA public key in PEM format used to verify JWT signatures
   * @returns A new instance of SecurityManager
   * @throws {Error} If the public key is invalid or cannot be imported
   *
   * @example
   * ```typescript
   * const publicKey = `-----BEGIN PUBLIC KEY-----
   * MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
   * -----END PUBLIC KEY-----`;
   *
   * try {
   *   const security = await SecurityManager.create(publicKey);
   *   console.log('SecurityManager initialized successfully');
   * } catch (error) {
   *   console.error('Failed to initialize SecurityManager:', error);
   * }
   * ```
   */
  static async create(publicKeyPem: string): Promise<SecurityManager> {
    const publicKey = await jose.importSPKI(publicKeyPem, 'RS256');
    return new SecurityManager(publicKey);
  }

  /**
   * Verifies and decodes a JWT token using the public key.
   *
   * @param token - The JWT token to verify and decode
   * @returns The decoded token payload containing both standard JWT and YAPP-specific claims
   * @throws {Error} If the token is invalid, expired, or verification fails
   *
   * @example
   * ```typescript
   * try {
   *   const payload = await security.verifyAndDecodeToken(token);
   *
   *   // Standard JWT claims
   *   if (payload.iss !== 'yapp.xyz') {
   *     throw new Error('Invalid token issuer');
   *   }
   *
   *   const expirationDate = new Date(payload.exp! * 1000);
   *   console.log('Token expires:', expirationDate);
   *
   *   // YAPP-specific claims
   *   if (payload.a) {
   *     console.log('User ETH address:', payload.a);
   *   }
   *
   *   if (payload.p) {
   *     console.log('Primary ENS:', payload.p);
   *   }
   *
   *   if (payload.c) {
   *     console.log('Community context:', payload.c);
   *   }
   * } catch (error) {
   *   if (error.message.includes('expired')) {
   *     console.error('Token has expired');
   *   } else if (error.message.includes('signature')) {
   *     console.error('Invalid token signature');
   *   } else {
   *     console.error('Token validation failed:', error);
   *   }
   * }
   * ```
   */
  public async verifyAndDecodeToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jose.jwtVerify(token, this.publicKey, {
        algorithms: ['RS256'],
      });
      return payload as JWTPayload;
    } catch (error) {
      throw new Error(`Token validation failed: ${(error as Error).message}`);
    }
  }
}
