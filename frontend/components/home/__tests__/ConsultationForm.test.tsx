import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import ConsultationForm from '../ConsultationForm'

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('ConsultationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        form_title: 'عنوان سفارشی',
        form_description: 'توضیحات سفارشی',
      }),
    })
  })

  it('should render the form with default title', async () => {
    // Override to return settings without custom values
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    render(<ConsultationForm />)

    await waitFor(() => {
      expect(screen.getByText('درخواست خود را برای ما ارسال نمایید')).toBeInTheDocument()
    })
  })

  it('should render form fields', () => {
    render(<ConsultationForm />)
    expect(screen.getByLabelText('نام')).toBeInTheDocument()
    expect(screen.getByLabelText('شماره تلفن')).toBeInTheDocument()
    expect(screen.getByLabelText('موضوع')).toBeInTheDocument()
    expect(screen.getByLabelText('متن توضیحات')).toBeInTheDocument()
  })

  it('should render submit button', () => {
    render(<ConsultationForm />)
    expect(screen.getByRole('button', { name: 'ارسال درخواست' })).toBeInTheDocument()
  })

  it('should update form fields on input', () => {
    render(<ConsultationForm />)

    const nameInput = screen.getByLabelText('نام')
    fireEvent.change(nameInput, { target: { value: 'علی' } })
    expect(nameInput).toHaveValue('علی')

    const phoneInput = screen.getByLabelText('شماره تلفن')
    fireEvent.change(phoneInput, { target: { value: '09121234567' } })
    expect(phoneInput).toHaveValue('09121234567')
  })

  it('should submit form and show success message', async () => {
    // beforeEach fallback handles both settings and submission (ok: true)
    render(<ConsultationForm />)

    await waitFor(() => {
      expect(screen.getByText('عنوان سفارشی')).toBeInTheDocument()
    })

    // Fill form
    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'علی' } })
    fireEvent.change(screen.getByLabelText('شماره تلفن'), { target: { value: '09121234567' } })

    // Submit
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ارسال درخواست' }))
    })

    await waitFor(() => {
      expect(screen.getByText('درخواست شما با موفقیت ارسال شد. به‌زودی با شما تماس می‌گیریم.')).toBeInTheDocument()
    })

    // Form should be cleared
    expect(screen.getByLabelText('نام')).toHaveValue('')
    expect(screen.getByLabelText('شماره تلفن')).toHaveValue('')
  })

  it('should show loading state while submitting', async () => {
    // Settings fetch succeeds first, then submission hangs
    let resolveFetch: (value: any) => void
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ form_title: 'عنوان سفارشی', form_description: 'توضیحات سفارشی' }) })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve
        })
      )

    render(<ConsultationForm />)

    await waitFor(() => {
      expect(screen.getByText('عنوان سفارشی')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'علی' } })
    fireEvent.change(screen.getByLabelText('شماره تلفن'), { target: { value: '09121234567' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ارسال درخواست' }))
    })

    expect(screen.getByText('در حال ارسال...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()

    // Resolve to clean up
    act(() => {
      resolveFetch!({ ok: true, json: async () => ({}) })
    })
  })

  it('should show error message on submission failure', async () => {
    // First call: settings (ok: true with title), Second call: submission (ok: false)
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ form_title: 'عنوان سفارشی', form_description: 'توضیحات سفارشی' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'Error' }) })

    render(<ConsultationForm />)

    await waitFor(() => {
      expect(screen.getByText('عنوان سفارشی')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'علی' } })
    fireEvent.change(screen.getByLabelText('شماره تلفن'), { target: { value: '09121234567' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ارسال درخواست' }))
    })

    await waitFor(() => {
      expect(screen.getByText('خطا در ارسال درخواست. لطفاً دوباره تلاش کنید.')).toBeInTheDocument()
    })
  })

  it('should show error message on network failure', async () => {
    // First call: settings succeeds, Second call: network error
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ form_title: 'عنوان سفارشی', form_description: 'توضیحات سفارشی' }) })
      .mockRejectedValueOnce(new Error('Network error'))

    render(<ConsultationForm />)

    await waitFor(() => {
      expect(screen.getByText('عنوان سفارشی')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'علی' } })
    fireEvent.change(screen.getByLabelText('شماره تلفن'), { target: { value: '09121234567' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ارسال درخواست' }))
    })

    await waitFor(() => {
      expect(screen.getByText('خطا در ارسال درخواست. لطفاً دوباره تلاش کنید.')).toBeInTheDocument()
    })
  })

  it('should hide success message after timeout', async () => {
    jest.useFakeTimers()

    // beforeEach fallback handles both settings and submission (ok: true)
    render(<ConsultationForm />)

    await waitFor(() => {
      expect(screen.getByText('عنوان سفارشی')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'علی' } })
    fireEvent.change(screen.getByLabelText('شماره تلفن'), { target: { value: '09121234567' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ارسال درخواست' }))
    })

    await waitFor(() => {
      expect(screen.getByText('درخواست شما با موفقیت ارسال شد. به‌زودی با شما تماس می‌گیریم.')).toBeInTheDocument()
    })

    // Fast-forward past the timeout
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    await waitFor(() => {
      expect(screen.queryByText('درخواست شما با موفقیت ارسال شد. به‌زودی با شما تماس می‌گیریم.')).not.toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it('should send POST request with correct data', async () => {
    // beforeEach fallback handles both settings and submission (ok: true)
    render(<ConsultationForm />)

    await waitFor(() => {
      expect(screen.getByText('عنوان سفارشی')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'علی' } })
    fireEvent.change(screen.getByLabelText('شماره تلفن'), { target: { value: '09121234567' } })
    fireEvent.change(screen.getByLabelText('موضوع'), { target: { value: 'مشاوره خرید' } })
    fireEvent.change(screen.getByLabelText('متن توضیحات'), { target: { value: 'سلام' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ارسال درخواست' }))
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/inquiries/'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'علی',
          phone: '09121234567',
          subject: 'مشاوره خرید',
          message: 'سلام',
        }),
      })
    )
  })
})
