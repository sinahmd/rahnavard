/**
 * SiteSettings endpoints. The admin settings page PATCHes a multipart
 * FormData body (text fields + optional logo file).
 */

import { request } from './http'
import type { SiteSettings } from '@/types/settings'

/** Admin settings singleton (`/api/v1/admin/settings/`). */
export function getSiteSettings(): Promise<SiteSettings> {
  return request<SiteSettings>('/admin/settings/')
}

export function updateSiteSettings(formData: FormData): Promise<SiteSettings> {
  return request<SiteSettings>('/admin/settings/', { method: 'PATCH', body: formData })
}
