/**
 * Branch endpoints. Typed values are serialized to multipart FormData here
 * (map_image upload), JSON PATCH for the active toggle.
 */

import { request } from './http'
import { formValuesToFormData } from './formData'
import type { Paginated } from '@/types/api'
import type { FormValues } from '@/types/admin-form'
import type { Branch, BranchAdmin } from '@/types/branch'

/** Public list (`/api/v1/branches/`). */
export function listBranchesPublic(): Promise<Paginated<Branch>> {
  return request<Paginated<Branch>>('/branches/')
}

/** Admin list (`/api/v1/admin/branches/`); `page` 1-based, appended when > 1. */
export function listBranches(page?: number): Promise<Paginated<BranchAdmin>> {
  const qs = page && page > 1 ? `?page=${page}` : ''
  return request<Paginated<BranchAdmin>>(`/admin/branches/${qs}`)
}

/** Admin detail (edit form load). */
export function getBranch(id: number): Promise<BranchAdmin> {
  return request<BranchAdmin>(`/admin/branches/${id}/`)
}

export function createBranch(formData: FormData): Promise<BranchAdmin> {
  return request<BranchAdmin>('/admin/branches/', { method: 'POST', body: formData })
}

export function updateBranch(id: number, formData: FormData): Promise<BranchAdmin> {
  return request<BranchAdmin>(`/admin/branches/${id}/`, { method: 'PATCH', body: formData })
}

/** Create-or-update: one signature for the shared admin form. */
export function saveBranch(values: FormValues, id?: number): Promise<BranchAdmin> {
  const formData = formValuesToFormData(values)
  return id === undefined ? createBranch(formData) : updateBranch(id, formData)
}

export function setBranchActive(id: number, isActive: boolean): Promise<BranchAdmin> {
  return request<BranchAdmin>(`/admin/branches/${id}/`, {
    method: 'PATCH',
    body: { is_active: isActive },
  })
}

export function deleteBranch(id: number): Promise<void> {
  return request<void>(`/admin/branches/${id}/`, { method: 'DELETE' })
}
