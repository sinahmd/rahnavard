/**
 * Tests for the field renderers (workstream F). fieldSpanClass is asserted
 * as a matrix because it must replicate the legacy AdminForm layout exactly
 * (the named content fields are full width for single-line inputs too —
 * regressing that shrank the features description to half width).
 * Upload components are stubbed; their own behavior has dedicated tests.
 */

import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import FieldControl, { fieldSpanClass, fieldToControlProps } from '../fields'
import type { FormField } from '@/types/admin-form'

jest.mock('../../ImageUpload', () => {
  return function ImageUpload(props: { name: string }) {
    return <div data-testid="image-upload" data-name={props.name} />
  }
})
jest.mock('../../FileUpload', () => {
  return function FileUpload(props: { name: string }) {
    return <div data-testid="file-upload" data-name={props.name} />
  }
})
jest.mock('../../GalleryUpload', () => {
  return function GalleryUpload(props: { name: string }) {
    return <div data-testid="gallery-upload" data-name={props.name} />
  }
})

describe('fieldSpanClass', () => {
  it.each([
    ['gallery', 'content', 'md:col-span-2'],
    ['custom', 'anything', 'md:col-span-2'],
    ['file', 'content', 'md:col-span-2'],
    ['file', 'technical_description', 'md:col-span-2'],
    ['file', 'icon', ''],
    ['textarea', 'content', 'md:col-span-2'],
    ['textarea', 'title', ''],
    ['text', 'description', 'md:col-span-2'],
    ['text', 'title', ''],
    ['number', 'address', 'md:col-span-2'],
    ['url', 'seo_description', 'md:col-span-2'],
    ['select', 'content', ''],
    ['checkbox', 'description', ''],
  ])('%s named %s → %s', (type, name, expected) => {
    expect(fieldSpanClass({ name, type })).toBe(expected)
  })
})

describe('fieldToControlProps', () => {
  it('forwards the render-relevant config and omits state concerns', () => {
    const renderField = () => null
    const field: FormField = {
      name: 'website',
      label: 'وب‌سایت',
      type: 'url',
      required: true,
      placeholder: 'https://',
      accept: 'image/*',
      helpText: 'کمک',
      section: 'بخش',
      defaultValue: 'x',
      renderField,
      options: [{ value: 'a', label: 'الف' }],
    }
    const props = fieldToControlProps(field)
    expect(props).toEqual({
      name: 'website',
      label: 'وب‌سایت',
      type: 'url',
      required: true,
      placeholder: 'https://',
      accept: 'image/*',
      helpText: 'کمک',
      renderField,
      options: [{ value: 'a', label: 'الف' }],
    })
  })
})

const baseProps = {
  value: '',
  onChange: jest.fn(),
  onBlur: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('FieldControl rendering', () => {
  it('renders a checked/unchecked checkbox that reports booleans', async () => {
    const onChange = jest.fn()
    const { rerender } = render(
      <FieldControl {...baseProps} name="is_active" label="فعال" type="checkbox" value={false} onChange={onChange} />
    )
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(screen.getByText('فعال')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)

    rerender(
      <FieldControl {...baseProps} name="is_active" label="فعال" type="checkbox" value={true} onChange={onChange} />
    )
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('renders select options and reports the chosen value', async () => {
    const onChange = jest.fn()
    render(
      <FieldControl
        {...baseProps}
        name="fuel_type"
        label="سوخت"
        type="select"
        value=""
        onChange={onChange}
        options={[
          { value: 'gasoline', label: 'بنزینی' },
          { value: 'hybrid', label: 'هیبریدی' },
        ]}
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('بنزینی')).toBeInTheDocument()
    expect(screen.getByText('هیبریدی')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'hybrid' } })
    expect(onChange).toHaveBeenCalledWith('hybrid')
  })

  it('renders a tall textarea for content and a short one otherwise', () => {
    const { rerender } = render(
      <FieldControl {...baseProps} name="content" label="محتوا" type="textarea" value="" />
    )
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '12')

    rerender(<FieldControl {...baseProps} name="excerpt" label="خلاصه" type="textarea" value="" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '4')
  })

  it('maps single-line types onto the matching input type attribute', () => {
    const { rerender } = render(
      <FieldControl {...baseProps} name="year" label="سال" type="number" value="" />
    )
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()

    rerender(<FieldControl {...baseProps} name="website" label="وب‌سایت" type="url" value="" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'url')

    rerender(<FieldControl {...baseProps} name="brand" label="برند" type="text" value="" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')
  })

  it('labels are clickable (htmlFor/id linkage) and required fields are marked', () => {
    render(<FieldControl {...baseProps} name="brand" label="برند" type="text" value="" required />)
    expect(screen.getByText('برند')).toBeInTheDocument()
    // The required star is part of the label text, hence the regex match.
    expect(screen.getByLabelText(/برند/)).toHaveAttribute('id', 'brand')
  })

  it('shows help text and the field error', () => {
    render(
      <FieldControl
        {...baseProps}
        name="brand"
        label="برند"
        type="text"
        value=""
        helpText="کمک متن"
        error="برند الزامی است."
      />
    )
    expect(screen.getByText('کمک متن')).toBeInTheDocument()
    expect(screen.getByText('برند الزامی است.')).toBeInTheDocument()
  })

  it('delegates to the custom renderer for custom fields', () => {
    const onChange = jest.fn()
    render(
      <FieldControl
        {...baseProps}
        name="link"
        label="لینک"
        type="custom"
        value="initial"
        onChange={onChange}
        renderField={(value, set) => (
          <button onClick={() => set('next')}>{`ویرایش:${value}`}</button>
        )}
      />
    )
    fireEvent.click(screen.getByText('ویرایش:initial'))
    expect(onChange).toHaveBeenCalledWith('next')
  })

  it('routes file fields by accept: images to ImageUpload, others to FileUpload', () => {
    const { rerender } = render(
      <FieldControl {...baseProps} name="main_image" label="تصویر" type="file" value={null} />
    )
    // No accept given → treated as an image field.
    expect(screen.getByTestId('image-upload')).toHaveAttribute('data-name', 'main_image')

    rerender(
      <FieldControl
        {...baseProps}
        name="catalog_file"
        label="کاتالوگ"
        type="file"
        value={null}
        accept="application/pdf"
      />
    )
    expect(screen.getByTestId('file-upload')).toHaveAttribute('data-name', 'catalog_file')
  })

  it('routes gallery fields to GalleryUpload', () => {
    render(
      <FieldControl {...baseProps} name="gallery" label="گالری" type="gallery" value={[]} />
    )
    expect(screen.getByTestId('gallery-upload')).toHaveAttribute('data-name', 'gallery')
  })
})
