/**
 * Build a full API URL for client-side fetch calls.
 *
 * In local dev (no nginx proxy), client components need to hit
 * the backend directly at http://localhost:8000/api/v1/...
 *
 * In production, nginx proxies /api/* to backend, so we return
 * the relative path as-is.
 *
 * Usage: fetch(apiUrl('/api/v1/cars/'))
 */
export function apiUrl(path: string): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
  // If NEXT_PUBLIC_API_URL is set (local dev), use it as base
  if (apiBase) {
    const base = apiBase.replace(/\/api\/v1\/?$/, '')
    return `${base}${path}`
  }
  // Production: return relative path (nginx proxies)
  return path
}
