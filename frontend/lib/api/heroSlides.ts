/**
 * HeroSlide endpoints. Multipart FormData for CRUD (image upload),
 * JSON PATCH for the active toggle.
 */

import { request } from './http'
import type { Paginated } from '@/types/api'
import type { HeroSlide } from '@/types/heroSlide'

/** Admin list (`/api/v1/admin/hero-slides/`). */
export function listHeroSlides(): Promise<Paginated<HeroSlide>> {
  return request<Paginated<HeroSlide>>('/admin/hero-slides/')
}

/** Admin detail (edit form load). */
export function getHeroSlide(id: number): Promise<HeroSlide> {
  return request<HeroSlide>(`/admin/hero-slides/${id}/`)
}

export function createHeroSlide(formData: FormData): Promise<HeroSlide> {
  return request<HeroSlide>('/admin/hero-slides/', { method: 'POST', body: formData })
}

export function updateHeroSlide(id: number, formData: FormData): Promise<HeroSlide> {
  return request<HeroSlide>(`/admin/hero-slides/${id}/`, { method: 'PATCH', body: formData })
}

/** Create-or-update: one signature for the shared admin form. */
export function saveHeroSlide(formData: FormData, id?: number): Promise<HeroSlide> {
  return id === undefined ? createHeroSlide(formData) : updateHeroSlide(id, formData)
}

export function setHeroSlideActive(id: number, isActive: boolean): Promise<HeroSlide> {
  return request<HeroSlide>(`/admin/hero-slides/${id}/`, {
    method: 'PATCH',
    body: { is_active: isActive },
  })
}

export function deleteHeroSlide(id: number): Promise<void> {
  return request<void>(`/admin/hero-slides/${id}/`, { method: 'DELETE' })
}
