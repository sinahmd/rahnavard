'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormField, FormFieldValue, FormValues } from '@/types/admin-form'

/**
 * Shape thrown by `lib/api/http.ts` for non-2xx responses. The hook must
 * NOT import `lib/api` (form state ≠ API transport), so it recognizes the
 * error structurally: anything carrying `fieldErrors` maps onto fields;
 * anything else with a string `message` is surfaced as-is; non-Error throws
 * fall back to the generic connection message below.
 */
interface ServerFormError {
  message?: string
  fieldErrors?: Record<string, string>
}

function isServerFormError(err: unknown): err is ServerFormError {
  return (
    typeof err === 'object' &&
    err !== null &&
    ('fieldErrors' in err || typeof (err as { message?: unknown }).message === 'string')
  )
}

interface UseAdminFormOptions<TEntity extends object> {
  fields: FormField[]
  /** Edit-mode loader (pages pass the endpoint fn); called with `loadId`. */
  load?: (id: string) => Promise<TEntity>
  /**
   * Record identity that keys the load effect. The effect must NOT key on
   * the `load` function: pages create it inline, so its identity changes
   * every render and the effect would refetch in a loop, reverting edits.
   */
  loadId?: string
  /** Persist typed values; pages pass the endpoint fn (serialization lives there). */
  onSubmit: (values: FormValues) => Promise<unknown>
}

export interface UseAdminFormResult {
  values: FormValues
  fieldErrors: Record<string, string>
  touched: Record<string, boolean>
  /** Existing file URLs / names / gallery URLs loaded from the entity (edit). */
  existingImages: Record<string, string>
  existingFileNames: Record<string, string>
  existingGalleryUrls: Record<string, string[]>
  loading: boolean
  saving: boolean
  error: string | null
  setValue: (name: string, value: FormFieldValue) => void
  blurField: (name: string) => void
  /** Client validation; false when field errors exist. */
  validateAll: () => boolean
  /** Validate + call onSubmit; resolves true only when persistence succeeded. */
  submit: () => Promise<boolean>
}

// ---------------------------------------------------------------------------
// Default validators for common field types (same rules as the legacy form).
// ---------------------------------------------------------------------------

function getDefaultValidator(
  field: FormField
): ((value: string | boolean | File | null) => string | null) | null {
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
      // File validation is handled by the upload components.
      return () => null
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

/**
 * Wire record → form values for one field (schema-driven, entity-agnostic).
 * The loaded entity is treated as an unvalidated record; the field config
 * decides how each value maps into form state.
 */
function seedFieldValue(
  field: FormField,
  data: Record<string, unknown>,
  out: { values: FormValues; images: Record<string, string>; fileNames: Record<string, string>; galleryUrls: Record<string, string[]> }
): void {
  if (field.type === 'checkbox') {
    out.values[field.name] = !!data[field.name]
  } else if (field.type === 'gallery') {
    out.galleryUrls[field.name] = Array.isArray(data[field.name])
      ? (data[field.name] as string[])
      : []
    out.values[field.name] = []
  } else if (field.type === 'file') {
    if (data[field.name]) {
      const url = String(data[field.name])
      out.images[field.name] = url
      const parts = url.split('/')
      out.fileNames[field.name] = parts[parts.length - 1]
    }
    out.values[field.name] = null
  } else if (field.type === 'datetime-local' && data[field.name]) {
    const dt = new Date(String(data[field.name]))
    out.values[field.name] = isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 16)
  } else {
    out.values[field.name] = (data[field.name] as FormFieldValue) ?? ''
  }
}

/**
 * Form state machine for the admin entity forms. Pure React state + client
 * validation; it knows nothing about HTTP or FormData:
 *
 * - `load` (edit mode) is injected by the page and called on mount.
 * - `onSubmit(values)` is injected by the page; submit() runs client
 *   validation, then calls it and maps any thrown server field errors back
 *   onto the fields.
 */
export function useAdminForm<TEntity extends object>({
  fields,
  load,
  loadId,
  onSubmit,
}: UseAdminFormOptions<TEntity>): UseAdminFormResult {
  const [values, setValues] = useState<FormValues>(() => {
    const initial: FormValues = {}
    fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        initial[field.name] = field.defaultValue
      } else if (field.type === 'checkbox') {
        initial[field.name] = false
      } else if (field.type === 'gallery') {
        initial[field.name] = []
      }
    })
    return initial
  })
  const [existingImages, setExistingImages] = useState<Record<string, string>>({})
  const [existingFileNames, setExistingFileNames] = useState<Record<string, string>>({})
  const [existingGalleryUrls, setExistingGalleryUrls] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(!!loadId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // The loader is read through a ref so the effect can key on the record
  // identity (loadId) alone; a fresh inline `load` from the page never
  // re-triggers the fetch.
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    if (!loadId || !loadRef.current) return
    let cancelled = false
    const run = async () => {
      try {
        const data = (await loadRef.current!(loadId)) as unknown as Record<string, unknown>
        if (cancelled) return
        const out: {
          values: FormValues
          images: Record<string, string>
          fileNames: Record<string, string>
          galleryUrls: Record<string, string[]>
        } = { values: {}, images: {}, fileNames: {}, galleryUrls: {} }
        fields.forEach((field) => seedFieldValue(field, data, out))
        setValues(out.values)
        setExistingImages(out.images)
        setExistingFileNames(out.fileNames)
        setExistingGalleryUrls(out.galleryUrls)
      } catch {
        if (!cancelled) setError('خطا در بارگذاری اطلاعات')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [loadId]) // eslint-disable-line react-hooks/exhaustive-deps -- fields is a module-level schema; load goes through loadRef

  const validateField = useCallback(
    (name: string, value: FormFieldValue): string | null => {
      const field = fields.find((f) => f.name === name)
      if (!field) return null
      if (field.validate) {
        const customError = field.validate(value)
        if (customError) return customError
      }
      const validator = getDefaultValidator(field)
      if (validator) {
        return validator(Array.isArray(value) ? null : (value as string | boolean | File | null))
      }
      return null
    },
    [fields]
  )

  const validateAll = useCallback((): boolean => {
    const errors: Record<string, string> = {}
    let isValid = true

    fields.forEach((field) => {
      if (field.type === 'gallery') return
      // Edit mode: an existing file satisfies a required file field.
      if (field.type === 'file' && !values[field.name] && existingImages[field.name]) return
      if (field.type === 'file' && !field.required && !values[field.name]) return
      const fieldValue = values[field.name]
      const error = validateField(field.name, fieldValue)
      if (error) {
        errors[field.name] = error
        isValid = false
      }
    })

    setFieldErrors(errors)
    return isValid
  }, [fields, values, existingImages, validateField])

  const setValue = useCallback((name: string, value: FormFieldValue) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setTouched((prev) => ({ ...prev, [name]: true }))
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const blurField = useCallback(
    (name: string) => {
      setTouched((prev) => ({ ...prev, [name]: true }))
      const field = fields.find((f) => f.name === name)
      if (!field || field.type === 'gallery') return
      const fieldValue = values[name]
      const error = validateField(name, fieldValue)
      if (error) {
        setFieldErrors((prev) => ({ ...prev, [name]: error }))
      }
    },
    [fields, values, validateField]
  )

  const submit = useCallback(async (): Promise<boolean> => {
    // Mark all fields as touched, then validate everything.
    const allTouched: Record<string, boolean> = {}
    fields.forEach((f) => (allTouched[f.name] = true))
    setTouched(allTouched)

    if (!validateAll()) {
      setError('لطفاً خطاهای فرم را برطرف کنید.')
      return false
    }

    setSaving(true)
    setError(null)
    try {
      await onSubmit(values)
      return true
    } catch (err) {
      if (isServerFormError(err)) {
        const serverFieldErrors = err.fieldErrors
        if (serverFieldErrors && Object.keys(serverFieldErrors).length > 0) {
          setFieldErrors(serverFieldErrors)
          setError('لطفاً خطاهای فرم را برطرف کنید.')
        } else {
          setError(err.message || 'خطا در ذخیره‌سازی')
        }
      } else {
        setError('خطا در اتصال به سرور')
      }
      return false
    } finally {
      setSaving(false)
    }
  }, [fields, values, validateAll, onSubmit])

  return {
    values,
    fieldErrors,
    touched,
    existingImages,
    existingFileNames,
    existingGalleryUrls,
    loading,
    saving,
    error,
    setValue,
    blurField,
    validateAll,
    submit,
  }
}
