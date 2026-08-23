'use client'

import AdminForm, { FormField } from '@/components/admin/AdminForm'

const branchFields: FormField[] = [
  // Section: اطلاعات شعبه
  { name: 'name', label: 'نام شعبه', type: 'text', required: true, placeholder: 'مثال: شعبه مرکزی ساری', section: 'اطلاعات شعبه' },
  { name: 'address', label: 'آدرس', type: 'textarea', required: true, section: 'اطلاعات شعبه' },
  { name: 'phone', label: 'تلفن', type: 'text', required: true, placeholder: '09112100800', section: 'اطلاعات شعبه' },
  { name: 'map_url', label: 'لینک نقشه', type: 'url', required: true, placeholder: 'https://neshan.ir/...', section: 'اطلاعات شعبه' },
  { name: 'map_image', label: 'تصویر نقشه', type: 'file', required: true, accept: 'image/*', section: 'اطلاعات شعبه', helpText: 'اسکرین‌شات نقشه از سرویس نقشه.' },
  { name: 'latitude', label: 'عرض جغرافیایی', type: 'number', placeholder: '36.5653000', section: 'اطلاعات شعبه' },
  { name: 'longitude', label: 'طول جغرافیایی', type: 'number', placeholder: '53.0609000', section: 'اطلاعات شعبه' },

  // Section: وضعیت و نمایش
  { name: 'is_active', label: 'فعال', type: 'checkbox', section: 'وضعیت و نمایش' },
  { name: 'display_order', label: 'ترتیب نمایش', type: 'number', placeholder: '0', section: 'وضعیت و نمایش' },
]

export default function NewBranchPage() {
  return (
    <AdminForm
      entityName="branch"
      entityNamePersian="شعبه"
      apiBase="/api/v1/admin/branches/"
      fields={branchFields}
      backUrl="/admin/branches"
    />
  )
}
