/**
 * Authenticated fetch wrapper.
 * Uses NEXT_PUBLIC_API_URL for local dev (no nginx proxy).
 * NOTE: Local-only on develop. Revert for main.
 */
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || ""
const API_BASE = RAW_API_BASE.replace(/\/api\/v1\/?$/, "")

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("admin_token")
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Token ${token}`
  }
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json"
  }
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`
  return fetch(fullUrl, { ...options, headers })
}
