'use client'

import type { FormField, FormFieldType, FormFieldValue } from '@/types/admin-form'
import ImageUpload from '../ImageUpload'
import FileUpload from '../FileUpload'
import GalleryUpload from '../GalleryUpload'

/**
 * Field renderers for the admin entity forms (workstream F). Each field is a
 * config object (types/admin-form.ts); this module owns *rendering* only —
 * labels, help text, errors, and the right control per type. Form state and
 * validation live in useAdminForm; wire serialization lives in lib/api.
 */

/**
 * Span helper — replicates the legacy AdminForm col-span behavior exactly:
 * gallery/custom always full width; long textareas, file rows, and single-line
 * inputs for the named content fields full width; selects/checkboxes stay in
 * one grid column.
 */
const WIDE_NAMES = new Set([
  'content',
  'description',
  'excerpt',
  'seo_description',
  'address',
])
const WIDE_FILE_NAMES = new Set([
  'content',
  'description',
  'excerpt',
  'seo_description',
  'address',
  'technical_description',
])

export function fieldSpanClass(field: { name: string; type: string }): string {
  if (field.type === 'gallery' || field.type === 'custom') return 'md:col-span-2'
  if (field.type === 'file' && WIDE_FILE_NAMES.has(field.name)) return 'md:col-span-2'
  if (
    (field.type === 'textarea' ||
      field.type === 'text' ||
      field.type === 'number' ||
      field.type === 'url' ||
      field.type === 'datetime-local') &&
    WIDE_NAMES.has(field.name)
  ) {
    return 'md:col-span-2'
  }
  return ''
}

export interface FieldControlProps {
  name: string
  label: string
  type: FormFieldType
  required?: boolean
  placeholder?: string
  accept?: string
  helpText?: string
  /** Raw form value for the field. */
  value: FormFieldValue
  error?: string
  onChange: (value: FormFieldValue) => void
  onBlur: () => void
  existingImage?: string
  existingFileName?: string
  existingGalleryUrls?: string[]
  renderField?: (value: string, onChange: (val: string) => void) => React.ReactNode
  options?: { value: string; label: string }[]
}

/** Pick the props FieldControl needs from a FormField config. */
export function fieldToControlProps(field: FormField): Omit<
  FieldControlProps,
  'value' | 'error' | 'onChange' | 'onBlur' | 'existingImage' | 'existingFileName' | 'existingGalleryUrls'
> {
  return {
    name: field.name,
    label: field.label,
    type: field.type,
    required: field.required,
    placeholder: field.placeholder,
    accept: field.accept,
    helpText: field.helpText,
    renderField: field.renderField,
    options: field.options,
  }
}

function ErrorText({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-red-500 text-sm mt-1">{error}</p>
}

function HelpText({ helpText }: { helpText?: string }) {
  if (!helpText) return null
  return <p className="text-xs text-gray-500 mt-1">{helpText}</p>
}

function Label({
  label,
  required,
  htmlFor,
}: {
  label: string
  required?: boolean
  htmlFor?: string
}) {
  return (
    <label className="block text-sm font-bold mb-2" htmlFor={htmlFor}>
      {label}
      {required && <span className="text-red-500 mr-1">*</span>}
    </label>
  )
}

const wideErrorClass = (error?: string) =>
  error ? 'border-red-500 focus:ring-red-100' : ''

/**
 * Renders the control + label + help/error for one configured field.
 * The wrapper <div> carries the grid span decided by fieldSpanClass().
 */
export default function FieldControl({
  name,
  label,
  required,
  placeholder,
  accept,
  helpText,
  type,
  value,
  error,
  onChange,
  onBlur,
  existingImage,
  existingFileName,
  existingGalleryUrls,
  renderField,
  options,
}: FieldControlProps) {
  const control = () => {
    if (type === 'checkbox') {
      return (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id={name}
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300"
          />
          <label htmlFor={name} className="font-medium">
            {label}
          </label>
        </div>
      )
    }

    if (type === 'file') {
      const isImageField = !accept || accept.includes('image')
      return isImageField ? (
        <ImageUpload
          name={name}
          label={label}
          value={value instanceof File ? value : null}
          onChange={(file) => onChange(file)}
          existingUrl={existingImage}
          required={required}
          helpText={helpText}
          error={error}
        />
      ) : (
        <FileUpload
          name={name}
          label={label}
          value={value instanceof File ? value : null}
          onChange={(file) => onChange(file)}
          existingUrl={existingImage}
          existingFileName={existingFileName}
          required={required}
          helpText={helpText}
          error={error}
          accept={accept}
        />
      )
    }

    if (type === 'gallery') {
      return (
        <GalleryUpload
          label={label}
          name={name}
          value={Array.isArray(value) ? value : []}
          onChange={(files) => onChange(files)}
          existingUrls={existingGalleryUrls || []}
          required={required}
          helpText={helpText}
          error={error}
          accept={accept}
        />
      )
    }

    if (type === 'custom' && renderField) {
      return (
        <>
          <Label label={label} required={required} />
          {renderField(String(value ?? ''), (val) => onChange(val))}
          <HelpText helpText={helpText} />
          <ErrorText error={error} />
        </>
      )
    }

    if (type === 'textarea') {
      return (
        <>
          <Label label={label} required={required} htmlFor={name} />
          <textarea
            id={name}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            rows={name === 'content' ? 12 : 4}
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${wideErrorClass(error)}`}
          />
          <HelpText helpText={helpText} />
          <ErrorText error={error} />
        </>
      )
    }

    if (type === 'select') {
      return (
        <>
          <Label label={label} required={required} htmlFor={name} />
          <select
            id={name}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            required={required}
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${wideErrorClass(error)}`}
          >
            <option value="">انتخاب کنید</option>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <HelpText helpText={helpText} />
          <ErrorText error={error} />
        </>
      )
    }

    // text / number / url / datetime-local
    return (
      <>
        <Label label={label} required={required} htmlFor={name} />
        <input
          id={name}
          type={type}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${wideErrorClass(error)}`}
        />
        <HelpText helpText={helpText} />
        <ErrorText error={error} />
      </>
    )
  }

  return <div className={fieldSpanClass({ name, type })}>{control()}</div>
}
