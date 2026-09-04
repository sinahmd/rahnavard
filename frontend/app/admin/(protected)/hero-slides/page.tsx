'use client'

import Link from 'next/link'
import OptimizedImage from '@/components/ui/OptimizedImage'
import AdminListPage from '@/components/admin/list/AdminListPage'
import type { HeroSlide } from '@/types/heroSlide'
import { deleteHeroSlide, listHeroSlides, setHeroSlideActive } from '@/lib/api/heroSlides'

export default function AdminHeroSlidesPage() {
  return (
    <AdminListPage<HeroSlide>
      title="مدیریت اسلایدهای هیرو"
      createHref="/admin/hero-slides/new"
      createLabel="+ اسلاید جدید"
      emptyMessage="اسلایدی وجود ندارد"
      errorMessage="خطا در بارگذاری اسلایدها"
      fetchPage={listHeroSlides}
      rowKey={(slide) => slide.id}
      columns={[
        {
          header: 'تصویر',
          cell: (slide) =>
            slide.image ? (
              <OptimizedImage
                src={slide.image}
                alt={slide.alt_text}
                width={80}
                height={45}
                className="rounded object-cover"
              />
            ) : (
              <div className="w-20 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                بدون تصویر
              </div>
            ),
        },
        { header: 'عنوان', cell: (slide) => slide.title || '-' },
        { header: 'متن جایگزین', cell: (slide) => <span className="text-sm">{slide.alt_text}</span> },
        { header: 'ترتیب', cell: (slide) => slide.display_order },
        { header: 'لینک', cell: (slide) => <span className="text-sm text-gray-500">{slide.link || '-'}</span> },
        {
          header: 'وضعیت',
          cell: (slide, helpers) => (
            <button
              onClick={async () => {
                try {
                  await setHeroSlideActive(slide.id, !slide.is_active)
                  helpers.refresh()
                } catch {
                  helpers.error('خطا در ذخیره تغییرات')
                }
              }}
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                slide.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {slide.is_active ? 'فعال' : 'غیرفعال'}
            </button>
          ),
        },
        {
          header: 'عملیات',
          cell: (slide, helpers) => (
            <div className="flex gap-2">
              <Link
                href={`/admin/hero-slides/${slide.id}/edit`}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors"
              >
                ویرایش
              </Link>
              <button
                onClick={async () => {
                  if (!confirm('آیا از حذف این اسلاید اطمینان دارید؟')) return
                  try {
                    await deleteHeroSlide(slide.id)
                    helpers.refresh()
                  } catch {
                    helpers.error('خطا در حذف اسلاید')
                  }
                }}
                className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors"
              >
                حذف
              </button>
            </div>
          ),
        },
      ]}
    />
  )
}
