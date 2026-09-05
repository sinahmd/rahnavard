'use client'

import { useEffect, useRef } from 'react'
import { useModalA11y } from '@/components/ui/useModalA11y'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Accessible confirmation dialog replacing window.confirm (plan §6.H/§6.I).
 *
 * role="dialog" + aria-modal, labelled/described by the title and text,
 * initial focus on the CANCEL button (destructive-safe default), Escape and
 * overlay click cancel, Tab trapped inside the dialog, focus returned to the
 * triggering element on close (via useModalA11y).
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useRef(`confirm-title-${Math.random().toString(36).slice(2, 8)}`).current
  const descriptionId = useRef(`confirm-description-${Math.random().toString(36).slice(2, 8)}`).current

  useModalA11y({
    isOpen: open,
    onClose: onCancel,
    containerRef: dialogRef,
    initialFocusRef: cancelRef,
  })

  // ConfirmDialog has no trigger of its own; open transitions must still be
  // announced. Escape/focus-trap/focus-return live in useModalA11y.
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold mb-2">
          {title}
        </h2>
        <p id={descriptionId} className="text-gray text-sm mb-6">
          {description}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-bold"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-bold"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
