'use client'

import { useParams } from 'next/navigation'
import AdminForm, { FormField } from '@/components/admin/AdminForm'

const branchFields: FormField[] = [
  // Section: اطلاعات شعبه
  { name: 'name', label: 'نام شعبه', type: 'text', required: true, placeholder: 'مثال: شعبه مرکزی ساری', section: 'اطلاعات شعبه' },
  { name: 'address', label: 'آدرس', type: 'textarea', required: true, section: 'اطلاعات شعبه' },
  { name: 'phone', label: 'تلفن', type: 'text', required: true, section: 'اطلاعات شعبه' },
  { name: 'map_url', label: 'لینک نقشه', type: 'url', required: true, section: 'اطلاعات شعبه' },
  { name: 'map_image', label: 'تصویر نقشه', type: 'file', accept: 'image/*', section: 'اطلاعات شعبه', helpText: 'خالی بگذارید تا تصویر قبلی حفظ شود.' },
  { name: 'latitude', label: 'عرض جغرافیایی', type: 'number', section: 'اطلاعات شعبه' },
  { name: 'longitude', label: 'طول جغرافیایی', type: 'number', section: 'اطلاعات شعبه' },

  // Section: وضعیت و نمایش
  { name: 'is_active', label: 'فعال', type: 'checkbox', section: 'وضعیت و نمایش' },
  { name: 'display_order', label: 'ترتیب نمایش', type: 'number', section: 'وضعیت و نمایش' },
]

export default function EditBranchPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <AdminForm
      entityName="branch"
      entityNamePersian="شعبه"
      apiBase="/api/v1/admin/branches/"
      id={id}
      fields={branchFields}
      backUrl="/admin/branches"
    />
  )
}
