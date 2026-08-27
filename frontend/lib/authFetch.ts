/**
 * Authenticated fetch wrapper.
 * Automatically includes the admin token from localStorage in all requests.
 * For FormData bodies, Content-Type is omitted (browser sets it with boundary).
 *
 * Uses NEXT_PUBLIC_API_URL for local dev (no nginx proxy).
 * In production, nginx proxies /api/* to backend, so relative URLs work.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('admin_token')
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Token ${token}`
  }

  // Don't set Content-Type for FormData — browser handles boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  // Build full URL: API_BASE + relative path
  // In local dev: http://localhost:8000/api/v1/admin/cars/
  // In production: /api/v1/admin/cars/ (nginx proxies)
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`

  return fetch(fullUrl, { ...options, headers })
}
