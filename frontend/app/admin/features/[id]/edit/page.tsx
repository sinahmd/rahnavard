'use client'

import { useParams } from 'next/navigation'
import type { FormField } from '@/types/admin-form'
import AdminForm from '@/components/admin/AdminForm'
import { getFeature, saveFeature } from '@/lib/api/features'

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
      entityNamePersian="ویژگی"
      id={id}
      fields={featureFields}
      backUrl="/admin/features"
      load={(featureId) => getFeature(Number(featureId))}
      save={(formData) => saveFeature(formData, Number(id))}
    />
  )
}
