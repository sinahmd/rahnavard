/**
 * Persian digit display layer (plan §4 UX-5, Phase 9).
 *
 * One pure, SSR-safe helper for displaying numbers to Persian-reading
 * visitors. Applied ONLY at display sites: stored values, API payloads,
 * form inputs, and admin-internal tables stay Latin.
 *
 * Latin is deliberately preserved for: production years (Gregorian),
 * `tel:` hrefs, URLs/slugs/IDs, API payloads, form inputs, admin tables,
 * and JSON-LD/structured data.
 */

/** Digit characters Persian display sites render instead of 0–9. */
export const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

/**
 * Convert Latin digits in a string or number to Persian digits.
 *
 * Mixed strings pass through unchanged except for their digits
 * («بنز E 200» → «بنز E ۲۰۰»). Latin letters are never touched.
 * Idempotent on Persian input.
 */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)])
}

/**
 * Convert Persian digits back to Latin (the inverse of toPersianDigits).
 * Used to centralize `tel:` href construction — hrefs stay Latin even when
 * the displayed text is Persian.
 */
export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
}
