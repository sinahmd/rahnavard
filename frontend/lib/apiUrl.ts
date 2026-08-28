/**
 * Build a full API URL for client-side fetch calls.
 *
 * In production (with nginx proxy), relative paths like `/api/v1/cars/`
 * work because nginx forwards /api/* to the backend.
 *
 * In local dev (no nginx), relative paths hit port 3000 (Next.js) → 404.
 * This helper prefixes the full backend URL so client components can reach
 * Django directly.
 *
 * This is a local-only helper on the develop branch.
 * When merging to main, callers should revert to plain relative paths.
 */
const API_HOST = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/v1\/?$/, '')

export function apiUrl(path: string): string {
  return API_HOST ? `${API_HOST}${path}` : path
}
