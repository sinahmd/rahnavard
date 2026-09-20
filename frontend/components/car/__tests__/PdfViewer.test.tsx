/**
 * Phase 6 PdfViewer tests (plan §8 Phase 6 test list).
 *
 * The PDF.js engine (`../pdfjs`) is mocked: these tests pin the component
 * contract — states (loading/ready/error), lazy engine load, page
 * navigation, zoom bounds, escape-hatch links, teardown, and the absence
 * of any native iframe. The engine module's own lazy-import contract is
 * pinned structurally in `pdfjs-lazy.test.ts` (importing the real module
 * would pull the real pdfjs-dist into jsdom).
 */

import '@testing-library/jest-dom'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import PdfViewer from '../PdfViewer'

const mockLoadPdfjs = jest.fn()

jest.mock('../pdfjs', () => ({
  loadPdfjs: (...args: unknown[]) => mockLoadPdfjs(...args),
  resetPdfjsLoader: jest.fn(),
}))

const mockGetDocument = jest.fn()
const mockGetPage = jest.fn()
const mockPageRender = jest.fn()
const mockDestroyDoc = jest.fn()
const mockDestroyTask = jest.fn()
const mockCancelRender = jest.fn()

/** Drain the effect/promise chains so tests end with no work in flight. */
const flush = async () => {
  await act(async () => {})
  await act(async () => {})
}

/** Project convention: fireEvent clicks (no user-event dependency). */
const click = (element: HTMLElement) => {
  act(() => {
    fireEvent.click(element)
  })
}

function resolveDocument(numPages = 3) {
  mockGetDocument.mockReturnValue({
    promise: Promise.resolve({ numPages, getPage: mockGetPage, destroy: mockDestroyDoc }),
    destroy: mockDestroyTask,
  })
}

beforeAll(() => {
  // jsdom has no canvas implementation; renderPage only needs a truthy 2d
  // context (the actual drawing happens inside the mocked page.render).
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: jest.fn(() => ({ fillRect: jest.fn() })),
  })
})

beforeEach(() => {
  // mockReset (not clearAllMocks): a test that throws mid-flight must not
  // leak queued mockReturnValueOnce values into the next test.
  mockLoadPdfjs.mockReset()
  mockGetDocument.mockReset()
  mockGetPage.mockReset()
  mockPageRender.mockReset()
  mockDestroyDoc.mockReset()
  mockDestroyTask.mockReset()
  mockCancelRender.mockReset()

  mockLoadPdfjs.mockResolvedValue({
    getDocument: mockGetDocument,
    GlobalWorkerOptions: { workerSrc: '/worker.mjs' },
  })
  mockGetPage.mockImplementation(() =>
    Promise.resolve({
      getViewport: ({ scale }: { scale: number }) => ({
        width: Math.floor(600 * scale),
        height: Math.floor(800 * scale),
      }),
      render: mockPageRender,
    })
  )
  mockPageRender.mockReturnValue({ promise: Promise.resolve(), cancel: mockCancelRender })
  mockDestroyDoc.mockResolvedValue(undefined)
  mockDestroyTask.mockResolvedValue(undefined)
  mockCancelRender.mockReturnValue(undefined)
})

describe('PdfViewer — lazy engine loading', () => {
  it('loads the engine only on mount (never at import time)', async () => {
    expect(mockLoadPdfjs).not.toHaveBeenCalled()
    // A never-resolving document holds the load chain open in the loading
    // state; the drains below keep that pending promise inside act().
    mockGetDocument.mockReturnValue({ promise: new Promise(() => {}), destroy: mockDestroyTask })
    expect(mockLoadPdfjs).not.toHaveBeenCalled()
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await flush()
    expect(mockLoadPdfjs).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status', { name: 'در حال بارگذاری کاتالوگ' })).toBeInTheDocument()
    await flush()
  })

  it('reuses the engine and asks the (mocked) loader once per mount cycle', async () => {
    resolveDocument()
    const { unmount } = render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await flush()
    unmount()

    // A remount goes through loadPdfjs again — the real module caches the
    // engine internally (pinned structurally); the component caches per instance.
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await flush()
    expect(mockGetDocument).toHaveBeenCalledTimes(2)
    expect(mockGetDocument).toHaveBeenCalledWith({ url: '/media/cars/catalog.pdf' })
    await flush()
  })

  it('never renders a native iframe — the escape hatch is a plain link', async () => {
    resolveDocument()
    const { container } = render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    // The mount's async chain resolves state outside the synchronous render;
    // drain it inside act() so the iframe assertion runs on a settled tree.
    await flush()
    expect(container.querySelector('iframe')).toBeNull()
  })
})

describe('PdfViewer — viewer states', () => {
  it('shows a loading state while the document loads', async () => {
    mockGetDocument.mockReturnValue({ promise: new Promise(() => {}), destroy: mockDestroyTask })
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)

    expect(screen.getByRole('status', { name: 'در حال بارگذاری کاتالوگ' })).toBeInTheDocument()
    expect(screen.getByText('در حال بارگذاری کاتالوگ…')).toBeInTheDocument()
    // Controls are inert while loading.
    expect(screen.getByRole('button', { name: 'صفحه بعد' })).toBeDisabled()
    await flush()
  })

  it('renders page 1 with navigation and zoom indicators once ready', async () => {
    resolveDocument()
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)

    await waitFor(() => expect(screen.getByText('صفحه 1 از 3')).toBeInTheDocument())
    expect(screen.getByText('100٪')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'کاتالوگ PDF' })).toBeInTheDocument()
    await waitFor(() => expect(mockPageRender).toHaveBeenCalledTimes(1))
    expect(mockGetPage).toHaveBeenCalledWith(1)
  })

  it('shows an error state with retry and escape hatch when the document fails to load', async () => {
    mockGetDocument.mockReturnValue({
      promise: Promise.reject(new Error('invalid pdf')),
      destroy: mockDestroyTask,
    })
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByText('بارگذاری کاتالوگ ناموفق بود.'))
    expect(screen.getByRole('button', { name: /تلاش مجدد/ })).toBeInTheDocument()
    // Escape hatch survives the failure.
    expect(screen.getAllByRole('link', { name: 'مشاهده در تب جدید' })).toHaveLength(2)
  })

  it('shows an error state when the engine/worker layer fails to initialize', async () => {
    mockLoadPdfjs.mockRejectedValueOnce(new Error('worker setup failed'))
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByText('بارگذاری کاتالوگ ناموفق بود.'))
  })

  it('retries loading after an error and recovers', async () => {
    mockGetDocument
      .mockReturnValueOnce({
        promise: Promise.reject(new Error('boom')),
        destroy: mockDestroyTask,
      })
      .mockReturnValueOnce({
        promise: Promise.resolve({ numPages: 2, getPage: mockGetPage, destroy: mockDestroyDoc }),
        destroy: mockDestroyTask,
      })
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    click(screen.getByRole('button', { name: /تلاش مجدد/ }))

    await waitFor(() => expect(screen.getByText('صفحه 1 از 2')).toBeInTheDocument())
    expect(mockGetDocument).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
    await flush()
  })
})

describe('PdfViewer — page navigation', () => {
  it('navigates next/previous and clamps at the bounds', async () => {
    resolveDocument(3)
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await waitFor(() => expect(screen.getByText('صفحه 1 از 3')).toBeInTheDocument())

    // At the first page, previous is disabled.
    expect(screen.getByRole('button', { name: 'صفحه قبل' })).toBeDisabled()
    click(screen.getByRole('button', { name: 'صفحه بعد' }))
    await waitFor(() => expect(screen.getByText('صفحه 2 از 3')).toBeInTheDocument())
    await waitFor(() => expect(mockGetPage).toHaveBeenLastCalledWith(2))

    click(screen.getByRole('button', { name: 'صفحه بعد' }))
    await waitFor(() => expect(screen.getByText('صفحه 3 از 3')).toBeInTheDocument())
    // At the last page, next is disabled.
    expect(screen.getByRole('button', { name: 'صفحه بعد' })).toBeDisabled()

    click(screen.getByRole('button', { name: 'صفحه قبل' }))
    await waitFor(() => expect(screen.getByText('صفحه 2 از 3')).toBeInTheDocument())
    await flush()
  })
})

describe('PdfViewer — zoom', () => {
  it('steps zoom and re-renders at the new scale', async () => {
    resolveDocument()
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await waitFor(() => expect(screen.getByText('100٪')).toBeInTheDocument())

    click(screen.getByRole('button', { name: 'بزرگ‌نمایی' }))
    await waitFor(() => expect(screen.getByText('125٪')).toBeInTheDocument())

    click(screen.getByRole('button', { name: 'کوچک‌نمایی' }))
    await waitFor(() => expect(screen.getByText('100٪')).toBeInTheDocument())
    await flush()
  })

  it('clamps zoom between 50٪ and 300٪', async () => {
    resolveDocument()
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await waitFor(() => expect(screen.getByText('100٪')).toBeInTheDocument())

    const zoomIn = screen.getByRole('button', { name: 'بزرگ‌نمایی' })
    const zoomOut = screen.getByRole('button', { name: 'کوچک‌نمایی' })

    // 1 → 0.5 (floor), then further clicks do nothing.
    for (let i = 0; i < 3; i += 1) click(zoomOut)
    expect(screen.getByText('50٪')).toBeInTheDocument()
    expect(zoomOut).toBeDisabled()

    // 0.5 → 3 (ceiling), then further clicks do nothing.
    for (let i = 0; i < 12; i += 1) click(zoomIn)
    expect(screen.getByText('300٪')).toBeInTheDocument()
    expect(zoomIn).toBeDisabled()
    await flush()
  })
})

describe('PdfViewer — escape hatch and download', () => {
  it('exposes open-in-new-tab and download for the raw media URL', async () => {
    resolveDocument()
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await waitFor(() => expect(screen.getByText('صفحه 1 از 3')).toBeInTheDocument())

    const openNewTab = screen.getByRole('link', { name: 'مشاهده در تب جدید' })
    expect(openNewTab).toHaveAttribute('href', '/media/cars/catalog.pdf')
    expect(openNewTab).toHaveAttribute('target', '_blank')
    expect(openNewTab).toHaveAttribute('rel', 'noopener noreferrer')

    const download = screen.getByRole('link', { name: 'دانلود' })
    expect(download).toHaveAttribute('href', '/media/cars/catalog.pdf')
    expect(download).toHaveAttribute('download')
  })
})

describe('PdfViewer — cleanup and stale work', () => {
  it('destroys the document and cancels an in-flight render on unmount', async () => {
    resolveDocument()
    // Second render (after the page change) never finishes — unmount mid-render.
    mockPageRender
      .mockReturnValueOnce({ promise: Promise.resolve(), cancel: mockCancelRender })
      .mockReturnValueOnce({ promise: new Promise(() => {}), cancel: mockCancelRender })

    const { unmount } = render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await waitFor(() => expect(screen.getByText('صفحه 1 از 3')).toBeInTheDocument())

    click(screen.getByRole('button', { name: 'صفحه بعد' }))
    await flush()

    unmount()

    expect(mockCancelRender).toHaveBeenCalled()
    expect(mockDestroyDoc).toHaveBeenCalledTimes(1)
  })

  it('destroys a stale document when the pdfUrl changes', async () => {
    resolveDocument()
    const { rerender } = render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await waitFor(() => expect(screen.getByText('صفحه 1 از 3')).toBeInTheDocument())

    mockDestroyDoc.mockClear()
    rerender(<PdfViewer pdfUrl="/media/cars/other.pdf" />)
    await flush()

    expect(mockGetDocument).toHaveBeenLastCalledWith({ url: '/media/cars/other.pdf' })
    expect(mockDestroyDoc).toHaveBeenCalledTimes(1)
  })
})

describe('PdfViewer — fullscreen (F5)', () => {
  it('enters fullscreen: the shell overlays the viewport and the page area fills it', async () => {
    resolveDocument()
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await waitFor(() => expect(screen.getByText('صفحه 1 از 3')).toBeInTheDocument())

    const toggle = screen.getByRole('button', { name: 'تمام‌صفحه' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    click(toggle)

    // Same document, new presentation: the page escapes the card layout,
    // the toggle flips state/label, and an explicit close control appears.
    expect(screen.getByText('صفحه 1 از 3')).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle).toHaveAccessibleName('خروج از تمام‌صفحه')
    expect(screen.getByRole('button', { name: 'بستن تمام‌صفحه' })).toBeInTheDocument()

    const pageArea = screen.getByRole('img', { name: 'کاتالوگ PDF' })
      .parentElement as HTMLElement
    expect(pageArea.className).toContain('flex-1')
  })

  it('exits fullscreen via the close overlay button and returns to the in-card layout', async () => {
    resolveDocument()
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await waitFor(() => expect(screen.getByText('صفحه 1 از 3')).toBeInTheDocument())

    click(screen.getByRole('button', { name: 'تمام‌صفحه' }))
    click(screen.getByRole('button', { name: 'بستن تمام‌صفحه' }))

    expect(screen.queryByRole('button', { name: 'بستن تمام‌صفحه' })).toBeNull()
    const toggle = screen.getByRole('button', { name: 'تمام‌صفحه' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    const pageArea = screen.getByRole('img', { name: 'کاتالوگ PDF' })
      .parentElement as HTMLElement
    expect(pageArea.className).toContain('max-h-[70vh]')
  })

  it('exits fullscreen via the toolbar toggle as well', async () => {
    resolveDocument()
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await waitFor(() => expect(screen.getByText('صفحه 1 از 3')).toBeInTheDocument())

    const toggle = screen.getByRole('button', { name: 'تمام‌صفحه' })
    click(toggle)
    // After entering, the same button reads as the exit control.
    click(screen.getByRole('button', { name: 'خروج از تمام‌صفحه' }))

    expect(screen.queryByRole('button', { name: 'بستن تمام‌صفحه' })).toBeNull()
    expect(screen.getByRole('button', { name: 'تمام‌صفحه' })).toBeInTheDocument()
  })
})

describe('PdfViewer — control naming (a11y cleanup)', () => {
  it('names the zoom group distinctly from its zoom-in button', async () => {
    resolveDocument()
    render(<PdfViewer pdfUrl="/media/cars/catalog.pdf" />)
    await waitFor(() => expect(screen.getByText('صفحه 1 از 3')).toBeInTheDocument())

    // The zoom-in button remains uniquely addressable by its own name.
    expect(screen.getByRole('button', { name: 'بزرگ‌نمایی' })).toBeInTheDocument()
    // The group's accessible name no longer duplicates the button's.
    expect(screen.getByRole('group', { name: 'کنترل‌های بزرگ‌نمایی' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'بزرگ‌نمایی' })).toBeNull()
  })
})
