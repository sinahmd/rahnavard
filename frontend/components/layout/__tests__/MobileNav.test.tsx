import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileNav from '../MobileNav'

const mockLinks = [
  { href: '#top', label: 'خانه' },
  { href: '#cars', label: 'خودروها' },
  { href: '#articles', label: 'مقالات' },
]

describe('MobileNav', () => {
  it('should render all navigation links', () => {
    render(<MobileNav isOpen={true} onClose={jest.fn()} links={mockLinks} />)
    expect(screen.getByText('خانه')).toBeInTheDocument()
    expect(screen.getByText('خودروها')).toBeInTheDocument()
    expect(screen.getByText('مقالات')).toBeInTheDocument()
  })

  it('should show nav panel when isOpen is true', () => {
    const { container } = render(
      <MobileNav isOpen={true} onClose={jest.fn()} links={mockLinks} />
    )
    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('translate-x-0')
  })

  it('should hide nav panel when isOpen is false', () => {
    const { container } = render(
      <MobileNav isOpen={false} onClose={jest.fn()} links={mockLinks} />
    )
    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('-translate-x-full')
  })

  it('should show overlay when isOpen is true', () => {
    const { container } = render(
      <MobileNav isOpen={true} onClose={jest.fn()} links={mockLinks} />
    )
    const overlay = container.querySelector('[aria-hidden="true"]')
    expect(overlay).toHaveClass('opacity-100')
    expect(overlay).toHaveClass('visible')
  })

  it('should hide overlay when isOpen is false', () => {
    const { container } = render(
      <MobileNav isOpen={false} onClose={jest.fn()} links={mockLinks} />
    )
    const overlay = container.querySelector('[aria-hidden="true"]')
    expect(overlay).toHaveClass('opacity-0')
    expect(overlay).toHaveClass('invisible')
  })

  it('should call onClose when overlay is clicked', () => {
    const onClose = jest.fn()
    const { container } = render(
      <MobileNav isOpen={true} onClose={onClose} links={mockLinks} />
    )
    const overlay = container.querySelector('[aria-hidden="true"]')!
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when a link is clicked', () => {
    const onClose = jest.fn()
    render(<MobileNav isOpen={true} onClose={onClose} links={mockLinks} />)
    fireEvent.click(screen.getByText('خانه'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should render links with correct href', () => {
    render(<MobileNav isOpen={true} onClose={jest.fn()} links={mockLinks} />)
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '#top')
    expect(links[1]).toHaveAttribute('href', '#cars')
    expect(links[2]).toHaveAttribute('href', '#articles')
  })

  it('should handle empty links array', () => {
    const { container } = render(
      <MobileNav isOpen={true} onClose={jest.fn()} links={[]} />
    )
    const nav = container.querySelector('nav')
    expect(nav).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
