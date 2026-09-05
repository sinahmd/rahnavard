/**
 * Detail fetchers (lib/data/car.ts / article.ts): retry/backoff semantics
 * and media URL normalization live here, moved out of the detail pages
 * (Phase 3 §3.5). These tests pin the contract so a page refactor can't
 * silently drop the retry or the origin-stripping.
 */
import { getCarDetail } from '../car'
import { getArticleDetail } from '../article'

describe('lib/data detail fetchers', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.resetAllMocks()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('normalizes media URLs and returns the detail', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        slug: 'tot-rav',
        main_image: 'http://backend:8000/media/cars/tot.jpg',
        catalog_file: 'http://backend:8000/media/pdfs/tot.pdf',
        og_image: 'http://backend:8000/media/og/tot.jpg',
      }),
    })

    const car = await getCarDetail('tot-rav')
    expect(car).not.toBeNull()
    expect(car?.main_image).toBe('/media/cars/tot.jpg')
    expect(car?.catalog_file).toBe('/media/pdfs/tot.pdf')
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(init?.next?.revalidate).toBe(60)
  })

  it('retries on failure and returns null after exhausting attempts', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 })
    const article = await getArticleDetail('missing')
    expect(article).toBeNull()
    // 3 attempts (retry/backoff), not a single silent failure
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('keeps already-relative and third-party URLs untouched', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        slug: 'x',
        cover_image: '/media/articles/x.jpg',
        og_image: 'https://cdn.example.com/og.jpg',
      }),
    })

    const article = await getArticleDetail('x')
    expect(article?.cover_image).toBe('/media/articles/x.jpg')
    expect(article?.og_image).toBe('https://cdn.example.com/og.jpg')
  })
})