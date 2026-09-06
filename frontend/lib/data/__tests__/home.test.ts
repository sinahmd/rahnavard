/**
 * Unit tests for the home section RSC fetchers (lib/data/home.ts).
 * Pure fetch-mock tests: no React, no DOM.
 */
import {
  getHeroSlides,
  getWhyFeatures,
  getFeaturedCars,
  getLatestArticles,
  getBranches,
} from '../home'

const mockFetch = jest.fn()

beforeEach(() => {
  mockFetch.mockReset()
  global.fetch = mockFetch
})

const jsonResponse = (payload: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => payload,
})

describe('home section fetchers', () => {
  it('getHeroSlides filters out slides without an image', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        results: [
          { id: 1, image: 'http://backend:8000/media/hero/a.png' },
          { id: 2, image: null },
        ],
      })
    )

    const slides = await getHeroSlides()

    expect(slides).toHaveLength(1)
    expect(slides[0].id).toBe(1)
    // Internal origin stripped.
    expect(slides[0].image).toBe('/media/hero/a.png')
  })

  it('getWhyFeatures normalizes icon URLs', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ results: [{ id: 1, icon: 'http://backend:8000/media/features/x.png' }] })
    )

    const features = await getWhyFeatures()

    expect(features[0].icon).toBe('/media/features/x.png')
  })

  it('getFeaturedCars falls back to the full listing when nothing is featured', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ results: [{ id: 7, main_image: 'http://backend:8000/media/cars/7.jpg' }] })
      )

    const cars = await getFeaturedCars()

    // Newest-first, capped at 3 server-side (home section contract).
    expect(mockFetch.mock.calls[0][0]).toContain('is_featured=true')
    expect(mockFetch.mock.calls[0][0]).toContain('page_size=3')
    expect(mockFetch.mock.calls[0][0]).toContain('ordering=-created_at')
    expect(mockFetch.mock.calls[1][0]).toContain('/cars/')
    expect(mockFetch.mock.calls[1][0]).toContain('page_size=3')
    expect(cars).toHaveLength(1)
    expect(cars[0].main_image).toBe('/media/cars/7.jpg')
  })

  it('getFeaturedCars never returns more than 3 even if the API leaks rows', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ results: Array.from({ length: 9 }, (_, i) => ({ id: i + 1 })) })
    )

    const cars = await getFeaturedCars()

    expect(cars).toHaveLength(3)
  })

  it('getFeaturedCars returns featured rows without a second call', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ results: [{ id: 1 }] }))

    const cars = await getFeaturedCars()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(cars).toHaveLength(1)
  })

  it('getLatestArticles limits to 3 and normalizes covers', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        results: Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          cover_image: `http://backend:8000/media/articles/${i}.jpg`,
        })),
      })
    )

    const articles = await getLatestArticles()

    // Newest-first, capped at 3 server-side (home section contract).
    expect(mockFetch.mock.calls[0][0]).toContain('page_size=3')
    expect(mockFetch.mock.calls[0][0]).toContain('ordering=-published_at')
    expect(articles).toHaveLength(3)
    expect(articles[0].cover_image).toBe('/media/articles/0.jpg')
  })

  it('getBranches returns empty on failure (never throws)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('down'))

    const branches = await getBranches()

    expect(branches).toEqual([])
  })
})