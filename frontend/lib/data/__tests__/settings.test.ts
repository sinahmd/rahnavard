/**
 * Unit tests for the server-only settings fetcher (lib/data/settings.ts).
 * Pure fetch-mock tests: no React, no DOM.
 */
import { getSiteSettings, DEFAULT_SETTINGS } from '../settings'

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

describe('getSiteSettings', () => {
  it('merges the fetched payload over the Persian defaults', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ site_name: 'راهنورد تست', phone: '0123' }))

    const settings = await getSiteSettings()

    expect(settings.site_name).toBe('راهنورد تست')
    expect(settings.phone).toBe('0123')
    // Defaults fill the rest.
    expect(settings.cars_section_title).toBe(DEFAULT_SETTINGS.cars_section_title)
  })

  it('strips the internal backend origin from media URLs', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ logo: 'http://backend:8000/media/settings/logo.png', default_og_image: null })
    )

    const settings = await getSiteSettings()

    expect(settings.logo).toBe('/media/settings/logo.png')
    expect(settings.default_og_image).toBeNull()
  })

  it('returns defaults when the endpoint is unreachable (never throws)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    const settings = await getSiteSettings()

    expect(settings).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults on a non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ detail: 'boom' }, 500))

    const settings = await getSiteSettings()

    expect(settings).toEqual(DEFAULT_SETTINGS)
  })
})