/**
 * Article endpoints. Same split as cars: typed values are serialized to
 * multipart FormData here (cover/og images), JSON PATCH for publish toggle.
 */

import { request } from './http'
import { formValuesToFormData } from './formData'
import type { Paginated } from '@/types/api'
import type { FormValues } from '@/types/admin-form'
import type { ArticleAdmin, ArticleListItem } from '@/types/article'

/** Public list (`/api/v1/articles/`). */
export function listArticlesPublic(): Promise<Paginated<ArticleListItem>> {
  return request<Paginated<ArticleListItem>>('/articles/')
}

/** Admin list (`/api/v1/admin/articles/`); `page` 1-based, appended when > 1. */
export function listArticles(page?: number): Promise<Paginated<ArticleAdmin>> {
  const qs = page && page > 1 ? `?page=${page}` : ''
  return request<Paginated<ArticleAdmin>>(`/admin/articles/${qs}`)
}

/** Admin detail. */
export function getArticle(id: number): Promise<ArticleAdmin> {
  return request<ArticleAdmin>(`/admin/articles/${id}/`)
}

export function createArticle(formData: FormData): Promise<ArticleAdmin> {
  return request<ArticleAdmin>('/admin/articles/', { method: 'POST', body: formData })
}

export function updateArticle(id: number, formData: FormData): Promise<ArticleAdmin> {
  return request<ArticleAdmin>(`/admin/articles/${id}/`, { method: 'PATCH', body: formData })
}

/** Create-or-update: one signature for the shared admin form. */
export function saveArticle(values: FormValues, id?: number): Promise<ArticleAdmin> {
  const formData = formValuesToFormData(values)
  return id === undefined ? createArticle(formData) : updateArticle(id, formData)
}

export function setArticlePublished(id: number, isPublished: boolean): Promise<ArticleAdmin> {
  return request<ArticleAdmin>(`/admin/articles/${id}/`, {
    method: 'PATCH',
    body: { is_published: isPublished },
  })
}

export function deleteArticle(id: number): Promise<void> {
  return request<void>(`/admin/articles/${id}/`, { method: 'DELETE' })
}
