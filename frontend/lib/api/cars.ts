/**
 * Car endpoints. Admin CRUD takes typed form values and serializes them to
 * the backend's multipart wire format here (main_image / og_image /
 * catalog_file files + gallery_0..N convention); flag toggles are JSON
 * PATCHes. Form components never build FormData themselves (workstream F).
 */

import { request } from './http'
import { carFormData } from './formData'
import type { Paginated } from '@/types/api'
import type { FormValues } from '@/types/admin-form'
import type { CarAdmin, CarListItem } from '@/types/car'

/** Public list (`/api/v1/cars/`) — page-1 default, as the dashboard uses. */
export function listCarsPublic(): Promise<Paginated<CarListItem>> {
  return request<Paginated<CarListItem>>('/cars/')
}

/** Admin list (`/api/v1/admin/cars/`); `page` 1-based, appended when > 1. */
export function listCars(page?: number): Promise<Paginated<CarAdmin>> {
  const qs = page && page > 1 ? `?page=${page}` : ''
  return request<Paginated<CarAdmin>>(`/admin/cars/${qs}`)
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
export function saveCar(values: FormValues, id?: number): Promise<CarAdmin> {
  const formData = carFormData(values)
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
