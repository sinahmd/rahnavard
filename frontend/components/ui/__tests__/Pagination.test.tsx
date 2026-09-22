import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import Pagination from '../Pagination'

const onPageChange = jest.fn()

beforeEach(() => {
  onPageChange.mockClear()
})

describe('Pagination — Persian numeral display (Phase 9 / UX-5)', () => {
  it('renders page numbers as Persian digits', () => {
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />)

    // Visible numerals are Persian…
    expect(screen.getByRole('button', { name: 'صفحه 2' })).toHaveTextContent('۲')
    expect(screen.getByRole('button', { name: 'صفحه 1' })).toHaveTextContent('۱')
    expect(screen.getByRole('button', { name: 'صفحه 5' })).toHaveTextContent('۵')
  })

  it('keeps aria-labels Latin so tests and a11y queries stay stable', () => {
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />)

    expect(screen.getByLabelText('صفحه 2')).toBeInTheDocument()
    expect(screen.getByLabelText('صفحه قبلی')).toBeEnabled()
    expect(screen.getByLabelText('صفحه بعدی')).toBeEnabled()
  })

  it('still navigates from the Persian-labeled buttons', () => {
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />)

    fireEvent.click(screen.getByLabelText('صفحه 4'))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })
})
