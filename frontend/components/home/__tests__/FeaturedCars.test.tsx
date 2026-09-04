import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import FeaturedCars from '../FeaturedCars'
import type { SiteSettings } from '@/types/settings'

const settings = {
  cars_section_title: 'خودروهای ما',
  cars_section_description: 'مجموعه‌ای منتخب از خودروهای وارداتی.',
} as SiteSettings

const mockFetch = jest.fn()
global.fetch = mockFetch

const mockCars = [
  {
    id: 1,
    brand: 'Toyota',
    model: 'RAV4',
    persian_name: 'تویوتا راو۴',
    slug: 'toyota-rav4',
    main_image: '/images/cars/rav4.jpg',
  },
  {
    id: 2,
    brand: 'Honda',
    model: 'Civic',
    persian_name: 'هوندا سیویک',
    slug: 'honda-civic',
    main_image: '/images/cars/civic.jpg',
  },
]

describe('FeaturedCars', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // Never resolves
    render(<FeaturedCars settings={settings} />)
    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument()
  })

  it('should render cars after loading', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockCars }),
    })

    render(<FeaturedCars settings={settings} />)

    await waitFor(() => {
      expect(screen.getByText('Toyota')).toBeInTheDocument()
    })

    expect(screen.getByText('RAV4')).toBeInTheDocument()
    expect(screen.getByText('Honda')).toBeInTheDocument()
    expect(screen.getByText('Civic')).toBeInTheDocument()
  })

  it('should render car links with correct href', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockCars }),
    })

    render(<FeaturedCars settings={settings} />)

    await waitFor(() => {
      expect(screen.getByText('Toyota')).toBeInTheDocument()
    })

    const links = screen.getAllByText('مشاهده محصول')
    expect(links[0]).toHaveAttribute('href', '/cars/toyota-rav4')
    expect(links[1]).toHaveAttribute('href', '/cars/honda-civic')
  })

  it('should show empty state when no cars', async () => {
    // Featured returns empty, fallback to all cars also returns empty
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })

    render(<FeaturedCars settings={settings} />)

    await waitFor(() => {
      expect(screen.getByText(/خودرویی یافت نشد/)).toBeInTheDocument()
    })
  })

  it('should use custom section title from settings prop', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    })

    render(
      <FeaturedCars
        settings={
          {
            cars_section_title: 'عنوان سفارشی',
            cars_section_description: 'توضیحات سفارشی',
          } as SiteSettings
        }
      />
    )

    await waitFor(() => {
      expect(screen.getByText('عنوان سفارشی')).toBeInTheDocument()
    })
  })

  it('should render car images when main_image is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [mockCars[0]] }),
    })

    render(<FeaturedCars settings={settings} />)

    await waitFor(() => {
      const img = screen.getByAltText('تویوتا راو۴')
      expect(img).toBeInTheDocument()
    })
  })

  it('should handle cars array without results wrapper', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCars, // Direct array, no results wrapper
    })

    render(<FeaturedCars settings={settings} />)

    await waitFor(() => {
      expect(screen.getByText('Toyota')).toBeInTheDocument()
    })
  })
})