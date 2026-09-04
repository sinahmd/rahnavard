/**
 * Auth endpoints (token auth in Phase 1; session-cookie in Phase 2).
 * `login` returns `{ token, user }` — the token is stored by the caller
 * (`AuthContext`) exactly as before; the session bootstrap moves to
 * `/auth/session/` in Phase 2.
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

export function getCurrentUser(): Promise<User> {
  return request<User>('/auth/user/')
}
