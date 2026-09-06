/**
 * Server-only data fetchers for the home page sections.
 *
 * Each returns an array (empty on failure, never throws) so the sections
 * render deterministic empty states. Media URLs are normalized to
 * same-origin relative paths before the payload reaches client islands.
 * Next fetch dedupe collapses the repeated `/api/v1/settings/` and section
 * calls within one request tree.
 */

import type { HeroSlide } from '@/types/heroSlide'
import type { WhyFeature } from '@/types/feature'
import type { CarListItem } from '@/types/car'
import type { ArticleListItem } from '@/types/article'
import type { Branch } from '@/types/branch'
import type { Paginated } from '@/types/api'
import { normalizeMediaUrls } from './media'
import { fetchDataJson } from './request'

const REVALIDATE_SECONDS = 60

function resultsOf<T>(data: Paginated<T> | T[] | null | undefined): T[] {
  if (!data) return []
  return Array.isArray(data) ? data : data.results
}

/** Hero slides that actually carry an image (mirrors the old client filter). */
export async function getHeroSlides(): Promise<Array<HeroSlide & { image: string }>> {
  const data = await fetchDataJson<Paginated<HeroSlide>>('/api/v1/hero-slides/', {
    revalidate: REVALIDATE_SECONDS,
  })
  return resultsOf(data)
    .map((slide) => normalizeMediaUrls(slide, ['image']))
    .filter((slide): slide is HeroSlide & { image: string } => Boolean(slide.image))
}

export async function getWhyFeatures(): Promise<WhyFeature[]> {
  const data = await fetchDataJson<Paginated<WhyFeature>>('/api/v1/why-features/', {
    revalidate: REVALIDATE_SECONDS,
  })
  return resultsOf(data).map((feature) => normalizeMediaUrls(feature, ['icon']))
}

/**
 * The 3 newest cars for the home showcase: newest-first among featured
 * cars, falling back to the full listing when nothing is featured. The
 * count is capped server-side via page_size so the section stays compact
 * no matter how many cars are flagged or in the catalog.
 */
export async function getFeaturedCars(): Promise<CarListItem[]> {
  const featured = await fetchDataJson<Paginated<CarListItem>>(
    '/api/v1/cars/?is_featured=true&page_size=3&ordering=-created_at',
    { revalidate: REVALIDATE_SECONDS }
  )
  let cars = resultsOf(featured)
  if (cars.length === 0) {
    const all = await fetchDataJson<Paginated<CarListItem>>(
      '/api/v1/cars/?page_size=3&ordering=-created_at',
      { revalidate: REVALIDATE_SECONDS }
    )
    cars = resultsOf(all)
  }
  return cars
    .slice(0, 3)
    .map((car) => normalizeMediaUrls(car, ['main_image']))
}

/** The three newest articles, capped server-side via page_size. */
export async function getLatestArticles(): Promise<ArticleListItem[]> {
  const data = await fetchDataJson<Paginated<ArticleListItem>>(
    '/api/v1/articles/?page_size=3&ordering=-published_at',
    { revalidate: REVALIDATE_SECONDS }
  )
  return resultsOf(data)
    .slice(0, 3)
    .map((article) => normalizeMediaUrls(article, ['cover_image']))
}

export async function getBranches(): Promise<Branch[]> {
  const data = await fetchDataJson<Paginated<Branch>>('/api/v1/branches/', {
    revalidate: REVALIDATE_SECONDS,
  })
  return resultsOf(data).map((branch) => normalizeMediaUrls(branch, ['map_image']))
}