'use client'

import { useState, FormEvent, useEffect } from 'react'

interface ConsultationModalProps {
  isOpen: boolean
  onClose: () => void
  carName: string
}

export default function ConsultationModal({ isOpen, onClose, carName }: ConsultationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    subject: `مشاوره خرید ${carName}`,
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update subject when carName changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, subject: `مشاوره خرید ${carName}` }))
  }, [carName])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(apiUrl('/api/v1/inquiries/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('خطا در ارسال درخواست')
      }

      setShowSuccess(true)
      setFormData({ name: '', phone: '', subject: `مشاوره خرید ${carName}`, message: '' })
    } catch {
      setError('خطا در ارسال درخواست. لطفاً دوباره تلاش کنید.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setShowSuccess(false)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full md:max-w-[520px] md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-light px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-bold text-dark">درخواست مشاوره</h3>
            <p className="text-sm text-gray mt-0.5">{carName}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            aria-label="بستن"
          >
            <svg className="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {showSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-dark mb-2">درخواست شما ثبت شد</h4>
              <p className="text-gray mb-6">
                همکاران ما در کوتاه‌ترین زمان ممکن با شما تماس خواهند گرفت.
              </p>
              <button
                onClick={handleClose}
                className="btn btn-primary px-8"
              >
                بستن
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Car name badge */}
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-accent-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21a.75.75 0 00.75-.75V11.25a3 3 0 00-3-3h-1.5l-1.72-4.575A1.125 1.125 0 0014.12 3H9.88a1.125 1.125 0 00-1.06.775L7.1 8.25H5.625a3 3 0 00-3 3v5.25c0 .621.504 1.125 1.125 1.125h14.25" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray font-medium">مشاوره برای</p>
                  <p className="text-sm font-bold text-dark">{carName}</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="modal-name" className="block text-sm font-bold mb-1.5">
                  نام <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="modal-name"
                  placeholder="نام و نام خانوادگی"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full border border-gray-light rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="modal-phone" className="block text-sm font-bold mb-1.5">
                  شماره تلفن <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="modal-phone"
                  placeholder="۰۹۱۲ ۰۰۰ ۰۰ ۰۰"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="w-full border border-gray-light rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>

              {/* Subject (editable, pre-filled) */}
              <div>
                <label htmlFor="modal-subject" className="block text-sm font-bold mb-1.5">
                  موضوع
                </label>
                <input
                  type="text"
                  id="modal-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full border border-gray-light rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="modal-message" className="block text-sm font-bold mb-1.5">
                  توضیحات
                </label>
                <textarea
                  id="modal-message"
                  placeholder="سوال یا توضیحات خود را بنویسید..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-light rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors resize-y min-h-[100px]"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-500 text-sm font-bold">{error}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn btn-primary py-3.5 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    در حال ارسال...
                  </span>
                ) : (
                  'ارسال درخواست مشاوره'
                )}
              </button>

              <p className="text-xs text-gray text-center">
                همکاران ما در کوتاه‌ترین زمان با شما تماس خواهند گرفت.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
