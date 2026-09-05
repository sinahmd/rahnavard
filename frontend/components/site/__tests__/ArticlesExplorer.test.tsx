/**
 * ArticlesExplorer (client island) tests — URL as the single source of
 * truth: server snapshot prevents a duplicate initial fetch, page changes
 * mutate the URL, debounced search commits to the URL, and URL changes
 * drive refetches.
 */
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import ArticlesExplorer from '../ArticlesExplorer'
import type { ArticleListItem } from '@/types/article'

const mockFetch = jest.fn()
const replaceMock = jest.fn()

let currentParams = new URLSearchParams()
let dataResponse: { ok: boolean; json: () => Promise<unknown> }

// useSearchParams must keep a STABLE identity within one URL and only get a
// new identity when the URL changes (like the real hook). Tests call
// navigate() to simulate history/URL changes.
let paramsRef: URLSearchParams | null = null
function mockSearchParams() {
  if (paramsRef === null) {
    paramsRef = new URLSearchParams(currentParams.toString())
  }
  return paramsRef
}
function navigate(url: string) {
  currentParams = new URLSearchParams(url)
  paramsRef = null
}

const articleItem = {
  id: 1,
  title: 'راهنمای خرید خودرو',
  slug: 'car-buying-guide',
  excerpt: 'نکات مهم هنگام خرید',
  cover_image: null,
  published_at: '2026-01-15T10:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
} as unknown as ArticleListItem

const paginated = (results: ArticleListItem[], count: number) => ({
  count,
  next: null,
  previous: null,
  page_size: 20,
  results,
})

const jsonResponse = (payload: unknown) => ({ ok: true, status: 200, json: async () => payload })

/**
 * Drain pending microtask chains (fetch → setState) inside act so tests end
 * with no state updates in flight — keeps the suite warning-free.
 */
const flush = async () => {
  await act(async () => {})
  await act(async () => {})
}

beforeEach(() => {
  jest.clearAllMocks()
  currentParams = new URLSearchParams()
  paramsRef = null
  dataResponse = jsonResponse(paginated([], 0))
  replaceMock.mockClear()
  ;(useSearchParams as jest.Mock).mockImplementation(mockSearchParams)
  ;(useRouter as jest.Mock).mockReturnValue({
    replace: replaceMock,
    push: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })
  mockFetch.mockReset()
  mockFetch.mockImplementation(() => Promise.resolve(dataResponse))
  global.fetch = mockFetch
})

describe('ArticlesExplorer — URL-derived listing state', () => {
  it('renders the server snapshot without a duplicate fetch', async () => {
    render(
      <ArticlesExplorer
        initialQuery={{ search: '', page: 1 }}
        initialData={paginated([articleItem], 1)}
      />
    )

    expect(screen.getByText('راهنمای خرید خودرو')).toBeInTheDocument()
    await act(async () => {})
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches the matching articles for the current URL on mount', async () => {
    navigate('search=هیوندای')
    dataResponse = jsonResponse(paginated([articleItem], 1))

    render(<ArticlesExplorer />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/articles/?search='),
        expect.anything()
      )
    })
    await waitFor(() => expect(screen.getByText('راهنمای خرید خودرو')).toBeInTheDocument())
    await flush()
  })

  it('mutates the URL when the page changes (router.replace)', async () => {
    dataResponse = jsonResponse(paginated([articleItem], 40))

    const { rerender } = render(<ArticlesExplorer />)

    await waitFor(() => expect(screen.getByLabelText('صفحه 2')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('صفحه 2'))

    expect(replaceMock).toHaveBeenCalledWith('/articles?page=2', { scroll: false })

    navigate('page=2')
    rerender(<ArticlesExplorer />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.anything()
      )
    })
    await waitFor(() => expect(screen.getByText('راهنمای خرید خودرو')).toBeInTheDocument())
    await flush()
  })

  it('debounces the search input and commits to the URL', async () => {
    jest.useFakeTimers()
    try {
      render(<ArticlesExplorer />)

      fireEvent.change(screen.getByLabelText('جستجوی مقاله'), {
        target: { value: 'راهنما' },
      })
      // Not yet committed.
      expect(replaceMock).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(400)
      })

      expect(replaceMock).toHaveBeenCalledWith('/articles?search=' + encodeURIComponent('راهنما'), { scroll: false })
      // Drain the mount fetch chain (fake timers do not flush microtasks).
      await flush()
    } finally {
      jest.useRealTimers()
    }
  })

  it('refetches when the URL changes (back/forward / direct links)', async () => {
    dataResponse = jsonResponse(paginated([articleItem], 1))

    const { rerender } = render(<ArticlesExplorer />)

    await waitFor(() => expect(screen.getByText('راهنمای خرید خودرو')).toBeInTheDocument())

    navigate('search=کتابچه')
    rerender(<ArticlesExplorer />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('کتابچه')),
        expect.anything()
      )
    })
    await waitFor(() => expect(screen.getByText('راهنمای خرید خودرو')).toBeInTheDocument())
    await flush()
  })
})