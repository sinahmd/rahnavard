'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/authFetch'
import ImageUpload from './ImageUpload'

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
  defaultValue?: string | boolean
  validate?: (value: string | boolean | File | null) => string | null
}

interface AdminFormProps {
  entityName: string
  entityNamePersian: string
  apiBase: string
  id?: string
  fields: FormField[]
  backUrl: string
}

// Default validators for common field types
function getDefaultValidator(field: FormField): ((value: string | boolean | File | null) => string | null) | null {
  if (!field.required) return null

  switch (field.type) {
    case 'text':
    case 'textarea':
      return (value) => {
        if (!value || (typeof value === 'string' && !value.trim())) {
          return `${field.label} الزامی است.`
        }
        return null
      }
    case 'number':
      return (value) => {
        if (value === null || value === undefined || value === '') {
          return `${field.label} الزامی است.`
        }
        if (typeof value === 'string' && isNaN(Number(value))) {
          return `${field.label} باید عدد باشد.`
        }
        return null
      }
    case 'select':
      return (value) => {
        if (!value || (typeof value === 'string' && !value.trim())) {
          return `${field.label} را انتخاب کنید.`
        }
        return null
      }
    case 'file':
      return (value) => {
        // File validation is handled by ImageUpload component
        return null
      }
    case 'url':
      return (value) => {
        if (!value || (typeof value === 'string' && !value.trim())) {
          return `${field.label} الزامی است.`
        }
        if (typeof value === 'string' && value.trim()) {
          try {
            new URL(value.trim())
          } catch {
            return `${field.label} معتبر نیست.`
          }
        }
        return null
      }
    default:
      return null
  }
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

  const [formData, setFormData] = useState<Record<string, string | boolean | File | null>>(() => {
    // Initialize with default values for new items
    const initial: Record<string, string | boolean | File | null> = {}
    if (!id) {
      fields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          initial[field.name] = field.defaultValue
        } else if (field.type === 'checkbox') {
          initial[field.name] = false
        }
      })
    }
    return initial
  })
  const [existingImages, setExistingImages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (isEdit) {
      fetchItem()
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchItem = async () => {
    try {
      const response = await authFetch(`${apiBase}${id}/`)
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

  // Validate a single field
  const validateField = useCallback(
    (name: string, value: string | boolean | File | null): string | null => {
      const field = fields.find((f) => f.name === name)
      if (!field) return null

      // Custom validator takes priority
      if (field.validate) {
        const customError = field.validate(value)
        if (customError) return customError
      }

      // Default required/type validation
      const defaultValidator = getDefaultValidator(field)
      if (defaultValidator) {
        return defaultValidator(value)
      }

      return null
    },
    [fields]
  )

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const errors: Record<string, string> = {}
    let isValid = true

    fields.forEach((field) => {
      // For file fields on edit: skip validation if no new file and existing image exists
      if (field.type === 'file' && !formData[field.name] && existingImages[field.name]) {
        return
      }

      // For file fields on create: skip if not required
      if (field.type === 'file' && !field.required && !formData[field.name]) {
        return
      }

      const error = validateField(field.name, formData[field.name])
      if (error) {
        errors[field.name] = error
        isValid = false
      }
    })

    setFieldErrors(errors)
    return isValid
  }, [fields, formData, existingImages, validateField])

  const handleChange = (name: string, value: string | boolean | File | null) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    setTouched((prev) => ({ ...prev, [name]: true }))

    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }))

    // Validate on blur
    const error = validateField(name, formData[name])
    if (error) {
      setFieldErrors((prev) => ({ ...prev, [name]: error }))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {}
    fields.forEach((f) => (allTouched[f.name] = true))
    setTouched(allTouched)

    // Validate all
    if (!validateAll()) {
      setError('لطفاً خطاهای فرم را برطرف کنید.')
      return
    }

    setSaving(true)
    setError(null)

    const submitData = new FormData()

    fields.forEach((field) => {
      const value = formData[field.name]

      if (field.type === 'file') {
        if (value instanceof File) {
          submitData.append(field.name, value)
        }
        // Don't append null file fields on edit (keeps existing)
      } else if (field.type === 'checkbox') {
        submitData.append(field.name, value ? 'true' : 'false')
      } else if (value !== null && value !== undefined) {
        submitData.append(field.name, String(value))
      }
    })

    try {
      const url = isEdit ? `${apiBase}${id}/` : apiBase
      const method = isEdit ? 'PATCH' : 'POST'

      const response = await authFetch(url, {
        method,
        body: submitData,
      })

      if (response.ok) {
        router.push(backUrl)
        router.refresh()
      } else {
        const errorData = await response.json().catch(() => null)
        if (errorData && typeof errorData === 'object') {
          // Handle field-level errors from backend
          const errors: Record<string, string> = {}
          Object.entries(errorData).forEach(([key, val]) => {
            if (Array.isArray(val) && val.length > 0) {
              errors[key] = String(val[0])
            } else if (typeof val === 'string') {
              errors[key] = val
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
                  const fieldError = touched[field.name] ? fieldErrors[field.name] : undefined
                  const hasError = !!fieldError

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
                    return (
                      <div
                        key={field.name}
                        className={
                          field.name === 'content' || field.name === 'description' || field.name === 'excerpt' || field.name === 'seo_description' || field.name === 'address'
                            ? 'md:col-span-2'
                            : ''
                        }
                      >
                        <ImageUpload
                          name={field.name}
                          label={field.label}
                          value={formData[field.name] instanceof File ? formData[field.name] as File : null}
                          onChange={(file) => handleChange(field.name, file)}
                          existingUrl={existingImages[field.name]}
                          required={field.required}
                          helpText={field.helpText}
                          error={fieldError}
                        />
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
                          onBlur={() => handleBlur(field.name)}
                          placeholder={field.placeholder}
                          required={field.required}
                          rows={field.name === 'content' ? 12 : 4}
                          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${hasError ? 'border-red-500' : ''}`}
                        />
                        {field.helpText && (
                          <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                        )}
                        {fieldError && (
                          <p className="text-red-500 text-sm mt-1">{fieldError}</p>
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
                          onBlur={() => handleBlur(field.name)}
                          required={field.required}
                          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${hasError ? 'border-red-500' : ''}`}
                        >
                          <option value="">انتخاب کنید</option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {field.helpText && (
                          <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                        )}
                        {fieldError && (
                          <p className="text-red-500 text-sm mt-1">{fieldError}</p>
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
                        onBlur={() => handleBlur(field.name)}
                        placeholder={field.placeholder}
                        required={field.required}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${hasError ? 'border-red-500' : ''}`}
                      />
                      {field.helpText && (
                        <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                      )}
                      {fieldError && (
                        <p className="text-red-500 text-sm mt-1">{fieldError}</p>
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
            className="px-6 py-3 rounded-lg bg-accent text-dark font-bold hover:bg-accent-dark disabled:opacity-50 transition-colors"
          >
            {saving ? 'در حال ذخیره...' : isEdit ? 'بروزرسانی' : 'ایجاد'}
          </button>
        </div>
      </form>
    </div>
  )
}
