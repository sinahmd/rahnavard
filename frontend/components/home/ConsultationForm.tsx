'use client'

import { useState, useEffect, FormEvent } from 'react'

interface SiteSettings {
  form_title: string
  form_description: string
}

export default function ConsultationForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<SiteSettings>({
    form_title: 'درخواست خود را برای ما ارسال نمایید',
    form_description: 'همکاران ما در کوتاه‌ترین زمان ممکن با شما تماس خواهند گرفت.',
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/`)
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      }
    }
    fetchSettings()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/inquiries/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('خطا در ارسال درخواست')
      }

      setShowSuccess(true)
      setFormData({ name: '', phone: '', subject: '', message: '' })
      setTimeout(() => setShowSuccess(false), 4500)
    } catch (err) {
      setError('خطا در ارسال درخواست. لطفاً دوباره تلاش کنید.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="consult" className="bg-white">
      <div className="wrap max-w-[760px] mx-auto text-center">
        <span className="eyebrow justify-center">فرم مشاوره</span>
        <h2 className="section-title mb-2">{settings.form_title}</h2>
        <p className="text-gray mb-10">{settings.form_description}</p>

        <form onSubmit={handleSubmit} className="text-right">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px] mb-[18px]">
            <div className="flex flex-col gap-2">
              <label htmlFor="f-name" className="text-[14px] font-semibold text-dark">
                نام
              </label>
              <input
                type="text"
                id="f-name"
                placeholder="نام و نام خانوادگی"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="font-vazir text-[15px] py-3.5 px-4 rounded-[10px] border-[1.5px] border-gray-light bg-bg text-dark outline-none transition-colors focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="f-phone" className="text-[14px] font-semibold text-dark">
                شماره تلفن
              </label>
              <input
                type="tel"
                id="f-phone"
                placeholder="۰۹۱۲ ۰۰۰ ۰۰ ۰۰"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="font-vazir text-[15px] py-3.5 px-4 rounded-[10px] border-[1.5px] border-gray-light bg-bg text-dark outline-none transition-colors focus:border-accent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-[18px]">
            <label htmlFor="f-subject" className="text-[14px] font-semibold text-dark">
              موضوع
            </label>
            <input
              type="text"
              id="f-subject"
              placeholder="موضوع درخواست"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="font-vazir text-[15px] py-3.5 px-4 rounded-[10px] border-[1.5px] border-gray-light bg-bg text-dark outline-none transition-colors focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-2 mb-[22px]">
            <label htmlFor="f-message" className="text-[14px] font-semibold text-dark">
              متن توضیحات
            </label>
            <textarea
              id="f-message"
              placeholder="توضیحات خود را بنویسید..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              className="font-vazir text-[15px] py-3.5 px-4 rounded-[10px] border-[1.5px] border-gray-light bg-bg text-dark outline-none transition-colors focus:border-accent resize-y min-h-[120px]"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full mt-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'در حال ارسال...' : 'ارسال درخواست'}
          </button>

          {error && (
            <p className="text-[13px] text-red-500 font-bold mt-3.5">{error}</p>
          )}

          {showSuccess && (
            <p className="text-[13px] text-accent-dark font-bold mt-3.5">
              درخواست شما با موفقیت ارسال شد. به‌زودی با شما تماس می‌گیریم.
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
