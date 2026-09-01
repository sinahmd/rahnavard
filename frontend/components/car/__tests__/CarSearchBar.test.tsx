import { render, screen, fireEvent } from '@testing-library/react'
import CarSearchBar from '../CarSearchBar'

describe('CarSearchBar', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders with the provided value', () => {
    render(<CarSearchBar value="Toyota" onChange={jest.fn()} />)
    expect(screen.getByDisplayValue('Toyota')).toBeTruthy()
  })

  it('renders with empty value', () => {
    render(<CarSearchBar value="" onChange={jest.fn()} />)
    expect(screen.getByDisplayValue('')).toBeTruthy()
  })

  it('has correct aria-label on input', () => {
    render(<CarSearchBar value="" onChange={jest.fn()} />)
    expect(screen.getByLabelText('جستجوی خودرو')).toBeTruthy()
  })

  it('shows clear button when value is non-empty', () => {
    render(<CarSearchBar value="test" onChange={jest.fn()} />)
    expect(screen.getByLabelText('پاک کردن جستجو')).toBeTruthy()
  })

  it('hides clear button when value is empty', () => {
    render(<CarSearchBar value="" onChange={jest.fn()} />)
    expect(screen.queryByLabelText('پاک کردن جستجو')).toBeNull()
  })

  it('debounces onChange call', () => {
    const onChange = jest.fn()
    render(<CarSearchBar value="" onChange={onChange} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'T' } })

    // Should NOT have fired yet
    expect(onChange).not.toHaveBeenCalled()

    // Advance past debounce
    jest.advanceTimersByTime(400)

    expect(onChange).toHaveBeenCalledWith('T')
  })

  it('clear resets value immediately and calls onChange', () => {
    const onChange = jest.fn()
    render(<CarSearchBar value="Toyota" onChange={onChange} />)

    const clearBtn = screen.getByLabelText('پاک کردن جستجو')
    fireEvent.click(clearBtn)

    expect(onChange).toHaveBeenCalledWith('')
    expect(screen.getByDisplayValue('')).toBeTruthy()
  })

  it('syncs from parent value changes', () => {
    const { rerender } = render(<CarSearchBar value="" onChange={jest.fn()} />)
    expect(screen.getByDisplayValue('')).toBeTruthy()

    rerender(<CarSearchBar value="BMW" onChange={jest.fn()} />)
    expect(screen.getByDisplayValue('BMW')).toBeTruthy()
  })
})
