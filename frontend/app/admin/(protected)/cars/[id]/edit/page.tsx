'use client'

import { useParams } from 'next/navigation'
import type { FormField } from '@/types/admin-form'
import AdminForm from '@/components/admin/form/AdminForm'
import { getCar, saveCar } from '@/lib/api/cars'

const carFields: FormField[] = [
  // Section: اطلاعات اصلی
  { name: 'brand', label: 'برند', type: 'text', required: true, placeholder: 'مثال: Hyundai', section: 'اطلاعات اصلی' },
  { name: 'model', label: 'مدل', type: 'text', required: true, placeholder: 'مثال: Elantra', section: 'اطلاعات اصلی' },
  { name: 'persian_name', label: 'نام فارسی', type: 'text', required: true, placeholder: 'مثال: هیوندای النترا', section: 'اطلاعات اصلی' },
  { name: 'slug', label: 'اسلاگ', type: 'text', placeholder: 'خالی بگذارید تا خودکار ساخته شود', helpText: 'اگر خالی بگذارید، بر اساس برند و مدل ساخته می‌شود.', section: 'اطلاعات اصلی' },
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

  // Section: مشخصات عمومی
  { name: 'manufacturer', label: 'کشور سازنده', type: 'text', placeholder: 'مثال: ژاپن', section: 'مشخصات عمومی' },
  { name: 'body_type', label: 'نوع بدنه', type: 'text', placeholder: 'مثال: سدان، شاسی‌بلند', section: 'مشخصات عمومی' },
  { name: 'color', label: 'رنگ بدنه', type: 'text', placeholder: 'مثال: سفید', section: 'مشخصات عمومی' },

  // Section: توضیحات فنی
  { name: 'technical_description', label: 'توضیحات فنی', type: 'textarea', section: 'توضیحات فنی', placeholder: 'متن یا HTML برای نمایش در تب توضیحات فنی', helpText: 'می‌توانید از HTML استفاده کنید.' },

  // Section: تصاویر و کاتالوگ
  { name: 'main_image', label: 'تصویر اصلی', type: 'file', accept: 'image/*', section: 'تصاویر و کاتالوگ', helpText: 'خالی بگذارید تا تصویر قبلی حفظ شود.' },
  { name: 'gallery', label: 'گالری تصاویر (اسلایدر)', type: 'gallery', accept: 'image/*', section: 'تصاویر و کاتالوگ', helpText: 'تصاویر اسلایدر خودرو. می‌توانید چند تصویر همزمان انتخاب کنید.' },
  { name: 'catalog_file', label: 'کاتالوگ PDF', type: 'file', accept: '.pdf', section: 'تصاویر و کاتالوگ', helpText: 'فایل PDF کاتالوگ خودرو.' },

  // Section: وضعیت و نمایش
  { name: 'is_active', label: 'فعال', type: 'checkbox', defaultValue: true, section: 'وضعیت و نمایش' },
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
      entityNamePersian="خودرو"
      id={id}
      fields={carFields}
      backUrl="/admin/cars"
      load={(carId) => getCar(Number(carId))}
      save={(values) => saveCar(values, Number(id))}
    />
  )
}
