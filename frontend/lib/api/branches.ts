/**
 * Branch endpoints. Multipart FormData for CRUD (map_image upload),
 * JSON PATCH for the active toggle.
 */

import { request } from './http'
import type { Paginated } from '@/types/api'
import type { Branch, BranchAdmin } from '@/types/branch'

/** Public list (`/api/v1/branches/`). */
export function listBranchesPublic(): Promise<Paginated<Branch>> {
  return request<Paginated<Branch>>('/branches/')
}

/** Admin list (`/api/v1/admin/branches/`). */
export function listBranches(): Promise<Paginated<BranchAdmin>> {
  return request<Paginated<BranchAdmin>>('/admin/branches/')
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
export function saveBranch(formData: FormData, id?: number): Promise<BranchAdmin> {
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
