/**
 * Admin dashboard stats endpoint. One backend call replaces the old
 * dashboard's four page-1 list fetches; the view returns direct counts.
 */

import { request } from './http'
import type { AdminStats } from '@/types/api'

/** Dashboard aggregate counts (`/api/v1/admin/stats/`). */
export function getAdminStats(): Promise<AdminStats> {
  return request<AdminStats>('/admin/stats/')
}
