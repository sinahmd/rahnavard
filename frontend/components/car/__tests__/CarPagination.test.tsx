import { render, screen, fireEvent } from '@testing-library/react'
import CarPagination from '../CarPagination'

describe('CarPagination', () => {
  it('renders nothing when totalPages is 1', () => {
    const { container } = render(
      <CarPagination currentPage={1} totalPages={1} onPageChange={jest.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders page buttons for small page count', () => {
    render(<CarPagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('highlights current page', () => {
    render(<CarPagination currentPage={2} totalPages={5} onPageChange={jest.fn()} />)
    const activePage = screen.getByText('2')
    expect(activePage.getAttribute('aria-current')).toBe('page')
  })

  it('disables previous button on page 1', () => {
    render(<CarPagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />)
    const prevBtn = screen.getByLabelText('صفحه قبلی')
    expect(prevBtn.getAttribute('disabled')).not.toBeNull()
  })

  it('disables next button on last page', () => {
    render(<CarPagination currentPage={5} totalPages={5} onPageChange={jest.fn()} />)
    const nextBtn = screen.getByLabelText('صفحه بعدی')
    expect(nextBtn.getAttribute('disabled')).not.toBeNull()
  })

  it('calls onPageChange when clicking a page', () => {
    const onPageChange = jest.fn()
    render(<CarPagination currentPage={1} totalPages={5} onPageChange={onPageChange} />)

    fireEvent.click(screen.getByText('3'))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange with previous page', () => {
    const onPageChange = jest.fn()
    render(<CarPagination currentPage={3} totalPages={5} onPageChange={onPageChange} />)

    fireEvent.click(screen.getByLabelText('صفحه قبلی'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange with next page', () => {
    const onPageChange = jest.fn()
    render(<CarPagination currentPage={3} totalPages={5} onPageChange={onPageChange} />)

    fireEvent.click(screen.getByLabelText('صفحه بعدی'))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('shows ellipsis for large page counts', () => {
    render(<CarPagination currentPage={5} totalPages={20} onPageChange={jest.fn()} />)
    const ellipses = screen.getAllByText('...')
    expect(ellipses.length).toBeGreaterThanOrEqual(1)
  })

  it('shows first and last page for large page counts', () => {
    render(<CarPagination currentPage={10} totalPages={20} onPageChange={jest.fn()} />)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('20')).toBeTruthy()
  })
})
