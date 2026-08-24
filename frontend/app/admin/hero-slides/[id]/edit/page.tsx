'use client'

import { useParams } from 'next/navigation'
import AdminForm, { FormField } from '@/components/admin/AdminForm'

const slideFields: FormField[] = [
  { name: 'title', label: 'عنوان', type: 'text', placeholder: 'عنوان اختیاری اسلاید', section: 'اطلاعات اسلاید' },
  { name: 'alt_text', label: 'متن جایگزین', type: 'text', required: true, placeholder: 'توضیح تصویر برای دسترسی‌پذیری', section: 'اطلاعات اسلاید' },
  { name: 'image', label: 'تصویر اسلاید', type: 'file', accept: 'image/*', section: 'تصویر', helpText: 'خالی بگذارید تا تصویر قبلی حفظ شود. ابعاد پیشنهادی: 1540×860.' },
  { name: 'is_active', label: 'فعال', type: 'checkbox', section: 'وضعیت و نمایش' },
  { name: 'display_order', label: 'ترتیب نمایش', type: 'number', placeholder: '0', section: 'وضعیت و نمایش' },
]

export default function EditHeroSlidePage() {
  const params = useParams()
  const id = params.id as string

  return (
    <AdminForm
      entityName="hero-slide"
      entityNamePersian="اسلاید هیرو"
      apiBase="/api/v1/admin/hero-slides/"
      id={id}
      fields={slideFields}
      backUrl="/admin/hero-slides"
    />
  )
}
