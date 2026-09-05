import { render, screen } from '@testing-library/react'
import CarCard from '../CarCard'

const baseCar = {
  id: 1,
  brand: 'Toyota',
  model: 'RAV4',
  persian_name: 'تویوتا راو۴',
  slug: 'toyota-rav4',
  year: 2025,
  fuel_type: 'hybrid',
  fuel_type_display: 'هیبریدی',
  transmission: 'automatic',
  transmission_display: 'اتوماتیک',
  price: '1500000000',
  body_type: 'شاسی‌بلند',
  engine: '2.5L Hybrid',
  main_image: '/media/cars/test.jpg',
  is_featured: false,
  display_order: 0,
  created_at: '2025-01-01T00:00:00Z',
}

describe('CarCard', () => {
  it('renders brand, model, and Persian name', () => {
    render(<CarCard car={baseCar} />)
    expect(screen.getByText('Toyota')).toBeTruthy()
    expect(screen.getByText('RAV4')).toBeTruthy()
    expect(screen.getByText('تویوتا راو۴')).toBeTruthy()
  })

  it('renders price with toman label', () => {
    render(<CarCard car={baseCar} />)
    expect(screen.getByText('تومان')).toBeTruthy()
  })

  it('renders year, fuel type, and transmission', () => {
    render(<CarCard car={baseCar} />)
    expect(screen.getByText('2025')).toBeTruthy()
    expect(screen.getByText('هیبریدی')).toBeTruthy()
    expect(screen.getByText('اتوماتیک')).toBeTruthy()
  })

  it('renders body type when present', () => {
    render(<CarCard car={baseCar} />)
    expect(screen.getByText('شاسی‌بلند')).toBeTruthy()
  })

  it('does not render body type when empty', () => {
    const { container } = render(<CarCard car={{ ...baseCar, body_type: '' }} />)
    expect(container.textContent).not.toContain('شاسی‌بلند')
  })

  it('hides price when null', () => {
    const { container } = render(<CarCard car={{ ...baseCar, price: null }} />)
    expect(container.textContent).not.toContain('تومان')
  })

  it('renders featured badge when is_featured is true', () => {
    render(<CarCard car={{ ...baseCar, is_featured: true }} />)
    expect(screen.getByText('ویژه')).toBeTruthy()
  })

  it('does not render featured badge when is_featured is false', () => {
    const { container } = render(<CarCard car={baseCar} />)
    expect(container.textContent).not.toContain('ویژه')
  })

  it('links to the correct car detail page', () => {
    render(<CarCard car={baseCar} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/cars/toyota-rav4')
  })

  it('renders CTA button text', () => {
    render(<CarCard car={baseCar} />)
    expect(screen.getByText('مشاهده محصول')).toBeTruthy()
  })

  it('shows fallback when no image', () => {
    render(<CarCard car={{ ...baseCar, main_image: '' }} />)
    expect(screen.getByText('بدون تصویر')).toBeTruthy()
  })
})
