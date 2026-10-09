/**
 * Validation helpers for identities. Staff usernames and passwords are made
 * by the staff-accounts service, never here.
 */

export function isValidEmailFormat(email) {
  const pattern = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.[a-z]{2,24}$/i;
  return pattern.test(String(email || ""));
}

/**
 * Validates and normalizes Indian mobile numbers.
 *
 * Accepts common formats: 9876543210, 09876543210, +919876543210, 91-987-654-3210
 * Returns E.164 format: +919876543210
 *
 * Edge cases handled:
 * - Leading 0 is stripped (09876543210 → +919876543210)
 * - 91 prefix is preserved as +91
 * - Must be exactly 10 digits starting with 6-9 after normalization
 * - Rejects numbers starting with 0-5 (e.g. 1234567890)
 * - Rejects short/long numbers (e.g. 987654321 = 9 digits)
 */
export function validateIndianMobile(input) {
  const digits = String(input || "").replace(/\D/g, "");

  if (/^[6-9]\d{9}$/.test(digits)) {
    return { valid: true, normalized: `+91${digits}` };
  }
  if (/^0[6-9]\d{9}$/.test(digits)) {
    return { valid: true, normalized: `+91${digits.slice(1)}` };
  }
  if (/^91[6-9]\d{9}$/.test(digits)) {
    return { valid: true, normalized: `+${digits}` };
  }

  return { valid: false, normalized: null };
}
