import { stringToHex } from 'viem';

/**
 * Validates if a memo string can fit within 32 bytes when converted to hex
 * @param memo - The memo string to validate
 * @returns boolean indicating if the memo is within size limits
 */
export function isValidMemoSize(memo: string): boolean {
  try {
    stringToHex(memo, { size: 32 });
    return true;
  } catch {
    // If the string is too long for 32 bytes, viem will throw an error
    return false;
  }
}
