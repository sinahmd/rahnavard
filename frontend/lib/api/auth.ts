/**
 * Auth endpoints (session-cookie auth, Phase 2).
 *
 * Authentication is the ambient httpOnly `sessionid` cookie; `http.ts` echoes
 * `X-CSRFToken` from the `csrftoken` cookie on unsafe methods. Login still
 * returns `{ token, user }` because the backend is in dual-mode and keeps
 * minting DRF tokens for legacy clients — this client ignores `token`.
 */

import { request } from './http'
import type { User } from '@/types/user'

export interface LoginResponse {
  token: string
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
 * Admin bootstrap: returns the current user when the session cookie (or, in
 * dual mode, a legacy token) authenticates the request; 401 otherwise. The
 * backend decorates it with @ensure_csrf_cookie so the browser holds a
 * `csrftoken` cookie before its first state-changing request.
 */
export function getSession(): Promise<User> {
  return request<User>('/auth/session/')
}
