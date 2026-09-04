/**
 * http.ts contract tests: envelope normalization, credential attach,
 * CSRF forwarding, JSON vs FormData handling, 401 policy, abort.
 */

import { ApiRequestError, request } from '../http'

const mockFetch = jest.fn()

/** Await a promise and return the rejection as an ApiRequestError. */
async function apiErrorOf(promise: Promise<unknown>): Promise<ApiRequestError> {
  try {
    await promise
  } catch (err) {
    if (err instanceof ApiRequestError) return err
    throw new Error(`expected ApiRequestError, got: ${String(err)}`)
  }
  throw new Error('expected the request to reject')
}

/** Await a promise and return the rejection as a plain Error. */
async function anyErrorOf(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err))
  }
  throw new Error('expected the request to reject')
}

beforeEach(() => {
  localStorage.clear()
  mockFetch.mockReset()
  global.fetch = mockFetch as jest.Mock
})

describe('request error envelope', () => {
  it('normalizes DRF field errors into ApiRequestError {message, fieldErrors}', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ brand: ['این فیلد الزامی است.', 'x'], year: ['مقدار نامعتبر'] }),
    })

    const error = await apiErrorOf(request('/admin/cars/'))
    expect(error.status).toBe(400)
    expect(error.fieldErrors).toEqual({
      brand: 'این فیلد الزامی است.',
      year: 'مقدار نامعتبر',
    })
    expect(error.message).toBe('این فیلد الزامی است.')
  })

  it('uses detail for the message when present alongside field errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'درخواست نامعتبر', brand: ['x'] }),
    })

    const error = await apiErrorOf(request('/admin/cars/'))
    expect(error.message).toBe('درخواست نامعتبر')
    expect(error.fieldErrors.brand).toBe('x')
  })

  it('maps non_field_errors to the message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ non_field_errors: ['رمز عبور اشتباه است'] }),
    })

    const error = await apiErrorOf(request('/api/v1/auth/login/'))
    expect(error.message).toBe('رمز عبور اشتباه است')
    expect(error.fieldErrors).toEqual({})
  })

  it('maps plain-string field errors (non-array DRF shape)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ phone: 'شماره معتبر نیست' }),
    })

    const error = await apiErrorOf(request('/api/v1/inquiries/'))
    expect(error.fieldErrors.phone).toBe('شماره معتبر نیست')
    expect(error.message).toBe('شماره معتبر نیست')
  })

  it('keeps the first message per field when DRF repeats a field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ brand: ['first', 'second'] }),
    })

    const error = await apiErrorOf(request('/admin/cars/'))
    expect(error.fieldErrors.brand).toBe('first')
  })

  it('falls back to a status message for non-JSON or empty error bodies', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json')
      },
    })

    const error = await apiErrorOf(request('/admin/cars/'))
    expect(error.message).toBe('Request failed with status 500')
    expect(error.fieldErrors).toEqual({})
  })
})

describe('request headers', () => {
  it('attaches the stored token as an Authorization header', async () => {
    localStorage.setItem('admin_token', 'secret-token')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })

    await request('/admin/cars/')

    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Token secret-token')
  })

  it('does not attach Authorization when no token is stored', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })

    await request('/public-ok/')

    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBeNull()
  })

  it('sends JSON bodies with Content-Type application/json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    await request('/admin/cars/1/', { method: 'PATCH', body: { is_active: true } })

    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init.body))).toEqual({ is_active: true })
  })

  it('leaves Content-Type unset for FormData bodies (browser adds boundary)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    const formData = new FormData()
    formData.append('name', 'x')
    await request('/admin/branches/', { method: 'POST', body: formData })

    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.has('Content-Type')).toBe(false)
  })

  it('forwards X-CSRFToken on unsafe methods when a csrftoken cookie exists', async () => {
    Object.defineProperty(document, 'cookie', {
      value: 'sessionid=abc; csrftoken=csrf-value; other=1',
      configurable: true,
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    await request('/admin/cars/', { method: 'DELETE' })

    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('X-CSRFToken')).toBe('csrf-value')

    Object.defineProperty(document, 'cookie', { value: '', configurable: true })
  })

  it('does not send X-CSRFToken on safe GET requests', async () => {
    Object.defineProperty(document, 'cookie', {
      value: 'csrftoken=csrf-value',
      configurable: true,
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    await request('/admin/cars/')

    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('X-CSRFToken')).toBeNull()

    Object.defineProperty(document, 'cookie', { value: '', configurable: true })
  })
})

describe('request status handling', () => {
  it('returns parsed JSON on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ count: 2, results: [{ id: 1 }] }),
    })

    const data = await request('/admin/cars/')
    expect(data).toEqual({ count: 2, results: [{ id: 1 }] })
  })

  it('returns undefined for 204 responses', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 })

    const data = await request('/admin/cars/1/', { method: 'DELETE' })
    expect(data).toBeUndefined()
  })

  it('clears the stored token and redirects on 401', async () => {
    localStorage.setItem('admin_token', 'expired-token')
    const assign = jest.fn()
    Object.defineProperty(window, 'location', {
      value: { pathname: '/admin/cars', assign },
      configurable: true,
      writable: true,
    })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid token.' }),
    })

    const error = await apiErrorOf(request('/admin/cars/'))
    expect(error.status).toBe(401)
    expect(localStorage.getItem('admin_token')).toBeNull()
    expect(assign).toHaveBeenCalledWith('/admin/login')

    Object.defineProperty(window, 'location', {
      value: { pathname: '/admin/cars' },
      configurable: true,
      writable: true,
    })
  })

  it('does not redirect when already on the login page', async () => {
    localStorage.setItem('admin_token', 'expired-token')
    const assign = jest.fn()
    Object.defineProperty(window, 'location', {
      value: { pathname: '/admin/login', assign },
      configurable: true,
      writable: true,
    })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid token.' }),
    })

    await apiErrorOf(request('/admin/cars/'))

    expect(assign).not.toHaveBeenCalled()

    Object.defineProperty(window, 'location', {
      value: { pathname: '/admin/login' },
      configurable: true,
      writable: true,
    })
  })

  it('re-throws AbortError unchanged so callers can detect aborts', async () => {
    const abortError = new DOMException('Aborted', 'AbortError')
    mockFetch.mockRejectedValueOnce(abortError)

    await expect(
      request('/admin/cars/', { signal: new AbortController().signal })
    ).rejects.toBe(abortError)
  })

  it('maps network failures to a Persian connection error', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const error = await anyErrorOf(request('/admin/cars/'))
    expect(error.message).toBe('خطا در اتصال به سرور')
  })

  it('respects a caller-supplied Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    await request('/admin/cars/1/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true }),
    })

    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
  })
})
