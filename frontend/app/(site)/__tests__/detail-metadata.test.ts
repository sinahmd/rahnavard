/**
 * Phase 5: per-page canonical URLs on detail pages (plan §4 SEO/UX).
 *
 * `generateMetadata` is invoked the way Next.js invokes it; the data layer
 * is mocked and `NEXT_PUBLIC_SITE_URL` controls the absolute origin. The
 * listing shells must stay canonical-free (the root canonical is sufficient —
 * plan §5 deferred work), so that absence is pinned here too.
 */

const mockGetCarDetail = jest.fn()
const mockGetArticleDetail = jest.fn()

jest.mock('@/lib/data/car', () => ({
  getCarDetail: (...args: unknown[]) => mockGetCarDetail(...args),
}))

jest.mock('@/lib/data/article', () => ({
  getArticleDetail: (...args: unknown[]) => mockGetArticleDetail(...args),
}))

import { generateMetadata as carMetadata } from '../cars/[slug]/page'
import { generateMetadata as articleMetadata } from '../articles/[slug]/page'
import { metadata as carsListMetadata } from '../cars/page'
import { metadata as articlesListMetadata } from '../articles/page'

const carDetail = {
  slug: 'toyota-rav4',
  persian_name: 'تویوتا راو۴',
  brand: 'Toyota',
  model: 'RAV4',
  year: 2025,
  seo_title: '',
  seo_description: '',
  description: 'توضیحات خودرو',
  main_image: '/media/cars/rav4.png',
  og_image: null,
} as never

const articleDetail = {
  slug: 'buying-guide',
  title: 'راهنمای خرید خودرو',
  excerpt: 'خلاصه',
  seo_title: '',
  seo_description: '',
  cover_image: '/media/articles/cover.png',
  og_image: null,
  published_at: '2026-01-01T00:00:00Z',
} as never

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_SITE_URL = 'https://rahnavard.co'
})

afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL
  }
})

describe('per-page canonical URLs (Phase 5)', () => {
  it('car detail sets an absolute canonical from NEXT_PUBLIC_SITE_URL', async () => {
    mockGetCarDetail.mockResolvedValue(carDetail)

    const metadata = await carMetadata({ params: { slug: 'toyota-rav4' } })

    expect(String(metadata.alternates?.canonical)).toBe(
      'https://rahnavard.co/cars/toyota-rav4'
    )
  })

  it('article detail sets an absolute canonical from NEXT_PUBLIC_SITE_URL', async () => {
    mockGetArticleDetail.mockResolvedValue(articleDetail)

    const metadata = await articleMetadata({ params: { slug: 'buying-guide' } })

    expect(String(metadata.alternates?.canonical)).toBe(
      'https://rahnavard.co/articles/buying-guide'
    )
  })

  it('canonical follows the configured site URL, not a hardcoded origin', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://staging.example.com'
    mockGetCarDetail.mockResolvedValue(carDetail)

    const metadata = await carMetadata({ params: { slug: 'toyota-rav4' } })

    expect(String(metadata.alternates?.canonical)).toBe(
      'https://staging.example.com/cars/toyota-rav4'
    )
  })

  it('missing detail rows get the not-found title and no canonical', async () => {
    mockGetCarDetail.mockResolvedValue(null)
    mockGetArticleDetail.mockResolvedValue(null)

    const carMeta = await carMetadata({ params: { slug: 'missing' } })
    const articleMeta = await articleMetadata({ params: { slug: 'missing' } })

    expect(carMeta.title).toBe('خودرو یافت نشد | راهنورد خودرو')
    expect(carMeta.alternates).toBeUndefined()
    expect(articleMeta.title).toBe('مقاله یافت نشد | راهنورد خودرو')
    expect(articleMeta.alternates).toBeUndefined()
  })

  it('listing shells stay canonical-free (root canonical is sufficient)', () => {
    expect(carsListMetadata.alternates).toBeUndefined()
    expect(articlesListMetadata.alternates).toBeUndefined()
  })
})
