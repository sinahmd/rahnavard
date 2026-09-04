/**
 * WhyFeature ("why Rahnavard") endpoints. Multipart FormData for CRUD
 * (icon upload), JSON PATCH for the active toggle.
 */

import { request } from './http'
import type { Paginated } from '@/types/api'
import type { WhyFeature } from '@/types/feature'

/** Admin list (`/api/v1/admin/features/`). */
export function listFeatures(): Promise<Paginated<WhyFeature>> {
  return request<Paginated<WhyFeature>>('/admin/features/')
}

/** Admin detail (edit form load). */
export function getFeature(id: number): Promise<WhyFeature> {
  return request<WhyFeature>(`/admin/features/${id}/`)
}

export function createFeature(formData: FormData): Promise<WhyFeature> {
  return request<WhyFeature>('/admin/features/', { method: 'POST', body: formData })
}

export function updateFeature(id: number, formData: FormData): Promise<WhyFeature> {
  return request<WhyFeature>(`/admin/features/${id}/`, { method: 'PATCH', body: formData })
}

/** Create-or-update: one signature for the shared admin form. */
export function saveFeature(formData: FormData, id?: number): Promise<WhyFeature> {
  return id === undefined ? createFeature(formData) : updateFeature(id, formData)
}

export function setFeatureActive(id: number, isActive: boolean): Promise<WhyFeature> {
  return request<WhyFeature>(`/admin/features/${id}/`, {
    method: 'PATCH',
    body: { is_active: isActive },
  })
}

export function deleteFeature(id: number): Promise<void> {
  return request<void>(`/admin/features/${id}/`, { method: 'DELETE' })
}
