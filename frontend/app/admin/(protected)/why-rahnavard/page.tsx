'use client'

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import ImageUpload from '@/components/admin/ImageUpload'
import AdminListPage from '@/components/admin/list/AdminListPage'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { ApiRequestError } from '@/lib/api/http'
import { getSiteSettings, updateSiteSettings } from '@/lib/api/settings'
import { deleteFeature, listFeatures, setFeatureActive } from '@/lib/api/features'
import type { SiteSettings } from '@/types/settings'
import type { WhyFeature } from '@/types/feature'

/**
 * Consolidated management for the home page's «چرا راهنورد» section: the
 * section copy + background (a partial PATCH on /api/v1/admin/settings/)
 * and the feature cards (the existing WhyFeature CRUD) in one tab. UI
 * grouping only — backend endpoints are unchanged.
 */
export default function WhyRahnavardAdminPage() {
  const [whyTitle, setWhyTitle] = useState('')
  const [whyDescription, setWhyDescription] = useState('')
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [currentBackground, setCurrentBackground] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    getSiteSettings()
      .then((settings: SiteSettings) => {
        if (!active) return
        setWhyTitle(settings.why_title)
        setWhyDescription(settings.why_description)
        setCurrentBackground(settings.why_background)
      })
      .catch(() => {
        if (active) setError('خطا در بارگذاری تنظیمات')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const clearFieldError = (name: string) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    // Partial PATCH: only this tab's fields — the settings page owns the rest.
    const submitData = new FormData()
    submitData.append('why_title', whyTitle)
    submitData.append('why_description', whyDescription)
    if (backgroundFile) {
      submitData.append('why_background', backgroundFile)
    }

    try {
      const data = await updateSiteSettings(submitData)
      setWhyTitle(data.why_title)
      setWhyDescription(data.why_description)
      setCurrentBackground(data.why_background)
      setBackgroundFile(null)
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
      <h1 className="text-2xl font-bold mb-6">بخش «چرا راهنورد»</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          بخش با موفقیت ذخیره شد.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">محتوای بخش و پس‌زمینه</h2>
          </div>
          <div className="p-6">
            <div className="mb-5">
              <label htmlFor="why-title" className="block text-sm font-bold mb-2">عنوان بخش</label>
              <input
                id="why-title"
                type="text"
                value={whyTitle}
                onChange={(e) => {
                  setWhyTitle(e.target.value)
                  clearFieldError('why_title')
                }}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${fieldErrors.why_title ? 'border-red-500' : ''}`}
              />
              {fieldErrors.why_title && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.why_title}</p>
              )}
            </div>

            <div className="mb-5">
              <label htmlFor="why-description" className="block text-sm font-bold mb-2">توضیحات بخش</label>
              <textarea
                id="why-description"
                value={whyDescription}
                onChange={(e) => {
                  setWhyDescription(e.target.value)
                  clearFieldError('why_description')
                }}
                rows={3}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${fieldErrors.why_description ? 'border-red-500' : ''}`}
              />
              {fieldErrors.why_description && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.why_description}</p>
              )}
            </div>

            <ImageUpload
              name="why_background"
              label="تصویر پس‌زمینه"
              value={backgroundFile}
              onChange={setBackgroundFile}
              existingUrl={currentBackground}
              error={fieldErrors.why_background}
              helpText="تصویر پس‌زمینه بخش «چرا راهنورد خودرو؟» — فرمت‌های مجاز: jpg، png، webp — حداکثر 5MB — حداقل ابعاد 800×600"
            />
          </div>
          <div className="px-6 pb-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-lg bg-accent text-dark font-bold hover:bg-accent-dark disabled:opacity-50 transition-colors"
            >
              {saving ? 'در حال ذخیره...' : 'ذخیره بخش'}
            </button>
          </div>
        </div>
      </form>

      <AdminListPage<WhyFeature>
        title="ویژگی‌های بخش"
        createHref="/admin/why-rahnavard/features/new"
        createLabel="+ ویژگی جدید"
        emptyMessage="ویژگی‌ای وجود ندارد"
        errorMessage="خطا در بارگذاری ویژگی‌ها"
        fetchPage={listFeatures}
        rowKey={(feature) => feature.id}
        columns={[
          {
            header: 'آیکون',
            hideOnMobile: true,
            cell: (feature) =>
              feature.icon ? (
                <OptimizedImage
                  src={feature.icon}
                  alt={feature.title}
                  width={40}
                  height={40}
                  className="rounded object-contain"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                  —
                </div>
              ),
          },
          { header: 'عنوان', cell: (feature) => <span className="font-bold">{feature.title}</span>, primaryOnMobile: true },
          { header: 'توضیحات', cell: (feature) => <span className="text-sm max-w-xs truncate block">{feature.description}</span> },
          { header: 'ترتیب', cell: (feature) => feature.display_order },
          {
            header: 'وضعیت',
            cell: (feature, helpers) => (
              <button
                onClick={async () => {
                  try {
                    await setFeatureActive(feature.id, !feature.is_active)
                    helpers.refresh()
                  } catch {
                    helpers.error('خطا در ذخیره تغییرات')
                  }
                }}
                aria-pressed={feature.is_active}
                className={`px-3 py-1 min-h-[36px] inline-flex items-center rounded-full text-sm font-bold ${
                  feature.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {feature.is_active ? 'فعال' : 'غیرفعال'}
              </button>
            ),
          },
          {
            header: 'عملیات',
            cell: (feature, helpers) => (
              <div className="flex gap-2">
                <Link
                  href={`/admin/why-rahnavard/features/${feature.id}/edit`}
                  className="bg-blue-100 text-blue-700 px-3 py-1 min-h-[36px] inline-flex items-center rounded text-sm hover:bg-blue-200 transition-colors"
                >
                  ویرایش
                </Link>
                <button
                  onClick={async () => {
                    const ok = await helpers.confirm('آیا از حذف این ویژگی اطمینان دارید؟')
                    if (!ok) return
                    try {
                      await deleteFeature(feature.id)
                      helpers.refresh()
                    } catch {
                      helpers.error('خطا در حذف ویژگی')
                    }
                  }}
                  className="bg-red-100 text-red-700 px-3 py-1 min-h-[36px] inline-flex items-center rounded text-sm hover:bg-red-200 transition-colors"
                >
                  حذف
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
