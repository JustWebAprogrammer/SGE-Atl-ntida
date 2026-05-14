/**
 * Unified phone number utilities for Angolan mobile numbers.
 *
 * Angolan mobile numbers: 9XXXXXXXX (9 digits, starting with 9)
 * Stored format: "+244 9XXXXXXXX"
 *
 * The UI shows a static "+244 9" prefix and the user types 8 digits.
 */

/**
 * Formats raw phone input into the canonical "+244 9XXXXXXXX" format.
 *
 * Accepts:
 *  - "92345678"        (8 subscriber digits, no leading 9)
 *  - "992345678"       (full 9-digit number with operator 9)
 *  - "244992345678"    (full international without +)
 *  - "+244 992345678"  (with +, spaces, etc.)
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')

  let subscriberDigits: string

  if (digits.length === 9 && digits.startsWith('9')) {
    // Full local number: "992345678" → extract "92345678"
    subscriberDigits = digits.slice(1, 9)
  } else if (digits.length === 12 && digits.startsWith('244')) {
    // International: "244992345678" → extract "92345678"
    subscriberDigits = digits.slice(4, 12)
  } else {
    // Assume it's just the 8 subscriber digits
    subscriberDigits = digits.slice(-8)
  }

  return `+244 9${subscriberDigits}`
}

/**
 * Strips the stored "+244 9XXXXXXXX" back to just the 8 subscriber digits
 * so it can be pre-filled into a form input that has a static "+244 9" label.
 */
export function cleanPhoneForInput(phone: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 9 && digits.startsWith('9')) {
    return digits.slice(1, 9)
  } else if (digits.length === 12 && digits.startsWith('244')) {
    return digits.slice(4, 12)
  }
  return digits.slice(-8)
}

/**
 * Validates that the raw input resolves to exactly 8 subscriber digits.
 */
export function validatePhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')

  if (digits.length === 9 && digits.startsWith('9')) return true
  if (digits.length === 12 && digits.startsWith('244')) return true
  if (digits.length === 8) return true

  return false
}