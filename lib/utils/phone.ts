/**
 * Phone number normalization utilities for Indian mobile numbers.
 * Canonical format: +91XXXXXXXXXX (10 digits starting with 6-9)
 */

export function validatePhoneNumber(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  const s = input.trim();
  if (!s) return false;
  if (/^\+91[6-9]\d{9}$/.test(s)) return true;
  const digits = s.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    const ten = digits.slice(2);
    return /^[6-9]\d{9}$/.test(ten);
  }
  if (digits.length === 10) {
    return /^[6-9]\d{9}$/.test(digits);
  }
  return false;
}

export function normalizePhoneNumber(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Phone must be a string');
  const s = input.trim();
  if (!s) throw new Error('Phone cannot be empty');
  if (/^\+91[6-9]\d{9}$/.test(s)) return s;
  const digitsRaw = s.replace(/\D/g, '');
  let digits = digitsRaw;
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10) throw new Error('Phone must be 10 digits');
  if (!/^[6-9]\d{9}$/.test(digits))
    throw new Error('Invalid Indian mobile number');
  return `+91${digits}`;
}
