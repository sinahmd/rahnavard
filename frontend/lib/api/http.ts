/**
 * Thin typed fetch wrapper — the single browser API boundary.
 *
 * All admin/browser requests go through here (lib/data/* is the separate,
 * server-only layer and must never import this module). Responsibilities:
 *
 * - Prefix endpoints with the API base URL.
 * - Authenticate via the ambient Django session cookie (httpOnly `sessionid`).
 *   No credentials are attached by JavaScript — the Phase 2 cutover removed
 *   the DRF-token-in-localStorage model entirely, and AuthContext purges the
 *   stale `admin_token` localStorage key once on the first admin bootstrap.
 * - Send `X-CSRFToken` (read from the non-HttpOnly `csrftoken` cookie the
 *   backend bootstraps via @ensure_csrf_cookie on login and /auth/session/)
 *   on state-changing methods. DRF only enforces CSRF for session-authenticated
 *   unsafe requests, which is exactly when this header is present.
 * - Normalize non-2xx DRF bodies (`detail` / `non_field_errors` /
 *   `{field: [errors]}`) into a typed `ApiError { message, fieldErrors }`.
 * - Central 401 policy: send the browser to the admin login page (expired
 *   session). Note the session-only backend answers *anonymous* requests with
 *   403 (no WWW-Authenticate challenge) — the admin bootstrap handles both
 *   statuses as "unauthenticated" in AuthContext; the 401 redirect here only
 *   fires for responses DRF still codes as 401 (e.g. an expired session
 *   rejected mid-flight by SessionAuthentication's CSRF path). Nothing to
 *   clear — the session cookie is server-side state.
 * - `AbortSignal` passthrough (listings abort in-flight fetches).
 *
 * Deliberately thin: no axios, no retry/interceptor stack, no request
 * queue, no DTO classes.
 */

import type { ApiError } from '@/types/api'

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

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

/**
 * Read the CSRF cookie Django sets (@ensure_csrf_cookie on login and
 * /auth/session/). It is deliberately NOT HttpOnly — the client must echo it.
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CSRF_COOKIE_NAME}=`))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
}

/**
 * Central 401 policy: an expired/invalid session must take the admin back to
 * the login page. No client-side credentials exist to clear — the session is
 * destroyed server-side on its own.
 */
function handleUnauthorized(): void {
  if (typeof window === 'undefined') return
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

  // Session auth: unsafe methods carry X-CSRFToken when the backend has
  // issued a csrftoken cookie (login / /auth/session/ bootstrap).
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
