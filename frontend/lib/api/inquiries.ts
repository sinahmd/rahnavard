/**
 * Inquiry endpoints (admin read-only; status toggles via JSON PATCH).
 */

import { request } from './http'
import type { Paginated } from '@/types/api'
import type { Inquiry } from '@/types/inquiry'

/** Admin list (`/api/v1/admin/inquiries/`). */
export function listInquiries(): Promise<Paginated<Inquiry>> {
  return request<Paginated<Inquiry>>('/admin/inquiries/')
}

export interface InquiryStatusPatch {
  is_read?: boolean
  is_contacted?: boolean
}

export function patchInquiryStatus(id: number, patch: InquiryStatusPatch): Promise<Inquiry> {
  return request<Inquiry>(`/admin/inquiries/${id}/`, { method: 'PATCH', body: patch })
}
