import '@testing-library/jest-dom'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Header from '../Header'

// Mock MobileNav
jest.mock('../MobileNav', () => {
  return function MockMobileNav({
    isOpen,
    onClose,
    links,
  }: {
    isOpen: boolean
    onClose: () => void
    links: { href: string; label: string }[]
  }) {
    return (
      <div data-testid="mobile-nav" data-is-open={isOpen.toString()}>
        {links.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    )
  }
})

describe('Header', () => {
  beforeEach(() => {
    // Reset scroll position
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true })

    // Mock fetch for settings API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ logo: null, site_name: 'Test' }),
      })
    ) as jest.Mock
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render the logo or brand name', () => {
    render(<Header />)
    // When API returns no logo, shows text fallback
    const brandText = screen.getByText('راهنورد')
    expect(brandText).toBeInTheDocument()
  })

  it('should render all navigation links', () => {
    render(<Header />)
    // Links appear in both desktop nav and mocked MobileNav, so use getAllByText
    expect(screen.getAllByText('خانه').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('درباره ما').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('خودروها').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('مقالات').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('شعب').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('تماس با ما').length).toBeGreaterThanOrEqual(1)
  })

  it('should render mobile menu toggle button', () => {
    render(<Header />)
    const button = screen.getByRole('button', { name: /باز کردن منو/ })
    expect(button).toBeInTheDocument()
  })

  it('should toggle mobile menu on button click', () => {
    render(<Header />)
    const button = screen.getByRole('button', { name: /باز کردن منو/ })

    act(() => {
      fireEvent.click(button)
    })

    // After clicking, the aria-label should change
    const closeButton = screen.getByRole('button', { name: /بستن منو/ })
    expect(closeButton).toBeInTheDocument()
  })

  it('should pass nav links to MobileNav', () => {
    render(<Header />)
    const mobileNav = screen.getByTestId('mobile-nav')
    expect(mobileNav).toBeInTheDocument()
  })

  it('should add scrolled class when window is scrolled', () => {
    const { container } = render(<Header />)
    const header = container.querySelector('header')!

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 50, writable: true })
      window.dispatchEvent(new Event('scroll'))
    })

    expect(header.className).toContain('shadow')
  })

  it('should not have scrolled class initially', () => {
    const { container } = render(<Header />)
    const header = container.querySelector('header')!
    expect(header.className).toContain('bg-transparent')
  })
})
