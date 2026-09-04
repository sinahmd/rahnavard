/**
 * Article endpoints. Same split as cars: multipart FormData for CRUD
 * (cover/og images), JSON PATCH for the published toggle.
 */

import { request } from './http'
import type { Paginated } from '@/types/api'
import type { ArticleAdmin, ArticleListItem } from '@/types/article'

/** Public list (`/api/v1/articles/`). */
export function listArticlesPublic(): Promise<Paginated<ArticleListItem>> {
  return request<Paginated<ArticleListItem>>('/articles/')
}

/** Admin list (`/api/v1/admin/articles/`). */
export function listArticles(): Promise<Paginated<ArticleAdmin>> {
  return request<Paginated<ArticleAdmin>>('/admin/articles/')
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
export function saveArticle(formData: FormData, id?: number): Promise<ArticleAdmin> {
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
