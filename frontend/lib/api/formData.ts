/**
 * Wire serialization for admin entity forms — the single home of the
 * FormData conventions (workstream F):
 *
 * - `File` values are appended under their field name (main_image, ...).
 * - `File[]` gallery values become `<field>_0..N` entries — the car gallery
 *   field is named `gallery`, so its files arrive as `gallery_0..N`.
 * - `boolean` checkbox values become `'true'` / `'false'` strings.
 * - `null`/`undefined` are skipped (edit forms keep existing files).
 * - Everything else is stringified.
 *
 * Endpoint modules (`lib/api/{entity}.ts`) own their save fns and delegate
 * here; form components never build FormData.
 */

import type { FormValues } from '@/types/admin-form'

export function formValuesToFormData(values: FormValues): FormData {
  const formData = new FormData()

  Object.entries(values).forEach(([name, value]) => {
    if (value instanceof File) {
      formData.append(name, value)
    } else if (Array.isArray(value)) {
      value.forEach((file, idx) => {
        if (file instanceof File) formData.append(`${name}_${idx}`, file)
      })
    } else if (typeof value === 'boolean') {
      formData.append(name, value ? 'true' : 'false')
    } else if (value !== null && value !== undefined) {
      formData.append(name, String(value))
    }
  })

  return formData
}

/** Entity-named alias used by the car module (gallery field is `gallery`). */
export const carFormData = formValuesToFormData

