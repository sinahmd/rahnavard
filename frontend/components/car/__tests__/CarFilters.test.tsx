/**
 * CarFilters mobile drawer accessibility (plan §6.I): the slide-in panel is
 * a modal dialog while open — role/aria wiring, hidden from the tree while
 * closed, initial focus on the close button, Escape to close, Tab trapped
 * inside the drawer, overlay click closes.
 */
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import CarFilters, { FilterOptions, FilterState } from '../CarFilters'

const options: FilterOptions = {
  brands: ['Toyota', 'Honda'],
  body_types: ['SUV'],
  fuel_types: ['hybrid'],
  transmissions: ['automatic'],
  min_year: 2019,
  max_year: 2024,
  min_price: 1000000,
  max_price: 500000000,
}

const filters: FilterState = {
  brand: '',
  fuel_type: '',
  transmission: '',
  body_type: '',
  min_year: '',
  max_year: '',
  min_price: '',
  max_price: '',
}

const renderFilters = (isOpen = false, onClose = jest.fn()) =>
  render(
    <CarFilters
      options={options}
      filters={filters}
      onChange={jest.fn()}
      resultCount={3}
      isOpen={isOpen}
      onClose={onClose}
    />
  )

describe('CarFilters — mobile drawer accessibility', () => {
  it('renders the desktop sidebar alongside the mobile drawer', () => {
    renderFilters()
    expect(screen.getAllByText('فیلترها').length).toBeGreaterThanOrEqual(1)
  })

  it('is a modal dialog while open', () => {
    renderFilters(true)
    const drawer = screen.getByRole('dialog')
    expect(drawer).toHaveAttribute('aria-modal', 'true')
    expect(drawer).toHaveAccessibleName('فیلترهای جستجو')
  })

  it('is hidden from the accessibility tree while closed', () => {
    const { container } = renderFilters(false)
    const drawer = container.querySelector('[aria-hidden="true"]')
    expect(drawer).not.toBeNull()
  })

  it('moves focus to the close button when opened', () => {
    renderFilters(true)
    expect(screen.getByLabelText('بستن فیلترها')).toHaveFocus()
  })

  it('closes on Escape', () => {
    const onClose = jest.fn()
    renderFilters(true, onClose)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps Tab focus inside the drawer', () => {
    renderFilters(true)
    const close = screen.getByLabelText('بستن فیلترها')
    const apply = screen.getByRole('button', { name: 'مشاهده نتایج' })

    // Tab from the last focusable wraps to the first.
    apply.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(close).toHaveFocus()

    // Shift+Tab from the first wraps to the last.
    close.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(apply).toHaveFocus()
  })

  it('closes when the overlay is clicked', () => {
    const onClose = jest.fn()
    const { container } = renderFilters(true, onClose)
    const overlay = container.querySelector('.bg-black\\/50')
    expect(overlay).not.toBeNull()
    fireEvent.click(overlay as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})