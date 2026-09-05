/**
 * Auth endpoints (session-cookie auth, session-only since the cutover).
 *
 * Authentication is the ambient httpOnly `sessionid` cookie; `http.ts` echoes
 * `X-CSRFToken` from the `csrftoken` cookie on unsafe methods. The login
 * response carries only the user — no DRF token exists anymore.
 */

import { request } from './http'
import type { User } from '@/types/user'

export interface LoginResponse {
  user: User
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login/', {
    method: 'POST',
    body: { username, password },
  })
}

export function logout(): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/logout/', { method: 'POST' })
}

/**
 * Admin bootstrap: returns the current user when the session cookie
 * authenticates the request; 403 when it does not (session-only auth has no
 * WWW-Authenticate challenge, so DRF answers anonymous requests with 403
 * rather than 401). The backend decorates it with @ensure_csrf_cookie so the
 * browser holds a `csrftoken` cookie before its first state-changing request.
 */
export function getSession(): Promise<User> {
  return request<User>('/auth/session/')
}
