/**
 * Car endpoints. Admin CRUD preserves the backend's FormData wire format
 * (`main_image`/`og_image`/`catalog_file` files + `gallery_0..N` convention);
 * flag toggles are JSON PATCHes, matching the legacy admin list pages.
 */

import { request } from './http'
import type { Paginated } from '@/types/api'
import type { CarAdmin, CarListItem } from '@/types/car'

/** Public list (`/api/v1/cars/`) — page-1 default, as the dashboard uses. */
export function listCarsPublic(): Promise<Paginated<CarListItem>> {
  return request<Paginated<CarListItem>>('/cars/')
}

/** Admin list (`/api/v1/admin/cars/`). */
export function listCars(): Promise<Paginated<CarAdmin>> {
  return request<Paginated<CarAdmin>>('/admin/cars/')
}

/** Admin detail. */
export function getCar(id: number): Promise<CarAdmin> {
  return request<CarAdmin>(`/admin/cars/${id}/`)
}

/** Create via multipart FormData. */
export function createCar(formData: FormData): Promise<CarAdmin> {
  return request<CarAdmin>('/admin/cars/', { method: 'POST', body: formData })
}

/** Update via multipart FormData (PATCH keeps unset fields). */
export function updateCar(id: number, formData: FormData): Promise<CarAdmin> {
  return request<CarAdmin>(`/admin/cars/${id}/`, { method: 'PATCH', body: formData })
}

/** Create-or-update: one signature for the shared admin form. */
export function saveCar(formData: FormData, id?: number): Promise<CarAdmin> {
  return id === undefined ? createCar(formData) : updateCar(id, formData)
}

export function setCarActive(id: number, isActive: boolean): Promise<CarAdmin> {
  return request<CarAdmin>(`/admin/cars/${id}/`, {
    method: 'PATCH',
    body: { is_active: isActive },
  })
}

export function setCarFeatured(id: number, isFeatured: boolean): Promise<CarAdmin> {
  return request<CarAdmin>(`/admin/cars/${id}/`, {
    method: 'PATCH',
    body: { is_featured: isFeatured },
  })
}

export function deleteCar(id: number): Promise<void> {
  return request<void>(`/admin/cars/${id}/`, { method: 'DELETE' })
}
