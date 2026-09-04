/**
 * Thin typed fetch wrapper — the single browser API boundary.
 *
 * All admin/browser requests go through here (lib/data/* is the separate,
 * server-only layer and must never import this module). Responsibilities:
 *
 * - Prefix endpoints with the API base URL.
 * - Attach the admin credentials. Phase 1 still uses the DRF token from
 *   localStorage (behaviour identical to the retired `authFetch`); Phase 2
 *   swaps `getCredentials()`/401 handling for the session-cookie + CSRF
 *   model — the CSRF header plumbing below already works once the backend
 *   starts issuing a `csrftoken` cookie.
 * - Normalize non-2xx DRF bodies (`detail` / `non_field_errors` /
 *   `{field: [errors]}`) into a typed `ApiError { message, fieldErrors }`.
 * - Central 401 policy: clear stored credentials and send the browser to
 *   the admin login page.
 * - `AbortSignal` passthrough (listings abort in-flight fetches).
 *
 * Deliberately thin: no axios, no retry/interceptor stack, no request
 * queue, no DTO classes.
 */

import type { ApiError } from '@/types/api'

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

const TOKEN_STORAGE_KEY = 'admin_token'
const CSRF_COOKIE_NAME = 'csrftoken'
const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

/** Runtime error thrown by this wrapper for every non-2xx response. */
export class ApiRequestError extends Error implements ApiError {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export interface RequestOptions {
  method?: string
  /** Plain objects are serialized as JSON; FormData passes through. */
  body?: BodyInit | object | null
  headers?: HeadersInit
  signal?: AbortSignal
}

/** Credentials source. Phase 1: DRF token (localStorage); Phase 2: cookie. */
function getCredentialsHeader(): Record<string, string> | null {
  if (typeof window === 'undefined') return null
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  return token ? { Authorization: `Token ${token}` } : null
}

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CSRF_COOKIE_NAME}=`))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
}

/**
 * Central 401 policy: drop stored credentials and redirect to the admin
 * login page. Phase 2 makes the redirect the expiry UX for session cookies;
 * under token auth it only triggers on an invalid/expired token.
 */
function handleUnauthorized(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  if (!window.location.pathname.startsWith('/admin/login')) {
    window.location.assign('/admin/login')
  }
}

function isPlainObjectBody(body: unknown): body is Record<string, unknown> {
  return (
    typeof body === 'object' &&
    body !== null &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(body) &&
    !(body instanceof URLSearchParams)
  )
}

/**
 * Normalize a DRF error body into `ApiError`. Field errors win over the
 * generic `detail`; `fieldErrors` keeps the first message per field.
 */
function normalizeErrorBody(status: number, raw: unknown): ApiError {
  let message = `Request failed with status ${status}`
  const fieldErrors: Record<string, string> = {}

  if (raw && typeof raw === 'object') {
    const body = raw as Record<string, unknown>

    for (const [key, value] of Object.entries(body)) {
      if (key === 'detail' && typeof value === 'string') {
        message = value
      } else if (key === 'message' && typeof value === 'string') {
        message = value
      } else if (key === 'non_field_errors' && Array.isArray(value) && typeof value[0] === 'string') {
        message = value[0]
      } else if (Array.isArray(value) && typeof value[0] === 'string') {
        fieldErrors[key] = value[0]
      } else if (typeof value === 'string') {
        fieldErrors[key] = value
      }
    }

    if (Object.keys(fieldErrors).length > 0 && message.startsWith('Request failed')) {
      // DRF bodies carry either `detail`/`non_field_errors` OR field keys.
      // When only field keys were present (message still the sentinel),
      // surface the first field error as the form-level message.
      message = fieldErrors[Object.keys(fieldErrors)[0]]
    }
  }

  return { message, fieldErrors, status }
}

async function toApiRequestError(response: Response): Promise<ApiRequestError> {
  let raw: unknown = null
  try {
    raw = await response.json()
  } catch {
    // Non-JSON error body — fall through with a generic message.
  }
  const { message, fieldErrors, status } = normalizeErrorBody(response.status, raw)
  return new ApiRequestError(message, status, fieldErrors)
}

/**
 * Core request helper. `path` is relative to the API base
 * (e.g. `/admin/cars/`); pass a plain object as `body` for JSON.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const headers = new Headers(options.headers)

  const credentials = getCredentialsHeader()
  if (credentials) {
    for (const [name, value] of Object.entries(credentials)) {
      headers.set(name, value)
    }
  }

  let body: BodyInit | null = null
  if (isPlainObjectBody(options.body)) {
    body = JSON.stringify(options.body)
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  } else if (options.body !== undefined && options.body !== null) {
    body = options.body as BodyInit
    // FormData: leave Content-Type to the browser (it adds the boundary).
  } else if (method !== 'GET' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // CSRF: forwarded when the backend issues a csrftoken cookie (Phase 2
  // session auth). Inert today — token-auth bypasses CSRF and no cookie is
  // present — so sending it is harmless and future-proof.
  if (UNSAFE_METHODS.includes(method)) {
    const csrf = getCsrfToken()
    if (csrf) headers.set('X-CSRFToken', csrf)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body,
      signal: options.signal,
    })
  } catch (error) {
    // AbortError is re-thrown as-is so callers can detect aborts.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('خطا در اتصال به سرور')
  }

  if (response.status === 401) {
    handleUnauthorized()
    throw await toApiRequestError(response)
  }

  if (!response.ok) {
    throw await toApiRequestError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
