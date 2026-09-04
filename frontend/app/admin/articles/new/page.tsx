'use client'

import type { FormField } from '@/types/admin-form'
import AdminForm from '@/components/admin/AdminForm'
import { saveArticle } from '@/lib/api/articles'

const articleFields: FormField[] = [
  // Section: محتوا
  { name: 'title', label: 'عنوان', type: 'text', required: true, placeholder: 'عنوان مقاله', section: 'محتوا' },
  { name: 'slug', label: 'اسلاگ', type: 'text', placeholder: 'خالی بگذارید تا خودکار ساخته شود', helpText: 'اگر خالی بگذارید، بر اساس عنوان ساخته می‌شود.', section: 'محتوا' },
  { name: 'excerpt', label: 'خلاصه', type: 'textarea', section: 'محتوا', placeholder: 'خلاصه کوتاه مقاله (اختیاری)' },
  { name: 'content', label: 'محتوا', type: 'textarea', required: true, section: 'محتوا' },
  { name: 'cover_image', label: 'تصویر کاور', type: 'file', accept: 'image/*', section: 'محتوا' },

  // Section: وضعیت انتشار
  { name: 'is_published', label: 'منتشر شده', type: 'checkbox', section: 'وضعیت انتشار' },
  { name: 'published_at', label: 'تاریخ انتشار', type: 'datetime-local', section: 'وضعیت انتشار' },

  // Section: SEO
  { name: 'seo_title', label: 'عنوان SEO', type: 'text', section: 'SEO', placeholder: 'عنوان صفحه در موتورهای جستجو' },
  { name: 'seo_description', label: 'توضیحات SEO', type: 'textarea', section: 'SEO', placeholder: 'توضیحات صفحه در موتورهای جستجو' },
  { name: 'og_image', label: 'تصویر OG', type: 'file', accept: 'image/*', section: 'SEO', helpText: 'تصویری که در شبکه‌های اجتماعی نمایش داده می‌شود.' },
]

export default function NewArticlePage() {
  return (
    <AdminForm
      entityNamePersian="مقاله"
      fields={articleFields}
      backUrl="/admin/articles"
      save={(formData) => saveArticle(formData)}
    />
  )
}
