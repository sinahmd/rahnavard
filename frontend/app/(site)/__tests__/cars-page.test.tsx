/**
 * /cars server shell tests: the shell parses raw searchParams with the
 * shared listQuery helper, fetches the matching first page plus filter
 * options, and hands both to CarsExplorer as the initial snapshot.
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { useSearchParams } from 'next/navigation'
import CarsPage from '../cars/page'
import { getCarsPage, getCarFilterOptions } from '@/lib/data/car'
import { parseCarListQuery } from '@/lib/data/listQuery'

jest.mock('@/lib/data/car', () => ({
  getCarsPage: jest.fn(),
  getCarFilterOptions: jest.fn(),
}))

const mockUseSearchParams = useSearchParams as jest.Mock

const mockGetCarsPage = getCarsPage as jest.MockedFunction<typeof getCarsPage>
const mockGetFilterOptions = getCarFilterOptions as jest.MockedFunction<typeof getCarFilterOptions>

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
}

const filters = {
  brands: ['Toyota'],
  body_types: [],
  fuel_types: [],
  transmissions: [],
  min_year: null,
  max_year: null,
  min_price: null,
  max_price: null,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetCarsPage.mockResolvedValue({
    count: 1,
    next: null,
    previous: null,
    page_size: 20,
    results: [carItem as never],
  })
  mockGetFilterOptions.mockResolvedValue(filters as never)
})

describe('/cars server shell', () => {
  it('parses searchParams and fetches the matching first page + filters', async () => {
    const element = await CarsPage({
      searchParams: { brand: 'Toyota', sort: '-created_at', page: '3' },
    })

    expect(mockGetCarsPage).toHaveBeenCalledWith(
      expect.objectContaining({
        search: '',
        page: 3,
        sort: '-created_at',
        filters: expect.objectContaining({ brand: 'Toyota' }),
      })
    )
    expect(mockGetFilterOptions).toHaveBeenCalledTimes(1)
    expect(element).toBeTruthy()
  })

  it('clamps invalid params through the shared parser', async () => {
    await CarsPage({ searchParams: { page: 'abc', sort: 'not-a-sort' } })

    expect(mockGetCarsPage).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, sort: '' })
    )
  })

  it('passes the parsed query to the island so it can skip its initial fetch', async () => {
    // Mirror the URL the server shell rendered with: when the browser URL
    // equals the server snapshot, the island must NOT fetch on mount — the
    // first HTML already contains the cards and hydration adds no duplicate
    // request (§6.C.1 Step B).
    mockUseSearchParams.mockReturnValue(new URLSearchParams('search=rav4'))
    const element = await CarsPage({ searchParams: { search: 'rav4' } })
    const expectedQuery = parseCarListQuery(new URLSearchParams('search=rav4'))
    const { container } = render(element)
    // RAV4 is unique to the car card, so it proves the server snapshot
    // actually rendered (Toyota would also match the brand filter chip).
    expect(screen.getByText('RAV4')).toBeInTheDocument()
    expect(container.querySelector('main')).toBeTruthy()
    expect(mockGetCarsPage).toHaveBeenCalledWith(expectedQuery)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})