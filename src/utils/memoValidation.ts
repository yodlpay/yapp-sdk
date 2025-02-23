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

/**
 * Generates a valid memo from a UUID by truncating if necessary
 * @param uuid - The UUID to convert to a memo
 * @returns A memo string that passes isValidMemoSize validation
 * @throws {Error} If the input would result in a memo that's too long
 */
export function createValidMemoFromUUID(uuid: string): string {
  // Remove hyphens from UUID
  const compactUUID = uuid.replace(/-/g, '');

  // If empty, return empty
  if (!compactUUID) {
    return '';
  }

  // If already valid, return as is
  if (isValidMemoSize(compactUUID)) {
    return compactUUID;
  }

  throw new Error('Memo is too long');
}
