/**
 * ConsultationModal accessibility and feedback (plan §6.I): modal dialog
 * wiring (labelled by its title), initial focus on the close button, Escape
 * and focus return via useModalA11y, and announced status — success via
 * role=status, failure via role=alert.
 */
import '@testing-library/jest-dom'
import { act, render, screen, fireEvent } from '@testing-library/react'
import ConsultationModal from '../ConsultationModal'

const mockFetch = jest.fn()

/** Drain pending microtask chains (fetch → setState) inside act. */
const flush = async () => {
  await act(async () => {})
  await act(async () => {})
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = mockFetch
})

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/نام/), { target: { value: 'علی رضایی' } })
  fireEvent.change(screen.getByLabelText(/شماره تلفن/), { target: { value: '09120000000' } })
}

describe('ConsultationModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConsultationModal isOpen={false} onClose={jest.fn()} carName="تویوتا راو۴" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a labelled modal dialog', () => {
    render(<ConsultationModal isOpen onClose={jest.fn()} carName="تویوتا راو۴" />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('درخواست مشاوره')
  })

  it('moves focus to the close button on open', () => {
    render(<ConsultationModal isOpen onClose={jest.fn()} carName="تویوتا راو۴" />)
    expect(screen.getByRole('button', { name: 'بستن' })).toHaveFocus()
  })

  it('closes on Escape', () => {
    const onClose = jest.fn()
    render(<ConsultationModal isOpen onClose={onClose} carName="تویوتا راو۴" />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('returns focus to the trigger on close', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { rerender, unmount } = render(
      <ConsultationModal isOpen onClose={jest.fn()} carName="تویوتا راو۴" />
    )
    rerender(<ConsultationModal isOpen={false} onClose={jest.fn()} carName="تویوتا راو۴" />)

    expect(trigger).toHaveFocus()
    trigger.remove()
    unmount()
  })

  it('posts the inquiry and announces success via role=status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    render(<ConsultationModal isOpen onClose={jest.fn()} carName="تویوتا راو۴" />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /ارسال درخواست مشاوره/ }))

    expect(await screen.findByRole('status')).toHaveTextContent('درخواست شما ثبت شد')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/inquiries/',
      expect.objectContaining({ method: 'POST' })
    )
    await flush()
  })

  it('announces submission failure via role=alert', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })

    render(<ConsultationModal isOpen onClose={jest.fn()} carName="تویوتا راو۴" />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /ارسال درخواست مشاوره/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('خطا در ارسال درخواست')
    await flush()
  })
})