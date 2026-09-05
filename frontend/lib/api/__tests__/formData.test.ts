/**
 * Wire serialization contract for admin form values (workstream F). These
 * tests pin the multipart conventions the backend depends on: files under
 * their field name, galleries as `<field>_0..N`, booleans as 'true'/'false',
 * and null/undefined omitted so edit forms keep existing files.
 */

import { formValuesToFormData } from '../formData'
import type { FormValues } from '@/types/admin-form'

const file = (name: string) => new File([name], name, { type: 'image/jpeg' })

describe('formValuesToFormData', () => {
  it('appends a File under its own field name', () => {
    const main = file('main.jpg')
    const fd = formValuesToFormData({ brand: 'Toyota', main_image: main })
    expect(fd.get('brand')).toBe('Toyota')
    expect(fd.get('main_image')).toBe(main)
  })

  it('expands File[] values into <field>_0..N keys (gallery convention)', () => {
    const a = file('a.jpg')
    const b = file('b.jpg')
    const fd = formValuesToFormData({ gallery: [a, b] })
    expect(fd.get('gallery_0')).toBe(a)
    expect(fd.get('gallery_1')).toBe(b)
    expect(fd.has('gallery')).toBe(false)
    // A non-File array entry is skipped rather than stringified.
    const mixed = formValuesToFormData({ gallery: [a, 'x' as unknown as File] })
    expect(mixed.get('gallery_0')).toBe(a)
    expect(mixed.has('gallery_1')).toBe(false)
  })

  it('serializes booleans as the strings true/false', () => {
    const fd = formValuesToFormData({ is_active: true, is_featured: false })
    expect(fd.get('is_active')).toBe('true')
    expect(fd.get('is_featured')).toBe('false')
  })

  it('skips null and undefined (edit forms keep existing files)', () => {
    // `undefined` can reach the serializer from sparse form state even
    // though the FormValues union does not name it.
    const values: FormValues = { main_image: null, brand: 'x' }
    ;(values as Record<string, unknown>).og_image = undefined
    const fd = formValuesToFormData(values)
    expect(fd.has('main_image')).toBe(false)
    expect(fd.has('og_image')).toBe(false)
    expect(fd.get('brand')).toBe('x')
  })

  it('appends empty strings verbatim', () => {
    const fd = formValuesToFormData({ description: '', slug: 'toyota-rav4' })
    expect(fd.get('description')).toBe('')
    expect(fd.get('slug')).toBe('toyota-rav4')
  })
})
