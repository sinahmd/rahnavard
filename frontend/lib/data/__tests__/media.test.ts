/**
 * normalizeMediaUrls / stripBackendUrl tests.
 */

import { normalizeMediaUrls, stripBackendUrl } from '../media'

const BACKEND = 'http://backend:8000'

describe('stripBackendUrl', () => {
  it('strips the internal backend origin from media URLs', () => {
    expect(stripBackendUrl(`${BACKEND}/media/cars/1.jpg`)).toBe('/media/cars/1.jpg')
  })

  it('leaves relative URLs untouched', () => {
    expect(stripBackendUrl('/media/cars/1.jpg')).toBe('/media/cars/1.jpg')
  })

  it('leaves absolute third-party URLs untouched', () => {
    expect(stripBackendUrl('https://cdn.example.com/x.jpg')).toBe('https://cdn.example.com/x.jpg')
  })

  it('returns falsy values unchanged', () => {
    expect(stripBackendUrl(null)).toBeNull()
    expect(stripBackendUrl(undefined)).toBeUndefined()
    expect(stripBackendUrl('')).toBe('')
  })
})

describe('normalizeMediaUrls', () => {
  it('strips the backend origin from the listed fields only', () => {
    const car = {
      slug: 'toyota-rav4',
      main_image: `${BACKEND}/media/cars/1.jpg`,
      catalog_file: `${BACKEND}/media/catalogs/1.pdf`,
      og_image: `${BACKEND}/media/og/1.jpg`,
      gallery: [`${BACKEND}/media/cars/gallery/0.jpg`],
    }
    normalizeMediaUrls(car, ['main_image', 'catalog_file', 'og_image'])

    expect(car.main_image).toBe('/media/cars/1.jpg')
    expect(car.catalog_file).toBe('/media/catalogs/1.pdf')
    expect(car.og_image).toBe('/media/og/1.jpg')
    // gallery is intentionally not listed (stored relative on the backend)
    expect(car.gallery).toEqual([`${BACKEND}/media/cars/gallery/0.jpg`])
  })

  it('returns the same object (in-place, side-effect free on other fields)', () => {
    const article = {
      title: 't',
      cover_image: null,
      og_image: `${BACKEND}/media/og/a.jpg`,
      excerpt: 'body',
    }
    const result = normalizeMediaUrls(article, ['cover_image', 'og_image'])

    expect(result).toBe(article)
    expect(article.title).toBe('t')
    expect(article.excerpt).toBe('body')
    expect(article.cover_image).toBeNull()
    expect(article.og_image).toBe('/media/og/a.jpg')
  })

  it('is a no-op when no listed field carries the backend prefix', () => {
    const data = { main_image: '/media/x.jpg', og_image: null }
    normalizeMediaUrls(data, ['main_image', 'og_image'])
    expect(data).toEqual({ main_image: '/media/x.jpg', og_image: null })
  })
})
