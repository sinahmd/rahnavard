import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import FeaturedCars from '../FeaturedCars'
import type { SiteSettings } from '@/types/settings'
import type { CarListItem } from '@/types/car'

const settings = {
  cars_section_title: 'خودروهای ما',
  cars_section_description: 'مجموعه‌ای منتخب از خودروهای وارداتی.',
} as SiteSettings

const mockFetch = jest.fn()

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
] as unknown as CarListItem[]

describe('FeaturedCars (client island)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = mockFetch
  })

  it('renders cars passed as props without fetching on mount', () => {
    render(<FeaturedCars cars={mockCars} settings={settings} />)

    expect(screen.getByText('Toyota')).toBeInTheDocument()
    expect(screen.getByText('RAV4')).toBeInTheDocument()
    expect(screen.getByText('Honda')).toBeInTheDocument()
    expect(screen.getByText('Civic')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('renders car links with correct href', () => {
    render(<FeaturedCars cars={mockCars} settings={settings} />)

    const links = screen.getAllByText('مشاهده محصول')
    expect(links[0]).toHaveAttribute('href', '/cars/toyota-rav4')
    expect(links[1]).toHaveAttribute('href', '/cars/honda-civic')
  })

  it('shows the empty state when no cars', () => {
    render(<FeaturedCars cars={[]} settings={settings} />)
    expect(screen.getByText(/خودرویی یافت نشد/)).toBeInTheDocument()
  })

  it('uses the section title from the settings prop', () => {
    render(
      <FeaturedCars
        cars={[]}
        settings={
          {
            cars_section_title: 'عنوان سفارشی',
            cars_section_description: 'توضیحات سفارشی',
          } as SiteSettings
        }
      />
    )
    expect(screen.getByText('عنوان سفارشی')).toBeInTheDocument()
  })

  it('renders car images when main_image is provided', () => {
    render(<FeaturedCars cars={mockCars} settings={settings} />)
    const img = screen.getByAltText('تویوتا راو۴')
    expect(img).toBeInTheDocument()
  })
})