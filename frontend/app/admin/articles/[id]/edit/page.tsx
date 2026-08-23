'use client'

import { useParams } from 'next/navigation'
import AdminForm, { FormField } from '@/components/admin/AdminForm'

const articleFields: FormField[] = [
  // Section: محتوا
  { name: 'title', label: 'عنوان', type: 'text', required: true, placeholder: 'عنوان مقاله', section: 'محتوا' },
  { name: 'slug', label: 'اسلاگ', type: 'text', section: 'محتوا' },
  { name: 'excerpt', label: 'خلاصه', type: 'textarea', section: 'محتوا' },
  { name: 'content', label: 'محتوا', type: 'textarea', required: true, section: 'محتوا' },
  { name: 'cover_image', label: 'تصویر کاور', type: 'file', accept: 'image/*', section: 'محتوا', helpText: 'خالی بگذارید تا تصویر قبلی حفظ شود.' },

  // Section: وضعیت انتشار
  { name: 'is_published', label: 'منتشر شده', type: 'checkbox', section: 'وضعیت انتشار' },
  { name: 'published_at', label: 'تاریخ انتشار', type: 'datetime-local', section: 'وضعیت انتشار' },

  // Section: SEO
  { name: 'seo_title', label: 'عنوان SEO', type: 'text', section: 'SEO', placeholder: 'عنوان صفحه در موتورهای جستجو' },
  { name: 'seo_description', label: 'توضیحات SEO', type: 'textarea', section: 'SEO', placeholder: 'توضیحات صفحه در موتورهای جستجو' },
  { name: 'og_image', label: 'تصویر OG', type: 'file', accept: 'image/*', section: 'SEO', helpText: 'خالی بگذارید تا تصویر قبلی حفظ شود.' },
]

export default function EditArticlePage() {
  const params = useParams()
  const id = params.id as string

  return (
    <AdminForm
      entityName="article"
      entityNamePersian="مقاله"
      apiBase="/api/v1/admin/articles/"
      id={id}
      fields={articleFields}
      backUrl="/admin/articles"
    />
  )
}
