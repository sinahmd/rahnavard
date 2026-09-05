/**
 * WhyFeature ("why Rahnavard") endpoints. Typed values are serialized to
 * multipart FormData here (icon upload), JSON PATCH for the active toggle.
 */

import { request } from './http'
import { formValuesToFormData } from './formData'
import type { Paginated } from '@/types/api'
import type { FormValues } from '@/types/admin-form'
import type { WhyFeature } from '@/types/feature'

/** Admin list (`/api/v1/admin/features/`); `page` 1-based, appended when > 1. */
export function listFeatures(page?: number): Promise<Paginated<WhyFeature>> {
  const qs = page && page > 1 ? `?page=${page}` : ''
  return request<Paginated<WhyFeature>>(`/admin/features/${qs}`)
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
export function saveFeature(values: FormValues, id?: number): Promise<WhyFeature> {
  const formData = formValuesToFormData(values)
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
