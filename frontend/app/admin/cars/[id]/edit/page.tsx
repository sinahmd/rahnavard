'use client'

import { useParams } from 'next/navigation'
import AdminForm, { FormField } from '@/components/admin/AdminForm'

const carFields: FormField[] = [
  // Section: اطلاعات اصلی
  { name: 'brand', label: 'برند', type: 'text', required: true, placeholder: 'مثال: Hyundai', section: 'اطلاعات اصلی' },
  { name: 'model', label: 'مدل', type: 'text', required: true, placeholder: 'مثال: Elantra', section: 'اطلاعات اصلی' },
  { name: 'persian_name', label: 'نام فارسی', type: 'text', required: true, placeholder: 'مثال: هیوندای النترا', section: 'اطلاعات اصلی' },
  { name: 'slug', label: 'اسلاگ', type: 'text', section: 'اطلاعات اصلی' },
  { name: 'year', label: 'سال ساخت', type: 'number', required: true, placeholder: '1403', section: 'اطلاعات اصلی' },
  { name: 'description', label: 'توضیحات', type: 'textarea', section: 'اطلاعات اصلی' },

  // Section: مشخصات فنی
  {
    name: 'fuel_type',
    label: 'نوع سوخت',
    type: 'select',
    required: true,
    section: 'مشخصات فنی',
    options: [
      { value: 'gasoline', label: 'بنزینی' },
      { value: 'diesel', label: 'دیزلی' },
      { value: 'hybrid', label: 'هیبریدی' },
      { value: 'electric', label: 'الکتریکی' },
    ],
  },
  {
    name: 'transmission',
    label: 'گیربکس',
    type: 'select',
    required: true,
    section: 'مشخصات فنی',
    options: [
      { value: 'automatic', label: 'اتوماتیک' },
      { value: 'manual', label: 'دستی' },
    ],
  },
  { name: 'engine', label: 'موتور', type: 'text', placeholder: 'مثال: 2.0L 4-Cylinder', section: 'مشخصات فنی' },
  { name: 'price', label: 'قیمت (تومان)', type: 'number', placeholder: 'مثال: 1500000000', section: 'مشخصات فنی' },

  // Section: تصاویر
  { name: 'main_image', label: 'تصویر اصلی', type: 'file', accept: 'image/*', section: 'تصاویر', helpText: 'خالی بگذارید تا تصویر قبلی حفظ شود.' },

  // Section: وضعیت و نمایش
  { name: 'is_active', label: 'فعال', type: 'checkbox', section: 'وضعیت و نمایش' },
  { name: 'is_featured', label: 'ویژه', type: 'checkbox', section: 'وضعیت و نمایش' },
  { name: 'display_order', label: 'ترتیب نمایش', type: 'number', section: 'وضعیت و نمایش' },

  // Section: SEO
  { name: 'seo_title', label: 'عنوان SEO', type: 'text', section: 'SEO', placeholder: 'عنوان صفحه در موتورهای جستجو' },
  { name: 'seo_description', label: 'توضیحات SEO', type: 'textarea', section: 'SEO', placeholder: 'توضیحات صفحه در موتورهای جستجو' },
  { name: 'og_image', label: 'تصویر OG', type: 'file', accept: 'image/*', section: 'SEO', helpText: 'خالی بگذارید تا تصویر قبلی حفظ شود.' },
]

export default function EditCarPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <AdminForm
      entityName="car"
      entityNamePersian="خودرو"
      apiBase="/api/v1/admin/cars/"
      id={id}
      fields={carFields}
      backUrl="/admin/cars"
    />
  )
}
