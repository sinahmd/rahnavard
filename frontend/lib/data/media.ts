/**
 * Media URL normalization for server-side (RSC) fetches.
 *
 * When Next.js server code fetches the backend over
 * `BACKEND_INTERNAL_URL` (e.g. `http://backend:8000`), serialized
 * `ImageField`/`FileField` values come back as absolute URLs pointing at
 * that internal host. Client components render those images through
 * `<Image src="/media/...">` (same-origin via nginx), so the internal
 * prefix must be stripped before the payload reaches the browser.
 *
 * This is the single home of that logic — previously duplicated inside
 * `cars/[slug]/page.tsx` and `articles/[slug]/page.tsx`.
 *
 * Server-only: reads `BACKEND_INTERNAL_URL`; never runs in the browser
 * and never touches cookies/localStorage.
 */

const DEFAULT_BACKEND_URL = 'http://backend:8000'

export function backendInternalUrl(): string {
  return process.env.BACKEND_INTERNAL_URL || DEFAULT_BACKEND_URL
}

/**
 * Strip the internal backend origin from a single media URL.
 * Non-matching / falsy values are returned unchanged, so absolute
 * third-party URLs and already-relative paths pass through untouched.
 */
export function stripBackendUrl(value: string | null | undefined): string | null | undefined {
  if (!value) return value
  const prefix = backendInternalUrl()
  return value.startsWith(prefix) ? value.slice(prefix.length) : value
}

/**
 * Strip the internal backend origin from every listed string field of a
 * record (used on detail-fetch results). Only plain string values are
 * touched; arrays (e.g. the gallery list) are left as-is because gallery
 * URLs are already stored relative on the backend.
 */
export function normalizeMediaUrls<T extends object>(
  record: T,
  fields: ReadonlyArray<keyof T & string>
): T {
  const target = record as Record<string, unknown>
  for (const field of fields) {
    const value = target[field]
    if (typeof value === 'string') {
      target[field] = stripBackendUrl(value) as unknown
    }
  }
  return record
}
