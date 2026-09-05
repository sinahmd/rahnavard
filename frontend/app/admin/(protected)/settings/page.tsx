'use client'

import { useState, useEffect, FormEvent } from 'react'
import ImageUpload from '@/components/admin/ImageUpload'
import { ApiRequestError } from '@/lib/api/http'
import { getSiteSettings, updateSiteSettings } from '@/lib/api/settings'
import type { SiteSettings } from '@/types/settings'

const defaultSettings: SiteSettings = {
  site_name: '',
  site_description: '',
  logo: null,
  phone: '',
  address: '',
  instagram: '',
  telegram: '',
  whatsapp: '',
  hero_cta_primary_text: '',
  hero_cta_primary_link: '',
  hero_cta_secondary_text: '',
  hero_cta_secondary_link: '',
  why_title: '',
  why_description: '',
  cars_section_title: '',
  cars_section_description: '',
  articles_section_title: '',
  articles_section_description: '',
  branches_section_title: '',
  form_title: '',
  form_description: '',
  footer_description: '',
  footer_copyright: '',
  default_og_image: null,
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const data = await getSiteSettings()
      setSettings(data)
    } catch {
      setError('خطا در بارگذاری تنظیمات')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (name: string, value: string) => {
    setSettings((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!settings.site_name.trim()) {
      errors.site_name = 'نام سایت الزامی است.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      setError('لطفاً خطاهای فرم را برطرف کنید.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    const submitData = new FormData()

    // Append all text fields
    Object.entries(settings).forEach(([key, value]) => {
      if (key !== 'logo' && value !== null && value !== undefined) {
        submitData.append(key, String(value))
      }
    })

    // Append logo file if changed
    if (logoFile) {
      submitData.append('logo', logoFile)
    }

    try {
      const data = await updateSiteSettings(submitData)
      setSettings(data)
      setLogoFile(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const errors = err.fieldErrors
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors)
          setError('لطفاً خطاهای فرم را برطرف کنید.')
        } else {
          setError(err.message || 'خطا در ذخیره‌سازی')
        }
      } else {
        setError('خطا در اتصال به سرور')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">در حال بارگذاری...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">تنظیمات سایت</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          تنظیمات با موفقیت ذخیره شد.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">تنظیمات عمومی</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold mb-2">
                  نام سایت <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.site_name}
                  onChange={(e) => handleChange('site_name', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${fieldErrors.site_name ? 'border-red-500' : ''}`}
                />
                {fieldErrors.site_name && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.site_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">تلفن</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="۰۹۱۱ ۲۱۰ ۰۸ ۰۰"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">توضیحات سایت</label>
                <textarea
                  value={settings.site_description}
                  onChange={(e) => handleChange('site_description', e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">آدرس</label>
                <textarea
                  value={settings.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">لوگو</h2>
          </div>
          <div className="p-6">
            <ImageUpload
              name="logo"
              label="لوگوی سایت"
              value={logoFile}
              onChange={setLogoFile}
              existingUrl={settings.logo}
              helpText="فرمت‌های مجاز: jpg، png، webp — حداکثر 5MB"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">شبکه‌های اجتماعی</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold mb-2">اینستاگرام</label>
                <input
                  type="url"
                  value={settings.instagram}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">تلگرام</label>
                <input
                  type="url"
                  value={settings.telegram}
                  onChange={(e) => handleChange('telegram', e.target.value)}
                  placeholder="https://t.me/..."
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">واتساپ</label>
                <input
                  type="text"
                  value={settings.whatsapp}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  placeholder="۰۹۱۱۲۱۰۰۸۰۰"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">بخش هیرو</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold mb-2">متن دکمه اصلی</label>
                <input
                  type="text"
                  value={settings.hero_cta_primary_text}
                  onChange={(e) => handleChange('hero_cta_primary_text', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">لینک دکمه اصلی</label>
                <input
                  type="text"
                  value={settings.hero_cta_primary_link}
                  onChange={(e) => handleChange('hero_cta_primary_link', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">متن دکمه فرعی</label>
                <input
                  type="text"
                  value={settings.hero_cta_secondary_text}
                  onChange={(e) => handleChange('hero_cta_secondary_text', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">لینک دکمه فرعی</label>
                <input
                  type="text"
                  value={settings.hero_cta_secondary_link}
                  onChange={(e) => handleChange('hero_cta_secondary_link', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section Titles */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">عناوین بخش‌ها</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold mb-2">عنوان بخش «چرا ما»</label>
                <input
                  type="text"
                  value={settings.why_title}
                  onChange={(e) => handleChange('why_title', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">توضیحات بخش «چرا ما»</label>
                <textarea
                  value={settings.why_description}
                  onChange={(e) => handleChange('why_description', e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">عنوان بخش خودروها</label>
                <input
                  type="text"
                  value={settings.cars_section_title}
                  onChange={(e) => handleChange('cars_section_title', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">توضیحات بخش خودروها</label>
                <textarea
                  value={settings.cars_section_description}
                  onChange={(e) => handleChange('cars_section_description', e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">عنوان بخش مقالات</label>
                <input
                  type="text"
                  value={settings.articles_section_title}
                  onChange={(e) => handleChange('articles_section_title', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">توضیحات بخش مقالات</label>
                <textarea
                  value={settings.articles_section_description}
                  onChange={(e) => handleChange('articles_section_description', e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">عنوان بخش شعب</label>
                <input
                  type="text"
                  value={settings.branches_section_title}
                  onChange={(e) => handleChange('branches_section_title', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Consultation Form */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">فرم مشاوره</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold mb-2">عنوان فرم</label>
                <input
                  type="text"
                  value={settings.form_title}
                  onChange={(e) => handleChange('form_title', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">توضیحات فرم</label>
                <textarea
                  value={settings.form_description}
                  onChange={(e) => handleChange('form_description', e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">فوتر</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">توضیحات فوتر</label>
                <textarea
                  value={settings.footer_description}
                  onChange={(e) => handleChange('footer_description', e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">متن کپی‌رایت</label>
                <input
                  type="text"
                  value={settings.footer_copyright}
                  onChange={(e) => handleChange('footer_copyright', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-accent text-dark font-bold hover:bg-accent-dark disabled:opacity-50 transition-colors"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
          </button>
        </div>
      </form>
    </div>
  )
}
