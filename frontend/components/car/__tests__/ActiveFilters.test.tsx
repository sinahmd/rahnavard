import { render, screen, fireEvent } from '@testing-library/react'
import ActiveFilters from '../ActiveFilters'
import { FilterState } from '../CarFilters'

const emptyFilters: FilterState = {
  brand: '',
  fuel_type: '',
  transmission: '',
  body_type: '',
  min_year: '',
  max_year: '',
  min_price: '',
  max_price: '',
}

describe('ActiveFilters', () => {
  it('renders nothing when no filters are active', () => {
    const { container } = render(
      <ActiveFilters filters={emptyFilters} onChange={jest.fn()} search="" onSearchChange={jest.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders search chip when search is active', () => {
    render(
      <ActiveFilters filters={emptyFilters} onChange={jest.fn()} search="Toyota" onSearchChange={jest.fn()} />
    )
    expect(screen.getByText('جستجو: Toyota')).toBeTruthy()
  })

  it('renders brand chip', () => {
    render(
      <ActiveFilters
        filters={{ ...emptyFilters, brand: 'Hyundai' }}
        onChange={jest.fn()}
        search=""
        onSearchChange={jest.fn()}
      />
    )
    expect(screen.getByText('Hyundai')).toBeTruthy()
  })

  it('renders fuel type with Persian label', () => {
    render(
      <ActiveFilters
        filters={{ ...emptyFilters, fuel_type: 'hybrid' }}
        onChange={jest.fn()}
        search=""
        onSearchChange={jest.fn()}
      />
    )
    expect(screen.getByText('هیبریدی')).toBeTruthy()
  })

  it('renders transmission with Persian label', () => {
    render(
      <ActiveFilters
        filters={{ ...emptyFilters, transmission: 'automatic' }}
        onChange={jest.fn()}
        search=""
        onSearchChange={jest.fn()}
      />
    )
    expect(screen.getByText('اتوماتیک')).toBeTruthy()
  })

  it('renders year chips', () => {
    render(
      <ActiveFilters
        filters={{ ...emptyFilters, min_year: '2023', max_year: '2025' }}
        onChange={jest.fn()}
        search=""
        onSearchChange={jest.fn()}
      />
    )
    expect(screen.getByText('از سال 2023')).toBeTruthy()
    expect(screen.getByText('تا سال 2025')).toBeTruthy()
  })

  it('renders price chips', () => {
    render(
      <ActiveFilters
        filters={{ ...emptyFilters, min_price: '500000000' }}
        onChange={jest.fn()}
        search=""
        onSearchChange={jest.fn()}
      />
    )
    expect(screen.getByText(/حداقل/)).toBeTruthy()
  })

  it('shows clear all button when multiple chips', () => {
    render(
      <ActiveFilters
        filters={{ ...emptyFilters, brand: 'Toyota', fuel_type: 'hybrid' }}
        onChange={jest.fn()}
        search=""
        onSearchChange={jest.fn()}
      />
    )
    expect(screen.getByText(/پاک کردن همه/)).toBeTruthy()
  })

  it('does not show clear all with single chip', () => {
    render(
      <ActiveFilters
        filters={{ ...emptyFilters, brand: 'Toyota' }}
        onChange={jest.fn()}
        search=""
        onSearchChange={jest.fn()}
      />
    )
    expect(screen.queryByText(/پاک کردن همه/)).toBeNull()
  })

  it('removes individual filter on chip click', () => {
    const onChange = jest.fn()
    render(
      <ActiveFilters
        filters={{ ...emptyFilters, brand: 'Toyota', fuel_type: 'hybrid' }}
        onChange={onChange}
        search=""
        onSearchChange={jest.fn()}
      />
    )

    const removeBtn = screen.getByLabelText('حذف Toyota')
    fireEvent.click(removeBtn)

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ brand: '' })
    )
  })

  it('clear all resets everything', () => {
    const onChange = jest.fn()
    const onSearchChange = jest.fn()
    render(
      <ActiveFilters
        filters={{ ...emptyFilters, brand: 'Toyota', fuel_type: 'hybrid' }}
        onChange={onChange}
        search="test"
        onSearchChange={onSearchChange}
      />
    )

    fireEvent.click(screen.getByText(/پاک کردن همه/))

    expect(onSearchChange).toHaveBeenCalledWith('')
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ brand: '', fuel_type: '' })
    )
  })

  it('clears search when search chip is removed', () => {
    const onSearchChange = jest.fn()
    render(
      <ActiveFilters
        filters={emptyFilters}
        onChange={jest.fn()}
        search="Toyota"
        onSearchChange={onSearchChange}
      />
    )

    fireEvent.click(screen.getByLabelText('حذف جستجو: Toyota'))
    expect(onSearchChange).toHaveBeenCalledWith('')
  })
})
