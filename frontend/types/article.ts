/**
 * Wire shapes for the Article domain, mirroring the backend serializers
 * (`backend/apps/articles/serializers.py`):
 * - `ArticleListItem` — ArticleListSerializer (public list)
 * - `ArticleDetail`   — ArticleDetailSerializer (public detail)
 * - `ArticleAdmin`    — ArticleAdminSerializer (admin CRUD)
 */

import type { ImageVariants } from './media'

/** ArticleListSerializer — public list rows (`/api/v1/articles/`). */
export interface ArticleListItem {
  id: number
  title: string
  slug: string
  excerpt: string
  cover_image: string | null
  /** Additive Phase 4A field; null until the variant set exists on disk. */
  cover_image_variants?: ImageVariants | null
  published_at: string | null
  created_at: string
}

/** ArticleDetailSerializer — public detail (`/api/v1/articles/{slug}/`). */
export interface ArticleDetail {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image: string | null
  /** Additive Phase 4A field; null until the variant set exists on disk. */
  cover_image_variants?: ImageVariants | null
  is_published: boolean
  published_at: string | null
  seo_title: string
  seo_description: string
  og_image: string | null
  created_at: string
  updated_at: string
}

/** ArticleAdminSerializer — admin rows (`/api/v1/admin/articles/`). */
export interface ArticleAdmin {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image: string | null
  is_published: boolean
  published_at: string | null
  is_deleted: boolean
  deleted_at: string | null
  seo_title: string
  seo_description: string
  og_image: string | null
  created_at: string
  updated_at: string
}
