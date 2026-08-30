/**
 * Authenticated fetch wrapper.
 * Automatically includes the admin token from localStorage in all requests.
 * For FormData bodies, Content-Type is omitted (browser sets it with boundary).
 */
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

  return fetch(url, { ...options, headers })
}
