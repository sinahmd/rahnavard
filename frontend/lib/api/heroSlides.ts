/**
 * HeroSlide endpoints. Typed values are serialized to multipart FormData
 * here (image upload), JSON PATCH for the active toggle.
 */

import { request } from './http'
import { formValuesToFormData } from './formData'
import type { Paginated } from '@/types/api'
import type { FormValues } from '@/types/admin-form'
import type { HeroSlide } from '@/types/heroSlide'

/** Admin list (`/api/v1/admin/hero-slides/`); `page` 1-based, appended when > 1. */
export function listHeroSlides(page?: number): Promise<Paginated<HeroSlide>> {
  const qs = page && page > 1 ? `?page=${page}` : ''
  return request<Paginated<HeroSlide>>(`/admin/hero-slides/${qs}`)
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
export function saveHeroSlide(values: FormValues, id?: number): Promise<HeroSlide> {
  const formData = formValuesToFormData(values)
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
