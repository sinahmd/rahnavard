/**
 * Tests for the transport-free form state machine (workstream F). The hook
 * is exercised through renderHook with injected `load`/`onSubmit` doubles —
 * no HTTP and no DOM controls here (rendering is fields.tsx's concern).
 *
 * The load-once cases pin the fix for the edit-mode refetch loop: the load
 * effect keys on `loadId`, never on the (inline, unstable) `load` identity.
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { ApiRequestError } from '@/lib/api/http'
import type { FormField } from '@/types/admin-form'
import { useAdminForm } from '../useAdminForm'

const fields: FormField[] = [
  { name: 'brand', label: 'برند', type: 'text', required: true },
  { name: 'year', label: 'سال', type: 'number', required: true },
  {
    name: 'fuel_type',
    label: 'سوخت',
    type: 'select',
    required: true,
    options: [{ value: 'gasoline', label: 'بنزینی' }],
  },
  { name: 'website', label: 'وب‌سایت', type: 'url', required: false },
  { name: 'is_active', label: 'فعال', type: 'checkbox' },
  { name: 'gallery', label: 'گالری', type: 'gallery' },
  { name: 'main_image', label: 'تصویر', type: 'file' },
  { name: 'sale_date', label: 'تاریخ', type: 'datetime-local' },
  { name: 'bio', label: 'بیو', type: 'text', defaultValue: 'پیش‌فرض' },
]

const createProps = (overrides: Partial<Parameters<typeof useAdminForm>[0]> = {}) => ({
  fields,
  onSubmit: jest.fn().mockResolvedValue({ id: 1 }),
  ...overrides,
})

describe('seeding from schema (create mode)', () => {
  it('seeds defaultValue, checkbox false, and gallery [] without loading', () => {
    const { result } = renderHook(() => useAdminForm(createProps()))
    expect(result.current.loading).toBe(false)
    expect(result.current.values.bio).toBe('پیش‌فرض')
    expect(result.current.values.is_active).toBe(false)
    expect(result.current.values.gallery).toEqual([])
    expect(result.current.values.brand).toBeUndefined()
  })
})

describe('edit-mode load', () => {
  it('calls load once per loadId and seeds every field kind', async () => {
    const when = '2026-09-05T10:30:00Z'
    const load = jest.fn().mockResolvedValue({
      brand: 'Toyota',
      year: '2024',
      fuel_type: 'gasoline',
      is_active: true,
      gallery: ['/media/cars/a.jpg', '/media/cars/b.jpg'],
      main_image: '/media/cars/main.jpg',
      sale_date: when,
      bio: 'ویرایش',
    })
    const props = createProps({ load, loadId: '7' })
    const { result, rerender } = renderHook((p: typeof props) => useAdminForm(p), {
      initialProps: props,
    })

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith('7')
    expect(result.current.values.brand).toBe('Toyota')
    expect(result.current.values.is_active).toBe(true)
    expect(result.current.values.gallery).toEqual([])
    expect(result.current.existingGalleryUrls.gallery).toEqual([
      '/media/cars/a.jpg',
      '/media/cars/b.jpg',
    ])
    expect(result.current.existingImages.main_image).toBe('/media/cars/main.jpg')
    expect(result.current.existingFileNames.main_image).toBe('main.jpg')
    expect(result.current.values.main_image).toBeNull()
    expect(result.current.values.sale_date).toBe(new Date(when).toISOString().slice(0, 16))

    // Re-renders (e.g. from user edits) must not re-trigger the load…
    act(() => result.current.setValue('brand', 'تویوتا'))
    rerender(props)
    rerender({ ...props, onSubmit: jest.fn() })
    expect(load).toHaveBeenCalledTimes(1)
    // …and the user's edit survives.
    expect(result.current.values.brand).toBe('تویوتا')
  })

  it('re-seeds when loadId changes (record switch)', async () => {
    const load = jest
      .fn()
      .mockResolvedValueOnce({ brand: 'اول' })
      .mockResolvedValueOnce({ brand: 'دوم' })
    const props = createProps({ load, loadId: '1' })
    const { result, rerender } = renderHook((p: typeof props) => useAdminForm(p), {
      initialProps: props,
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.values.brand).toBe('اول')

    rerender({ ...props, loadId: '2' })
    await waitFor(() => expect(result.current.values.brand).toBe('دوم'))
    expect(load).toHaveBeenCalledTimes(2)
    expect(load).toHaveBeenLastCalledWith('2')
  })

  it('seeds an empty string for an invalid datetime instead of throwing', async () => {
    const load = jest.fn().mockResolvedValue({ sale_date: 'not-a-date' })
    const { result } = renderHook(() => useAdminForm(createProps({ load, loadId: '1' })))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.values.sale_date).toBe('')
    expect(result.current.error).toBeNull()
  })

  it('surfaces a load failure and stops loading', async () => {
    const load = jest.fn().mockRejectedValue(new Error('500'))
    const { result } = renderHook(() => useAdminForm(createProps({ load, loadId: '1' })))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('خطا در بارگذاری اطلاعات')
  })
})

describe('validation', () => {
  it('blurField marks touched and reports the required error', () => {
    const { result } = renderHook(() => useAdminForm(createProps()))
    act(() => result.current.blurField('brand'))
    expect(result.current.touched.brand).toBe(true)
    expect(result.current.fieldErrors.brand).toBe('برند الزامی است.')
  })

  it('setValue clears the field error for that field only', () => {
    const { result } = renderHook(() => useAdminForm(createProps()))
    act(() => result.current.blurField('brand'))
    act(() => result.current.setValue('brand', 'تویوتا'))
    expect(result.current.fieldErrors.brand).toBeUndefined()
    expect(result.current.values.brand).toBe('تویوتا')
  })

  it('validateAll enforces required text/number/select rules', () => {
    const { result } = renderHook(() => useAdminForm(createProps()))
    let ok: boolean = true
    act(() => {
      ok = result.current.validateAll()
    })
    expect(ok).toBe(false)
    expect(result.current.fieldErrors.brand).toBe('برند الزامی است.')
    expect(result.current.fieldErrors.year).toBe('سال الزامی است.')
    expect(result.current.fieldErrors.fuel_type).toBe('سوخت را انتخاب کنید.')
    expect(result.current.fieldErrors.website).toBeUndefined()

    // Separate act blocks: validateAll must observe the re-rendered values.
    act(() => result.current.setValue('brand', 'تویوتا'))
    act(() => result.current.setValue('year', '2024'))
    act(() => result.current.setValue('fuel_type', 'gasoline'))
    act(() => {
      ok = result.current.validateAll()
    })
    expect(ok).toBe(true)
  })

  it('rejects non-numeric number fields', () => {
    const { result } = renderHook(() => useAdminForm(createProps()))
    act(() => result.current.setValue('year', 'abc'))
    act(() => {
      result.current.validateAll()
    })
    expect(result.current.fieldErrors.year).toBe('سال باید عدد باشد.')
  })

  it('validates url format for required url fields', () => {
    const urlRequired: FormField[] = [
      { name: 'website', label: 'وب‌سایت', type: 'url', required: true },
    ]
    const { result } = renderHook(() => useAdminForm(createProps({ fields: urlRequired })))
    act(() => result.current.setValue('website', 'not-a-url'))
    act(() => {
      result.current.validateAll()
    })
    expect(result.current.fieldErrors.website).toBe('وب‌سایت معتبر نیست.')

    act(() => result.current.setValue('website', 'https://rahnavard.co'))
    act(() => {
      result.current.validateAll()
    })
    expect(result.current.fieldErrors.website).toBeUndefined()
  })

  it('a required file is satisfied by the existing image on edit', async () => {
    const requiredFileFields: FormField[] = [
      { name: 'main_image', label: 'تصویر', type: 'file', required: true },
    ]
    const load = jest.fn().mockResolvedValue({ main_image: '/media/cars/main.jpg' })
    const { result } = renderHook(() =>
      useAdminForm(createProps({ fields: requiredFileFields, load, loadId: '1' }))
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    let ok = false
    act(() => {
      ok = result.current.validateAll()
    })
    expect(ok).toBe(true)
    expect(result.current.fieldErrors.main_image).toBeUndefined()
  })

  it('skips gallery fields entirely', () => {
    const galleryOnly: FormField[] = [{ name: 'gallery', label: 'گالری', type: 'gallery' }]
    const { result } = renderHook(() => useAdminForm(createProps({ fields: galleryOnly })))
    let ok = false
    act(() => {
      ok = result.current.validateAll()
    })
    expect(ok).toBe(true)
  })
})

describe('submit', () => {
  it('runs client validation first and does not call onSubmit when invalid', async () => {
    const onSubmit = jest.fn()
    const { result } = renderHook(() => useAdminForm(createProps({ onSubmit })))
    let ok: boolean = true
    await act(async () => {
      ok = await result.current.submit()
    })
    expect(ok).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(result.current.error).toBe('لطفاً خطاهای فرم را برطرف کنید.')
    // All fields were marked touched so the errors are visible.
    expect(result.current.touched.brand).toBe(true)
  })

  it('calls onSubmit with the current values on success', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ id: 9 })
    const { result } = renderHook(() => useAdminForm(createProps({ onSubmit })))
    act(() => {
      result.current.setValue('brand', 'تویوتا')
      result.current.setValue('year', '2024')
      result.current.setValue('fuel_type', 'gasoline')
    })
    let ok = false
    await act(async () => {
      ok = await result.current.submit()
    })
    expect(ok).toBe(true)
    expect(result.current.error).toBeNull()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ brand: 'تویوتا', fuel_type: 'gasoline' })
    )
  })

  it('maps server fieldErrors onto the fields', async () => {
    const onSubmit = jest.fn().mockRejectedValue(
      new ApiRequestError('Validation failed', 400, { slug: 'این اسلاگ قبلاً استفاده شده است.' })
    )
    const { result } = renderHook(() => useAdminForm(createProps({ onSubmit })))
    act(() => {
      result.current.setValue('brand', 'x')
      result.current.setValue('year', '1')
      result.current.setValue('fuel_type', 'gasoline')
    })
    let ok = true
    await act(async () => {
      ok = await result.current.submit()
    })
    expect(ok).toBe(false)
    expect(result.current.fieldErrors.slug).toBe('این اسلاگ قبلاً استفاده شده است.')
    expect(result.current.error).toBe('لطفاً خطاهای فرم را برطرف کنید.')
  })

  it('surfaces a server message when there are no field errors', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new ApiRequestError('خطای سرور', 500))
    const { result } = renderHook(() => useAdminForm(createProps({ onSubmit })))
    act(() => {
      result.current.setValue('brand', 'x')
      result.current.setValue('year', '1')
      result.current.setValue('fuel_type', 'gasoline')
    })
    let ok = true
    await act(async () => {
      ok = await result.current.submit()
    })
    expect(ok).toBe(false)
    expect(result.current.error).toBe('خطای سرور')
  })

  it('falls back to the connection message for non-server throws', async () => {
    const onSubmit = jest.fn().mockRejectedValue('boom')
    const { result } = renderHook(() => useAdminForm(createProps({ onSubmit })))
    act(() => {
      result.current.setValue('brand', 'x')
      result.current.setValue('year', '1')
      result.current.setValue('fuel_type', 'gasoline')
    })
    let ok = true
    await act(async () => {
      ok = await result.current.submit()
    })
    expect(ok).toBe(false)
    expect(result.current.error).toBe('خطا در اتصال به سرور')
  })

  it('toggles saving while the request is in flight', async () => {
    let resolveSave: (v: unknown) => void = () => {}
    const onSubmit = jest.fn().mockImplementation(() => new Promise((r) => (resolveSave = r)))
    const { result } = renderHook(() => useAdminForm(createProps({ onSubmit })))
    act(() => {
      result.current.setValue('brand', 'x')
      result.current.setValue('year', '1')
      result.current.setValue('fuel_type', 'gasoline')
    })
    let ok = false
    await act(async () => {
      const pending = result.current.submit()
      resolveSave({ id: 1 })
      ok = await pending
    })
    expect(ok).toBe(true)
    expect(result.current.saving).toBe(false)
  })
})
