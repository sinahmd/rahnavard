/**
 * Endpoint module contract tests. `fetch` is mocked below the layer under
 * test; each assertion checks the request URL/method/body the module issues
 * and that the typed payload passes through untouched.
 */

import * as articles from '../articles'
import * as auth from '../auth'
import * as branches from '../branches'
import * as cars from '../cars'
import * as features from '../features'
import * as heroSlides from '../heroSlides'
import * as inquiries from '../inquiries'
import * as settings from '../settings'

const mockFetch = jest.fn()

const okJson = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => payload,
})

beforeEach(() => {
  mockFetch.mockReset()
  global.fetch = mockFetch as jest.Mock
})

interface FetchCall {
  url: string
  init: RequestInit
}

function lastCall(): FetchCall {
  const [url, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
  // NEXT_PUBLIC_API_URL may be an absolute dev URL; compare path only.
  const path = String(url).replace(/^https?:\/\/[^/]+/, '')
  return { url: path, init: init || {} }
}

describe('cars module', () => {
  const envelope = { count: 1, next: null, previous: null, results: [{ id: 1, brand: 'Toyota' }] }
  const car = { id: 1, brand: 'Toyota', model: 'RAV4' }

  it('listCarsPublic hits the public list endpoint', async () => {
    mockFetch.mockResolvedValueOnce(okJson(envelope))
    await expect(cars.listCarsPublic()).resolves.toEqual(envelope)
    expect(lastCall().url).toBe('/api/v1/cars/')
    expect(lastCall().init.method || 'GET').toBe('GET')
  })

  it('listCars hits the admin list endpoint', async () => {
    mockFetch.mockResolvedValueOnce(okJson(envelope))
    await expect(cars.listCars()).resolves.toEqual(envelope)
    expect(lastCall().url).toBe('/api/v1/admin/cars/')
  })

  it('getCar requests the admin detail', async () => {
    mockFetch.mockResolvedValueOnce(okJson(car))
    await expect(cars.getCar(7)).resolves.toEqual(car)
    expect(lastCall().url).toBe('/api/v1/admin/cars/7/')
  })

  it('saveCar without id POSTs, with id PATCHes FormData', async () => {
    const fd = new FormData()
    fd.append('brand', 'Toyota')

    mockFetch.mockResolvedValueOnce(okJson(car))
    await cars.saveCar(fd)
    expect(lastCall().init.method).toBe('POST')
    expect(lastCall().url).toBe('/api/v1/admin/cars/')

    mockFetch.mockResolvedValueOnce(okJson(car))
    await cars.saveCar(fd, 3)
    expect(lastCall().init.method).toBe('PATCH')
    expect(lastCall().url).toBe('/api/v1/admin/cars/3/')
    expect(lastCall().init.body).toBe(fd)
  })

  it('flag toggles PATCH JSON subsets', async () => {
    mockFetch.mockResolvedValue(okJson(car))
    await cars.setCarActive(1, false)
    expect(lastCall().init.method).toBe('PATCH')
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ is_active: false })

    await cars.setCarFeatured(1, true)
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ is_featured: true })
  })

  it('deleteCar sends DELETE', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 })
    await cars.deleteCar(1)
    expect(lastCall().init.method).toBe('DELETE')
    expect(lastCall().url).toBe('/api/v1/admin/cars/1/')
  })
})

describe('articles module', () => {
  const row = { id: 2, title: 't' }

  it('maps list/get/save/publish/delete to the right endpoints', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ results: [row], count: 1, next: null, previous: null }))
    await articles.listArticles()
    expect(lastCall().url).toBe('/api/v1/admin/articles/')

    mockFetch.mockResolvedValueOnce(okJson(row))
    await articles.getArticle(2)
    expect(lastCall().url).toBe('/api/v1/admin/articles/2/')

    const fd = new FormData()
    mockFetch.mockResolvedValueOnce(okJson(row))
    await articles.saveArticle(fd, 2)
    expect(lastCall().url).toBe('/api/v1/admin/articles/2/')
    expect(lastCall().init.method).toBe('PATCH')

    mockFetch.mockResolvedValueOnce(okJson(row))
    await articles.saveArticle(fd)
    expect(lastCall().url).toBe('/api/v1/admin/articles/')
    expect(lastCall().init.method).toBe('POST')

    mockFetch.mockResolvedValueOnce(okJson(row))
    await articles.setArticlePublished(2, true)
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ is_published: true })

    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 })
    await articles.deleteArticle(2)
    expect(lastCall().init.method).toBe('DELETE')
  })

  it('listArticlesPublic hits the public endpoint', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ results: [], count: 0, next: null, previous: null }))
    await articles.listArticlesPublic()
    expect(lastCall().url).toBe('/api/v1/articles/')
  })
})

describe('branches module', () => {
  const row = { id: 1, name: 'b' }

  it('maps save/get/toggle/delete to the right endpoints', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ results: [row], count: 1, next: null, previous: null }))
    await branches.listBranches()
    expect(lastCall().url).toBe('/api/v1/admin/branches/')

    mockFetch.mockResolvedValueOnce(okJson(row))
    await branches.getBranch(1)
    expect(lastCall().url).toBe('/api/v1/admin/branches/1/')

    const fd = new FormData()
    mockFetch.mockResolvedValueOnce(okJson(row))
    await branches.saveBranch(fd)
    expect(lastCall().init.method).toBe('POST')

    mockFetch.mockResolvedValueOnce(okJson(row))
    await branches.setBranchActive(1, true)
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ is_active: true })

    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 })
    await branches.deleteBranch(1)
    expect(lastCall().init.method).toBe('DELETE')

    mockFetch.mockResolvedValueOnce(okJson({ results: [], count: 0, next: null, previous: null }))
    await branches.listBranchesPublic()
    expect(lastCall().url).toBe('/api/v1/branches/')
  })
})

describe('heroSlides / features modules', () => {
  it('maps slide CRUD to /admin/hero-slides/', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ results: [], count: 0, next: null, previous: null }))
    await heroSlides.listHeroSlides()
    expect(lastCall().url).toBe('/api/v1/admin/hero-slides/')

    mockFetch.mockResolvedValueOnce(okJson({ id: 1 }))
    await heroSlides.getHeroSlide(1)
    expect(lastCall().url).toBe('/api/v1/admin/hero-slides/1/')

    mockFetch.mockResolvedValueOnce(okJson({ id: 1 }))
    await heroSlides.setHeroSlideActive(1, false)
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ is_active: false })

    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 })
    await heroSlides.deleteHeroSlide(1)
    expect(lastCall().init.method).toBe('DELETE')
  })

  it('maps feature CRUD to /admin/features/', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ results: [], count: 0, next: null, previous: null }))
    await features.listFeatures()
    expect(lastCall().url).toBe('/api/v1/admin/features/')

    const fd = new FormData()
    mockFetch.mockResolvedValueOnce(okJson({ id: 2 }))
    await features.saveFeature(fd, 2)
    expect(lastCall().url).toBe('/api/v1/admin/features/2/')
    expect(lastCall().init.method).toBe('PATCH')

    mockFetch.mockResolvedValueOnce(okJson({ id: 2 }))
    await features.saveFeature(fd)
    expect(lastCall().init.method).toBe('POST')

    mockFetch.mockResolvedValueOnce(okJson({ id: 2 }))
    await features.setFeatureActive(2, true)
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ is_active: true })
  })
})

describe('inquiries / settings modules', () => {
  it('maps inquiry list + status patch', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ results: [], count: 0, next: null, previous: null }))
    await inquiries.listInquiries()
    expect(lastCall().url).toBe('/api/v1/admin/inquiries/')

    mockFetch.mockResolvedValueOnce(okJson({ id: 1 }))
    await inquiries.patchInquiryStatus(1, { is_read: true })
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ is_read: true })
  })

  it('maps settings get + multipart update', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ site_name: 'x' }))
    await settings.getSiteSettings()
    expect(lastCall().url).toBe('/api/v1/admin/settings/')

    const fd = new FormData()
    mockFetch.mockResolvedValueOnce(okJson({ site_name: 'y' }))
    await settings.updateSiteSettings(fd)
    expect(lastCall().url).toBe('/api/v1/admin/settings/')
    expect(lastCall().init.method).toBe('PATCH')
    expect(lastCall().init.body).toBe(fd)
  })
})

describe('auth module', () => {
  it('login POSTs credentials and returns token + user', async () => {
    const payload = { token: 'abc', user: { id: 1, username: 'admin' } }
    mockFetch.mockResolvedValueOnce(okJson(payload))

    await expect(auth.login('admin', 'secret')).resolves.toEqual(payload)
    expect(lastCall().url).toBe('/api/v1/auth/login/')
    expect(lastCall().init.method).toBe('POST')
    expect(JSON.parse(String(lastCall().init.body))).toEqual({
      username: 'admin',
      password: 'secret',
    })
  })

  it('logout POSTs without a body', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ message: 'ok' }))
    await auth.logout()
    expect(lastCall().url).toBe('/api/v1/auth/logout/')
    expect(lastCall().init.method).toBe('POST')
  })

  it('getCurrentUser GETs the current user', async () => {
    const user = { id: 1, username: 'admin' }
    mockFetch.mockResolvedValueOnce(okJson(user))
    await expect(auth.getCurrentUser()).resolves.toEqual(user)
    expect(lastCall().url).toBe('/api/v1/auth/user/')
  })
})
