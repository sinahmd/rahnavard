/**
 * API URL helper.
 *
 * In production, nginx proxies /api/* to the backend, so relative URLs work.
 * On localhost (local Docker dev), there's no nginx proxy, so the client must
 * hit http://localhost:8000 directly.
 *
 * Server-side: always resolves to backend container URL.
 * Client-side on localhost: resolves to localhost:8000.
 * Client-side in production: returns relative path (nginx handles proxying).
 */
export function apiUrl(path: string): string {
  // Server-side: always use the backend container URL
  if (typeof window === 'undefined') {
    const backend = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000'
    if (path.startsWith('/api/')) return `${backend}${path}`
    if (path.startsWith('/media/')) return `${backend}${path}`
    return path
  }

  // Client-side: if running on localhost (local Docker dev), proxy to backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    if (path.startsWith('/api/')) return `http://localhost:8000${path}`
    if (path.startsWith('/media/')) return `http://localhost:8000${path}`
  }

  // Production: return relative path (nginx handles proxying)
  return path
}
