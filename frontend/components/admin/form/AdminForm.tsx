'use client'

import { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { FormField, FormValues } from '@/types/admin-form'
import { useAdminForm } from './useAdminForm'
import FieldControl, { fieldToControlProps } from './fields'

interface AdminFormProps<TEntity extends object> {
  entityNamePersian: string
  /** Present in edit mode; keys the one-time record load. */
  id?: string
  fields: FormField[]
  backUrl: string
  /** Edit-mode loader — resolves the record to seed the form. */
  load?: (id: string) => Promise<TEntity>
  /** Persist typed values (serialization lives in the lib/api endpoint module). */
  save: (values: FormValues) => Promise<TEntity>
}

/**
 * Thin orchestration shell (workstream F). Composes the pure form state
 * machine (useAdminForm) with the field renderers (fields.tsx); the page
 * owns schema + load/save wiring, endpoint modules own FormData transport.
 */
export default function AdminForm<TEntity extends object = Record<string, unknown>>({
  entityNamePersian,
  id,
  fields,
  backUrl,
  load,
  save,
}: AdminFormProps<TEntity>) {
  const router = useRouter()
  const isEdit = !!id

  const {
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
    submit,
  } = useAdminForm<TEntity>({
    fields,
    load,
    loadId: id,
    onSubmit: (formValues) => save(formValues),
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await submit()
    if (ok) {
      router.push(backUrl)
      router.refresh()
    }
  }

  if (loading) {
    return <div className="text-center py-8">در حال بارگذاری...</div>
  }

  // Group fields by section for rendering.
  const sections = fields.reduce<Record<string, FormField[]>>((acc, field) => {
    const section = field.section || 'اطلاعات اصلی'
    if (!acc[section]) acc[section] = []
    acc[section].push(field)
    return acc
  }, {})

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href={backUrl} className="text-gray-600 hover:text-dark transition-colors">
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
          <div key={sectionName} className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">{sectionName}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sectionFields.map((field) => {
                  const fieldError = touched[field.name] ? fieldErrors[field.name] : undefined
                  return (
                    <FieldControl
                      key={field.name}
                      {...fieldToControlProps(field)}
                      value={values[field.name] ?? ''}
                      error={fieldError}
                      onChange={(val) => setValue(field.name, val)}
                      onBlur={() => blurField(field.name)}
                      existingImage={existingImages[field.name]}
                      existingFileName={existingFileNames[field.name]}
                      existingGalleryUrls={existingGalleryUrls[field.name]}
                    />
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
