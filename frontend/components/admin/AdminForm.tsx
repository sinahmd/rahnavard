'use client'

import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export interface FormField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'file' | 'datetime-local' | 'url'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  section?: string
  accept?: string
  helpText?: string
}

interface AdminFormProps {
  entityName: string
  entityNamePersian: string
  apiBase: string
  id?: string
  fields: FormField[]
  backUrl: string
}

export default function AdminForm({
  entityName,
  entityNamePersian,
  apiBase,
  id,
  fields,
  backUrl,
}: AdminFormProps) {
  const router = useRouter()
  const isEdit = !!id

  const [formData, setFormData] = useState<Record<string, string | boolean | File | null>>({})
  const [existingImages, setExistingImages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (isEdit) {
      fetchItem()
    }
  }, [id])

  const fetchItem = async () => {
    try {
      const response = await fetch(`${apiBase}${id}/`)
      if (response.ok) {
        const data = await response.json()
        const initial: Record<string, string | boolean | File | null> = {}
        const images: Record<string, string> = {}

        fields.forEach((field) => {
          if (field.type === 'checkbox') {
            initial[field.name] = !!data[field.name]
          } else if (field.type === 'file') {
            if (data[field.name]) {
              images[field.name] = data[field.name]
            }
            initial[field.name] = null
          } else if (field.type === 'datetime-local' && data[field.name]) {
            // Convert ISO string to datetime-local format
            const dt = new Date(data[field.name])
            initial[field.name] = dt.toISOString().slice(0, 16)
          } else {
            initial[field.name] = data[field.name] ?? ''
          }
        })

        setFormData(initial)
        setExistingImages(images)
      } else {
        setError('خطا در بارگذاری اطلاعات')
      }
    } catch {
      setError('خطا در اتصال به سرور')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (name: string, value: string | boolean | File | null) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setFieldErrors({})

    const submitData = new FormData()

    fields.forEach((field) => {
      const value = formData[field.name]

      if (field.type === 'file') {
        if (value instanceof File) {
          submitData.append(field.name, value)
        }
        // Don't append null/undefined file fields on edit (keeps existing)
      } else if (field.type === 'checkbox') {
        submitData.append(field.name, value ? 'true' : 'false')
      } else if (value !== null && value !== undefined) {
        submitData.append(field.name, String(value))
      }
    })

    try {
      const url = isEdit ? `${apiBase}${id}/` : apiBase
      const method = isEdit ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        body: submitData,
      })

      if (response.ok) {
        router.push(backUrl)
        router.refresh()
      } else {
        const errorData = await response.json().catch(() => null)
        if (errorData && typeof errorData === 'object') {
          const errors: Record<string, string[]> = {}
          Object.entries(errorData).forEach(([key, val]) => {
            if (Array.isArray(val)) {
              errors[key] = val as string[]
            }
          })
          if (Object.keys(errors).length > 0) {
            setFieldErrors(errors)
            setError('لطفاً خطاهای فرم را برطرف کنید.')
          } else {
            setError(errorData.detail || 'خطا در ذخیره‌سازی')
          }
        } else {
          setError('خطا در ذخیره‌سازی')
        }
      }
    } catch {
      setError('خطا در اتصال به سرور')
    } finally {
      setSaving(false)
    }
  }

  // Group fields by section
  const sections = fields.reduce<Record<string, FormField[]>>((acc, field) => {
    const section = field.section || 'اطلاعات اصلی'
    if (!acc[section]) acc[section] = []
    acc[section].push(field)
    return acc
  }, {})

  if (loading) {
    return <div className="text-center py-8">در حال بارگذاری...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link
            href={backUrl}
            className="text-gray-600 hover:text-dark transition-colors"
          >
            ← بازگشت
          </Link>
          <h1 className="text-2xl font-bold">
            {isEdit ? `ویرایش ${entityNamePersian}` : `${entityNamePersian} جدید`}
          </h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {Object.entries(sections).map(([sectionName, sectionFields]) => (
          <div
            key={sectionName}
            className="bg-white rounded-lg shadow mb-6"
          >
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">{sectionName}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sectionFields.map((field) => {
                  const fieldError = fieldErrors[field.name]

                  if (field.type === 'checkbox') {
                    return (
                      <div key={field.name} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={field.name}
                          checked={!!formData[field.name]}
                          onChange={(e) => handleChange(field.name, e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300"
                        />
                        <label htmlFor={field.name} className="font-medium">
                          {field.label}
                        </label>
                      </div>
                    )
                  }

                  if (field.type === 'file') {
                    const previewUrl = existingImages[field.name]
                      ? existingImages[field.name]
                      : formData[field.name] instanceof File
                        ? URL.createObjectURL(formData[field.name] as File)
                        : null

                    return (
                      <div
                        key={field.name}
                        className={field.name === 'content' || field.name === 'description' || field.name === 'excerpt' || field.name === 'seo_description' || field.name === 'address' ? 'md:col-span-2' : ''}
                      >
                        <label className="block text-sm font-bold mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        {previewUrl && (
                          <div className="mb-3">
                            <img
                              src={previewUrl}
                              alt={field.label}
                              className="w-40 h-28 object-cover rounded border"
                            />
                            {formData[field.name] instanceof File && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleChange(field.name, null)
                                  if (existingImages[field.name]) {
                                    // Keep existing image reference
                                  }
                                }}
                                className="text-red-500 text-sm mt-1 hover:underline"
                              >
                                حذف تصویر جدید
                              </button>
                            )}
                          </div>
                        )}
                        <input
                          type="file"
                          id={field.name}
                          accept={field.accept || 'image/*'}
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            handleChange(field.name, file)
                          }}
                          className="w-full border rounded-lg px-3 py-2 file:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-dark file:font-bold file:cursor-pointer"
                        />
                        {field.helpText && (
                          <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                        )}
                        {fieldError && (
                          <p className="text-red-500 text-sm mt-1">{fieldError[0]}</p>
                        )}
                      </div>
                    )
                  }

                  const colSpanClass =
                    field.name === 'content' || field.name === 'description' || field.name === 'excerpt' || field.name === 'seo_description' || field.name === 'address'
                      ? 'md:col-span-2'
                      : ''

                  if (field.type === 'textarea') {
                    return (
                      <div key={field.name} className={colSpanClass}>
                        <label className="block text-sm font-bold mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        <textarea
                          value={String(formData[field.name] ?? '')}
                          onChange={(e) => handleChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          required={field.required}
                          rows={field.name === 'content' ? 12 : 4}
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        {fieldError && (
                          <p className="text-red-500 text-sm mt-1">{fieldError[0]}</p>
                        )}
                      </div>
                    )
                  }

                  if (field.type === 'select') {
                    return (
                      <div key={field.name}>
                        <label className="block text-sm font-bold mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        <select
                          value={String(formData[field.name] ?? '')}
                          onChange={(e) => handleChange(field.name, e.target.value)}
                          required={field.required}
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <option value="">انتخاب کنید</option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {fieldError && (
                          <p className="text-red-500 text-sm mt-1">{fieldError[0]}</p>
                        )}
                      </div>
                    )
                  }

                  return (
                    <div key={field.name}>
                      <label className="block text-sm font-bold mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 mr-1">*</span>}
                      </label>
                      <input
                        type={field.type}
                        value={String(formData[field.name] ?? '')}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      {fieldError && (
                        <p className="text-red-500 text-sm mt-1">{fieldError[0]}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Link
            href={backUrl}
            className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-bold"
          >
            انصراف
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-accent text-dark font-bold hover:bg-accent-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'در حال ذخیره...' : isEdit ? 'بروزرسانی' : 'ایجاد'}
          </button>
        </div>
      </form>
    </div>
  )
}
