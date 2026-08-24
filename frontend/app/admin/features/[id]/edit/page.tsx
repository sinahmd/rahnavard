'use client'

import { useParams } from 'next/navigation'
import AdminForm, { FormField } from '@/components/admin/AdminForm'

const featureFields: FormField[] = [
  { name: 'title', label: 'عنوان', type: 'text', required: true, placeholder: 'مثال: ضمانت رسمی', section: 'اطلاعات ویژگی' },
  { name: 'description', label: 'توضیحات', type: 'text', required: true, placeholder: 'توضیح کوتاه ویژگی', section: 'اطلاعات ویژگی' },
  { name: 'icon', label: 'آیکون', type: 'file', accept: 'image/*', section: 'تصویر', helpText: 'خالی بگذارید تا تصویر قبلی حفظ شود.' },
  { name: 'is_active', label: 'فعال', type: 'checkbox', section: 'وضعیت و نمایش' },
  { name: 'display_order', label: 'ترتیب نمایش', type: 'number', placeholder: '0', section: 'وضعیت و نمایش' },
]

export default function EditFeaturePage() {
  const params = useParams()
  const id = params.id as string

  return (
    <AdminForm
      entityName="feature"
      entityNamePersian="ویژگی"
      apiBase="/api/v1/admin/features/"
      id={id}
      fields={featureFields}
      backUrl="/admin/features"
    />
  )
}
