import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import FileUpload from '../FileUpload'

describe('FileUpload', () => {
  const defaultProps = {
    name: 'catalog_file',
    label: 'کاتالوگ PDF',
    value: null,
    onChange: jest.fn(),
    accept: '.pdf',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render with label', () => {
    render(<FileUpload {...defaultProps} />)
    expect(screen.getByText('کاتالوگ PDF')).toBeInTheDocument()
  })

  it('should show required indicator when required', () => {
    render(<FileUpload {...defaultProps} required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('should not show required indicator by default', () => {
    render(<FileUpload {...defaultProps} />)
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('should show help text when provided', () => {
    render(<FileUpload {...defaultProps} helpText="فایل PDF کاتالوگ" />)
    expect(screen.getByText('فایل PDF کاتالوگ')).toBeInTheDocument()
  })

  it('should show error message when provided', () => {
    render(<FileUpload {...defaultProps} error="خطا در آپلود" />)
    expect(screen.getByText('خطا در آپلود')).toBeInTheDocument()
  })

  it('should show drop zone with upload text', () => {
    render(<FileUpload {...defaultProps} />)
    expect(screen.getByText(/فایل را بکشید و رها کنید/)).toBeInTheDocument()
  })

  it('should show existing file when existingUrl is provided', () => {
    render(
      <FileUpload
        {...defaultProps}
        existingUrl="http://example.com/catalog.pdf"
        existingFileName="catalog.pdf"
      />
    )
    expect(screen.getByText('catalog.pdf')).toBeInTheDocument()
    expect(screen.getByText('مشاهده فایل')).toBeInTheDocument()
  })

  it('should call onChange with null when remove button is clicked on existing file', () => {
    const onChange = jest.fn()
    render(
      <FileUpload
        {...defaultProps}
        onChange={onChange}
        existingUrl="http://example.com/catalog.pdf"
        existingFileName="catalog.pdf"
      />
    )

    // Click the remove button (حذف)
    const removeButtons = screen.getAllByText('حذف')
    fireEvent.click(removeButtons[0])

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('should show file info when a file is selected', () => {
    const file = new File(['test'], 'catalog.pdf', { type: 'application/pdf' })
    render(<FileUpload {...defaultProps} value={file} />)

    expect(screen.getByText(/catalog.pdf/)).toBeInTheDocument()
  })

  it('should call onChange with null when remove is clicked on selected file', () => {
    const onChange = jest.fn()
    const file = new File(['test'], 'catalog.pdf', { type: 'application/pdf' })
    render(<FileUpload {...defaultProps} value={file} onChange={onChange} />)

    const removeButtons = screen.getAllByText('حذف')
    fireEvent.click(removeButtons[0])

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('should accept PDF files', () => {
    render(<FileUpload {...defaultProps} />)
    const input = document.querySelector('input[type="file"]')
    expect(input).toHaveAttribute('accept', '.pdf')
  })

  it('should not show help text when error is displayed', () => {
    render(
      <FileUpload
        {...defaultProps}
        helpText="فایل PDF کاتالوگ"
        error="خطا در آپلود"
      />
    )
    expect(screen.queryByText('فایل PDF کاتالوگ')).not.toBeInTheDocument()
  })
})
