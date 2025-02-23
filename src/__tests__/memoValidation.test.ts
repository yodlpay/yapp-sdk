import {
  createValidMemoFromUUID,
  isValidMemoSize,
} from '../utils/memoValidation';

describe('isValidMemoSize', () => {
  it('should return true for empty string', () => {
    expect(isValidMemoSize('')).toBe(true);
  });

  it('should return true for short ASCII string', () => {
    expect(isValidMemoSize('Hello World')).toBe(true);
  });

  it('should return true for string with exactly 32 bytes', () => {
    expect(isValidMemoSize('12345678901234567890123456789012')).toBe(true);
  });

  it('should return false for string longer than 32 bytes', () => {
    expect(isValidMemoSize('123456789012345678901234567890123')).toBe(false);
  });

  it('should handle UTF-8 characters correctly', () => {
    // '€' is 3 bytes in UTF-8
    // 'ñ' is 2 bytes in UTF-8
    // '漢' is 3 bytes in UTF-8
    expect(isValidMemoSize('€')).toBe(true);
    expect(isValidMemoSize('ñ')).toBe(true);
    expect(isValidMemoSize('€€€€€€€€€€')).toBe(true); // 30 bytes
    expect(isValidMemoSize('€€€€€€€€€€€')).toBe(false); // 33 bytes
    expect(isValidMemoSize('漢漢漢漢漢漢漢漢漢漢')).toBe(true); // 30 bytes
    expect(isValidMemoSize('漢漢漢漢漢漢漢漢漢漢漢')).toBe(false); // 33 bytes
  });

  it('should handle mixed ASCII and UTF-8 characters', () => {
    expect(isValidMemoSize('Hello ñ World €')).toBe(true);
    expect(isValidMemoSize('Hello 漢 €')).toBe(true); // Much shorter base string
    expect(isValidMemoSize('Hello 漢 € 123456789012345')).toBe(true); // At the limit
    expect(isValidMemoSize('Hello 漢 € 1234567890123456123123123')).toBe(false); // Just over the limit
  });
});

describe('createValidMemoFromUUID', () => {
  it('should handle a standard UUID', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const result = createValidMemoFromUUID(uuid);
    expect(isValidMemoSize(result)).toBe(true);
    expect(result).toBe('123e4567e89b12d3a456426614174000');
  });

  it('should handle a UUID with special characters', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const result = createValidMemoFromUUID(uuid);
    expect(isValidMemoSize(result)).toBe(true);
    expect(result).toBe('123e4567e89b12d3a456426614174000');
  });

  it('should throw error if resulting memo is invalid', () => {
    // Using a string that's definitely too long when encoded
    const longString = '€'.repeat(33);
    expect(() => createValidMemoFromUUID(longString)).toThrow(
      'Memo is too long',
    );
  });

  it('should handle empty UUID', () => {
    expect(createValidMemoFromUUID('')).toBe('');
  });

  it('should handle UUID without hyphens', () => {
    const uuid = '123e4567e89b12d3a456426614174000';
    const result = createValidMemoFromUUID(uuid);
    expect(result).toBe('123e4567e89b12d3a456426614174000');
    expect(isValidMemoSize(result)).toBe(true);
  });
});
