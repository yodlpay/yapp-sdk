/**
 * Validates if a memo string can fit within 32 bytes when converted to hex
 * @param memo - The memo string to validate
 * @returns boolean indicating if the memo is within size limits
 */
export function isValidMemoSize(memo: string): boolean {
  // Convert string to UTF-8 bytes
  const encoder = new TextEncoder();
  const bytes = encoder.encode(memo);

  // Check if byte length is within 32 bytes
  return bytes.length <= 32;
}
