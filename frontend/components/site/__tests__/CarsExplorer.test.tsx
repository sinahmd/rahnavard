/**
 * CarsExplorer (client island) tests — the URL is the single source of
 * truth. These cover the §6.C.1 contract: server snapshot prevents a
 * duplicate initial fetch; filter/sort/page interactions mutate the URL via
 * router.replace; URL changes drive refetches; out-of-range pages are
 * corrected one-directionally.
 */
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import CarsExplorer from '../CarsExplorer'
import type { CarListItem } from '@/types/car'
import type { FilterOptions } from '@/components/car/CarFilters'

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

const carItem = {
  id: 1,
  brand: 'Toyota',
  model: 'RAV4',
  persian_name: 'تویوتا راو۴',
  slug: 'toyota-rav4',
  year: 2023,
  fuel_type: 'hybrid',
  fuel_type_display: 'هیبریدی',
  transmission: 'automatic',
  transmission_display: 'اتوماتیک',
  price: '1000000000',
  body_type: 'suv',
  engine: null,
  main_image: null,
  is_featured: true,
  display_order: 1,
  created_at: '2026-01-01T00:00:00Z',
} as unknown as CarListItem

const filterOptions = {
  brands: ['Toyota'],
  body_types: [],
  fuel_types: [],
  transmissions: [],
  min_year: null,
  max_year: null,
  min_price: null,
  max_price: null,
} as FilterOptions

const emptyFilters = {
  brand: '',
  fuel_type: '',
  transmission: '',
  body_type: '',
  min_year: '',
  max_year: '',
  min_price: '',
  max_price: '',
}

const paginated = (results: CarListItem[], count: number) => ({
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
  // URL-aware persistent mock: the filters endpoint and the cars listing
  // resolve deterministically no matter how many times effects re-run.
  mockFetch.mockReset()
  mockFetch.mockImplementation((url: unknown) => {
    if (String(url).includes('/cars/filters/')) {
      return Promise.resolve(jsonResponse({ brands: [], body_types: [], fuel_types: [], transmissions: [], min_year: null, max_year: null, min_price: null, max_price: null }))
    }
    return Promise.resolve(dataResponse)
  })
  global.fetch = mockFetch
})

describe('CarsExplorer — URL-derived listing state', () => {
  it('renders the server snapshot without a duplicate cars fetch', async () => {
    render(
      <CarsExplorer
        initialQuery={{ search: '', filters: { ...emptyFilters }, page: 1, sort: '' }}
        initialData={paginated([carItem], 1)}
        initialFilterOptions={filterOptions}
      />
    )

    expect(screen.getAllByText('Toyota').length).toBeGreaterThan(0)
    await act(async () => {})
    // Filters and data were both provided by the shell — no network call.
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches the matching cars for the current URL on mount', async () => {
    navigate('brand=Toyota&sort=price')
    dataResponse = jsonResponse(paginated([carItem], 1))

    render(<CarsExplorer />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/cars/?brand=Toyota&ordering=price'),
        expect.anything()
      )
    })
    await waitFor(() => expect(screen.getByText('Toyota')).toBeInTheDocument())
    await flush()
  })

  it('mutates the URL when the page changes (router.replace)', async () => {
    dataResponse = jsonResponse(paginated([carItem], 40))

    const { rerender } = render(<CarsExplorer />)

    await waitFor(() => expect(screen.getByLabelText('صفحه 2')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('صفحه 2'))

    expect(replaceMock).toHaveBeenCalledWith('/cars?page=2', { scroll: false })
    // The mocked URL updates on the next render, exactly like a real replace.
    navigate('page=2')
    rerender(<CarsExplorer />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.anything()
      )
    })
    // The refetched page renders and all state settles before the test ends.
    await waitFor(() => expect(screen.getByText('Toyota')).toBeInTheDocument())
    await flush()
  })

  it('mutates the URL on sort change', async () => {
    dataResponse = jsonResponse(paginated([carItem], 1))

    render(<CarsExplorer />)

    // Let the mount fetch settle before interacting.
    await waitFor(() => expect(screen.getAllByText('Toyota').length).toBeGreaterThan(0))

    fireEvent.change(screen.getByLabelText('مرتب‌سازی:'), { target: { value: '-created_at' } })

    expect(replaceMock).toHaveBeenCalledWith('/cars?sort=-created_at', { scroll: false })
    await flush()
  })

  it('refetches when the URL changes (back/forward / direct links)', async () => {
    dataResponse = jsonResponse(paginated([carItem], 1))

    const { rerender } = render(<CarsExplorer />)

    await waitFor(() => expect(screen.getAllByText('Toyota').length).toBeGreaterThan(0))

    // Simulate a history navigation to a filtered URL.
    navigate('brand=Honda')
    rerender(<CarsExplorer />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('brand=Honda'),
        expect.anything()
      )
    })
    await waitFor(() => expect(screen.getAllByText('Toyota').length).toBeGreaterThan(0))
    await flush()
  })

  it('corrects an out-of-range page via a single URL replace (no loop)', async () => {
    navigate('page=9')
    dataResponse = jsonResponse(paginated([carItem], 20))

    render(<CarsExplorer />)

    // totalPages = 1, requested page 9 → corrected to page 1, once.
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/cars', { scroll: false })
    })
    await flush()
    expect(replaceMock).toHaveBeenCalledTimes(1)
  })
})