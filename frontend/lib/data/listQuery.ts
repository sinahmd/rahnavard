/**
 * Pure parse/build helpers for the URL-driven listing pages (`/cars`,
 * `/articles`), shared by the (future, Phase 3) server shell and the
 * client island. Currently consumed by unit tests; listing pages adopt
 * this module when they land the URL-single-source state model (§6.C.1).
 *
 * Contract:
 * - `parse*Query(URLSearchParams)` derives query state from the URL —
 *   the canonical source of truth. Invalid `page` falls back to 1;
 *   invalid `sort` falls back to the default.
 * - `build*Query(...)` serializes state back to a query string, omitting
 *   empty values and page 1, mirroring today's `router.replace` output.
 *
 * Server-safe: pure, no `fetch`, no `window`, no cookies.
 */

import { SORT_OPTIONS } from '@/lib/carConstants'

const CAR_SORT_VALUES: ReadonlySet<string> = new Set(SORT_OPTIONS.map((o) => o.value))

export interface CarListFilters {
  brand: string
  fuel_type: string
  transmission: string
  body_type: string
  min_year: string
  max_year: string
  min_price: string
  max_price: string
}

export interface CarListQuery {
  search: string
  filters: CarListFilters
  page: number
  sort: string
}

export interface ArticleListQuery {
  search: string
  page: number
}

export const EMPTY_CAR_FILTERS: CarListFilters = {
  brand: '',
  fuel_type: '',
  transmission: '',
  body_type: '',
  min_year: '',
  max_year: '',
  min_price: '',
  max_price: '',
}

export function parsePage(raw: string | null): number {
  const parsed = parseInt(raw || '1', 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
}

function parseStringParam(params: URLSearchParams, key: string): string {
  return params.get(key) || ''
}

/**
 * Derive the car listing query from `searchParams`. Sort values outside
 * the known set (and thus the empty default) are discarded here once,
 * so shells and islands agree on validation.
 */
export function parseCarListQuery(params: URLSearchParams): CarListQuery {
  const sort = parseStringParam(params, 'sort')
  return {
    search: parseStringParam(params, 'search'),
    filters: {
      brand: parseStringParam(params, 'brand'),
      fuel_type: parseStringParam(params, 'fuel_type'),
      transmission: parseStringParam(params, 'transmission'),
      body_type: parseStringParam(params, 'body_type'),
      min_year: parseStringParam(params, 'min_year'),
      max_year: parseStringParam(params, 'max_year'),
      min_price: parseStringParam(params, 'min_price'),
      max_price: parseStringParam(params, 'max_price'),
    },
    page: parsePage(params.get('page')),
    sort: CAR_SORT_VALUES.has(sort) ? sort : '',
  }
}

/**
 * Serialize a car listing query to a URL query string.
 *
 * @param sortKey `'sort'` for the browser URL, `'ordering'` for the
 * backend API query — the two consumers that must not drift apart.
 */
export function buildCarListQuery(
  query: CarListQuery,
  sortKey: 'sort' | 'ordering'
): string {
  const params = new URLSearchParams()
  const { search, filters, page, sort } = query
  if (search) params.set('search', search)
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  if (sort) params.set(sortKey, sort)
  if (page > 1) params.set('page', String(page))
  return params.toString()
}

export function parseArticleListQuery(params: URLSearchParams): ArticleListQuery {
  return {
    search: parseStringParam(params, 'search'),
    page: parsePage(params.get('page')),
  }
}

export function buildArticleListQuery(query: ArticleListQuery): string {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.page > 1) params.set('page', String(query.page))
  return params.toString()
}
