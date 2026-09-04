/**
 * Server-only car data fetchers (RSC).
 *
 * Listing: fetches the first page matching the URL query plus the filter
 * options for the sidebar. Detail: the existing retry/timeout/normalization
 * path moved out of the page into one place. All media URLs are normalized
 * to same-origin relative paths.
 */

import type { CarListItem, CarDetail } from '@/types/car'
import type { Paginated } from '@/types/api'
import { normalizeMediaUrls } from './media'
import { fetchDataJson, fetchDataJsonWithRetry } from './request'
import { buildCarListQuery, type CarListQuery } from './listQuery'
import type { FilterOptions } from '@/components/car/CarFilters'

const REVALIDATE_SECONDS = 60

/** Fetch the first page of the car listing for the given URL query. */
export async function getCarsPage(
  query: CarListQuery
): Promise<Paginated<CarListItem> | null> {
  const qs = buildCarListQuery(query, 'ordering')
  const data = await fetchDataJson<Paginated<CarListItem>>(
    `/api/v1/cars/${qs ? `?${qs}` : ''}`,
    { revalidate: REVALIDATE_SECONDS }
  )
  if (data === null) return null
  data.results = data.results.map((car) => normalizeMediaUrls(car, ['main_image']))
  return data
}

const EMPTY_FILTER_OPTIONS: FilterOptions = {
  brands: [],
  body_types: [],
  fuel_types: [],
  transmissions: [],
  min_year: null,
  max_year: null,
  min_price: null,
  max_price: null,
}

/**
 * Fetch the sidebar filter options. The backend response is compatible with
 * FilterOptions; missing fields fall back to empty defaults.
 */
export async function getCarFilterOptions(): Promise<FilterOptions | null> {
  const data = await fetchDataJson<Partial<FilterOptions>>('/api/v1/cars/filters/', {
    revalidate: REVALIDATE_SECONDS,
  })
  if (data === null) return null
  return { ...EMPTY_FILTER_OPTIONS, ...data }
}

/** Detail page — retry/backoff + timeout + media normalization. */
export async function getCarDetail(slug: string): Promise<CarDetail | null> {
  const data = await fetchDataJsonWithRetry<CarDetail>(`/api/v1/cars/${slug}/`, {
    revalidate: REVALIDATE_SECONDS,
  })
  if (data === null) return null
  return normalizeMediaUrls(data, ['main_image', 'catalog_file', 'og_image'])
}