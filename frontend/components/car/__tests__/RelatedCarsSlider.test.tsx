import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import RelatedCarsSlider from '../RelatedCarsSlider'

jest.mock('@/lib/apiUrl', () => ({
  apiUrl: (path: string) => `http://localhost:8000${path}`,
}))


const mockFetch = jest.fn()
global.fetch = mockFetch

const mockCars = [
  {
    id: 1,
    brand: 'Toyota',
    model: 'RAV4',
    persian_name: 'تویوتا راو۴',
    slug: 'toyota-rav4',
    main_image: '/media/cars/rav4.jpg',
  },
  {
    id: 2,
    brand: 'Honda',
    model: 'Civic',
    persian_name: 'هوندا سیویک',
    slug: 'honda-civic',
    main_image: '/media/cars/civic.jpg',
  },
]

describe('RelatedCarsSlider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<RelatedCarsSlider currentSlug="some-other-car" />)
    expect(screen.getByText(/در حال بارگذاری/)).toBeInTheDocument()
  })

  it('should render related cars after loading', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockCars }),
    })

    render(<RelatedCarsSlider currentSlug="other-car" />)

    await waitFor(() => {
      expect(screen.getByText('Toyota')).toBeInTheDocument()
    })
    expect(screen.getByText('RAV4')).toBeInTheDocument()
    expect(screen.getByText('Honda')).toBeInTheDocument()
    expect(screen.getByText('Civic')).toBeInTheDocument()
  })

  it('should exclude the current car from the list', async () => {
    const carsWithCurrent = [
      ...mockCars,
      {
        id: 3,
        brand: 'Hyundai',
        model: 'Tucson',
        persian_name: 'هیوندای توسان',
        slug: 'hyundai-tucson',
        main_image: '/media/cars/tucson.jpg',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: carsWithCurrent }),
    })

    render(<RelatedCarsSlider currentSlug="hyundai-tucson" />)

    await waitFor(() => {
      expect(screen.getByText('Toyota')).toBeInTheDocument()
    })

    expect(screen.queryByText('Tucson')).not.toBeInTheDocument()
  })

  it('should limit to 6 related cars', async () => {
    const manyCars = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      brand: `Brand${i}`,
      model: `Model${i}`,
      persian_name: `خودرو ${i}`,
      slug: `car-${i}`,
      main_image: `/media/cars/car${i}.jpg`,
    }))

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: manyCars }),
    })

    render(<RelatedCarsSlider currentSlug="current-car" />)

    await waitFor(() => {
      expect(screen.getByText('Brand0')).toBeInTheDocument()
    })

    const links = screen.getAllByText('مشاهده محصول')
    expect(links).toHaveLength(6)
  })

  it('should render nothing when no related cars', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    })

    const { container } = render(<RelatedCarsSlider currentSlug="only-car" />)

    await waitFor(() => {
      expect(screen.queryByText(/در حال بارگذاری/)).not.toBeInTheDocument()
    })

    expect(container.innerHTML).toBe('')
  })

  it('should handle fetch error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { container } = render(<RelatedCarsSlider currentSlug="any-car" />)

    await waitFor(() => {
      expect(screen.queryByText(/در حال بارگذاری/)).not.toBeInTheDocument()
    })

    expect(container.innerHTML).toBe('')
  })

  it('should handle non-ok response gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    })

    const { container } = render(<RelatedCarsSlider currentSlug="any-car" />)

    await waitFor(() => {
      expect(screen.queryByText(/در حال بارگذاری/)).not.toBeInTheDocument()
    })

    expect(container.innerHTML).toBe('')
  })

  it('should render car links with correct href', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockCars }),
    })

    render(<RelatedCarsSlider currentSlug="other-car" />)

    await waitFor(() => {
      expect(screen.getByText('Toyota')).toBeInTheDocument()
    })

    // Link from next/link wraps children in <a> — check via rendered anchors
    const anchors = document.querySelectorAll('a[href]')
    const hrefs = Array.from(anchors).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/cars/toyota-rav4')
    expect(hrefs).toContain('/cars/honda-civic')
  })

  it('should handle cars array without results wrapper', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCars,
    })

    render(<RelatedCarsSlider currentSlug="other-car" />)

    await waitFor(() => {
      expect(screen.getByText('Toyota')).toBeInTheDocument()
    })
  })
})
