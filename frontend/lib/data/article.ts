/**
 * Server-only article data fetchers (RSC).
 */

import type { ArticleListItem, ArticleDetail } from '@/types/article'
import type { Paginated } from '@/types/api'
import { normalizeMediaUrls } from './media'
import { fetchDataJson, fetchDataJsonWithRetry } from './request'
import { buildArticleListQuery, type ArticleListQuery } from './listQuery'

const REVALIDATE_SECONDS = 60

/** Fetch the first page of the article listing for the given URL query. */
export async function getArticlesPage(
  query: ArticleListQuery
): Promise<Paginated<ArticleListItem> | null> {
  const qs = buildArticleListQuery(query)
  const data = await fetchDataJson<Paginated<ArticleListItem>>(
    `/api/v1/articles/${qs ? `?${qs}` : ''}`,
    { revalidate: REVALIDATE_SECONDS }
  )
  if (data === null) return null
  data.results = data.results.map((article) =>
    normalizeMediaUrls(article, ['cover_image'])
  )
  return data
}

/** Detail page — retry/backoff + timeout + media normalization. */
export async function getArticleDetail(slug: string): Promise<ArticleDetail | null> {
  const data = await fetchDataJsonWithRetry<ArticleDetail>(`/api/v1/articles/${slug}/`, {
    revalidate: REVALIDATE_SECONDS,
  })
  if (data === null) return null
  return normalizeMediaUrls(data, ['cover_image', 'og_image'])
}