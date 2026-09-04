'use client'

import type { FormField } from '@/types/admin-form'
import AdminForm from '@/components/admin/form/AdminForm'
import { saveFeature } from '@/lib/api/features'

const featureFields: FormField[] = [
  { name: 'title', label: 'عنوان', type: 'text', required: true, placeholder: 'مثال: ضمانت رسمی', section: 'اطلاعات ویژگی' },
  { name: 'description', label: 'توضیحات', type: 'text', required: true, placeholder: 'توضیح کوتاه ویژگی', section: 'اطلاعات ویژگی' },
  { name: 'icon', label: 'آیکون', type: 'file', accept: 'image/*', section: 'تصویر', helpText: 'آیکون مربعی یا دایره‌ای توصیه می‌شود.' },
  { name: 'is_active', label: 'فعال', type: 'checkbox', section: 'وضعیت و نمایش' },
  { name: 'display_order', label: 'ترتیب نمایش', type: 'number', placeholder: '0', section: 'وضعیت و نمایش' },
]

export default function NewFeaturePage() {
  return (
    <AdminForm
      entityNamePersian="ویژگی"
      fields={featureFields}
      backUrl="/admin/features"
      save={(values) => saveFeature(values)}
    />
  )
}
