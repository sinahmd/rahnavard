/**
 * Accessible ConfirmDialog (plan §6.H/§6.I) tests. The dialog replaces
 * window.confirm() in every admin delete flow, so its keyboard contract is
 * pinned here: role/aria wiring, destructive-safe initial focus (cancel),
 * Escape + overlay-click cancel, Tab trap, and focus return to the
 * triggering element on close.
 */
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmDialog from '../ConfirmDialog'

const props = {
  title: 'تأیید حذف',
  description: 'آیا از حذف این ردیف اطمینان دارید؟',
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
}

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<ConfirmDialog open={false} {...props} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a labelled/described modal dialog with both actions', () => {
    render(<ConfirmDialog open {...props} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('تأیید حذف')
    expect(dialog).toHaveAccessibleDescription('آیا از حذف این ردیف اطمینان دارید؟')
    expect(screen.getByRole('button', { name: 'انصراف' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تأیید' })).toBeInTheDocument()
  })

  it('focuses the cancel button on open (destructive-safe default)', () => {
    render(<ConfirmDialog open {...props} />)
    expect(screen.getByRole('button', { name: 'انصراف' })).toHaveFocus()
  })

  it('cancels on Escape', () => {
    const onCancel = jest.fn()
    render(<ConfirmDialog open {...props} onCancel={onCancel} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels on overlay click but not on dialog click', () => {
    const onCancel = jest.fn()
    const { container } = render(<ConfirmDialog open {...props} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(onCancel).not.toHaveBeenCalled()
    // The outermost fixed wrapper is the overlay layer.
    fireEvent.click(container.firstChild as HTMLElement)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('confirms via the confirm button', () => {
    const onConfirm = jest.fn()
    render(<ConfirmDialog open {...props} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'تأیید' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('traps Tab focus inside the dialog', () => {
    render(<ConfirmDialog open {...props} />)
    const cancel = screen.getByRole('button', { name: 'انصراف' })
    const confirm = screen.getByRole('button', { name: 'تأیید' })

    // Tab from the last focusable wraps to the first.
    confirm.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(cancel).toHaveFocus()

    // Shift+Tab from the first wraps to the last.
    cancel.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(confirm).toHaveFocus()
  })

  it('returns focus to the triggering element on close', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { rerender, unmount } = render(<ConfirmDialog open {...props} />)
    rerender(<ConfirmDialog open={false} {...props} />)

    expect(trigger).toHaveFocus()
    trigger.remove()
    unmount()
  })
})