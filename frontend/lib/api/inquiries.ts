/**
 * Inquiry endpoints (admin read-only; status toggles via JSON PATCH).
 */

import { request } from './http'
import type { Paginated } from '@/types/api'
import type { Inquiry } from '@/types/inquiry'

/** Admin list (`/api/v1/admin/inquiries/`); `page` 1-based, appended when > 1. */
export function listInquiries(page?: number): Promise<Paginated<Inquiry>> {
  const qs = page && page > 1 ? `?page=${page}` : ''
  return request<Paginated<Inquiry>>(`/admin/inquiries/${qs}`)
}

export interface InquiryStatusPatch {
  is_read?: boolean
  is_contacted?: boolean
}

export function patchInquiryStatus(id: number, patch: InquiryStatusPatch): Promise<Inquiry> {
  return request<Inquiry>(`/admin/inquiries/${id}/`, { method: 'PATCH', body: patch })
}
