/**
 * F4 behavioral test for the PDF.js engine loader retry fix.
 *
 * Unlike `PdfViewer.test.tsx` (which mocks the whole `../pdfjs` module) and
 * `pdfjs-lazy.test.ts` (which only reads the source), this suite imports the
 * REAL `../pdfjs` loader and mocks only the `pdfjs-dist` package — proving
 * the loader's runtime caching contract:
 *
 *   first engine load fails → the cached promise is cleared →
 *   the next loadPdfjs() performs a NEW initialization attempt (and can
 *   succeed) instead of returning the original rejected promise forever.
 *
 * `mockState.initCount` counts engine initializations: with a mocked package
 * the dynamic `import()` itself always resolves, so each fresh attempt is
 * observable as exactly one access to the module surface inside the loader's
 * initialization step. A retry that merely returned the cached rejection
 * would never increment it.
 */

const mockState = {
  /** When true, the engine surface throws during initialization (attempt fails). */
  fail: false,
  /** Number of engine initialization attempts that reached the module. */
  initCount: 0,
}

jest.mock('pdfjs-dist', () => ({
  __esModule: true,
  getDocument: jest.fn(),
  get GlobalWorkerOptions() {
    mockState.initCount += 1
    if (mockState.fail) {
      throw new Error('ChunkLoadError: engine initialization failed')
    }
    return { workerSrc: '' }
  },
}))

import { loadPdfjs, resetPdfjsLoader } from '../pdfjs'

beforeEach(() => {
  mockState.fail = false
  mockState.initCount = 0
  resetPdfjsLoader()
})

describe('pdfjs engine loader — retry after a failed load (F4)', () => {
  it('clears the cached promise on failure so a retry performs a new initialization and can succeed', async () => {
    // First attempt fails during engine initialization.
    mockState.fail = true
    await expect(loadPdfjs()).rejects.toThrow('ChunkLoadError')
    expect(mockState.initCount).toBe(1)

    // Second attempt: the cache was cleared, so the loader must run a NEW
    // initialization (initCount 2) and succeed — not replay the rejection.
    mockState.fail = false
    const engine = await loadPdfjs()
    expect(mockState.initCount).toBe(2)
    expect(engine.getDocument).toBeDefined()
  })

  it('does not re-initialize when the engine already loaded successfully', async () => {
    const first = await loadPdfjs()
    const second = await loadPdfjs()

    expect(first).toBe(second)
    expect(mockState.initCount).toBe(1)
  })

  it('shares one in-flight attempt between concurrent callers', async () => {
    // Both calls happen before the attempt settles: the second must reuse
    // the shared engine promise, not start a second initialization.
    const [a, b] = await Promise.all([loadPdfjs(), loadPdfjs()])

    expect(a).toBe(b)
    expect(mockState.initCount).toBe(1)
  })

  it('recovers when concurrent callers share a failed attempt', async () => {
    mockState.fail = true
    const results = await Promise.allSettled([loadPdfjs(), loadPdfjs()])

    // One shared failing attempt — both callers reject, one initialization.
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    expect(mockState.initCount).toBe(1)

    // The next caller starts a fresh attempt and succeeds.
    mockState.fail = false
    await expect(loadPdfjs()).resolves.toBeDefined()
    expect(mockState.initCount).toBe(2)
  })
})
