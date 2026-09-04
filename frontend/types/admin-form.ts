import type { ReactNode } from 'react'

/**
 * Admin form field configuration contract.
 *
 * Lives in `types/` so pages can type their field configs without importing
 * the `AdminForm` component (see docs/SENIOR_REFACTOR_PLAN.md workstream F).
 */

export type FormFieldValue = string | boolean | File | null | File[]

/** All values of a form, keyed by field name. */
export type FormValues = Record<string, FormFieldValue>

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'file'
  | 'datetime-local'
  | 'url'
  | 'gallery'
  | 'custom'

export interface FormField {
  name: string
  label: string
  type: FormFieldType
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  section?: string
  accept?: string
  helpText?: string
  defaultValue?: string | boolean
  validate?: (value: FormFieldValue) => string | null
  renderField?: (value: string, onChange: (val: string) => void) => ReactNode
}
