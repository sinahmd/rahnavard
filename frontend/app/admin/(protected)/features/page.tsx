'use client'

import Link from 'next/link'
import OptimizedImage from '@/components/ui/OptimizedImage'
import AdminListPage from '@/components/admin/list/AdminListPage'
import type { WhyFeature } from '@/types/feature'
import { deleteFeature, listFeatures, setFeatureActive } from '@/lib/api/features'

export default function AdminFeaturesPage() {
  return (
    <AdminListPage<WhyFeature>
      title="مدیریت ویژگی‌ها"
      createHref="/admin/features/new"
      createLabel="+ ویژگی جدید"
      emptyMessage="ویژگی‌ای وجود ندارد"
      errorMessage="خطا در بارگذاری ویژگی‌ها"
      fetchPage={listFeatures}
      rowKey={(feature) => feature.id}
      columns={[
        {
          header: 'آیکون',
          cell: (feature) =>
            feature.icon ? (
              <OptimizedImage
                src={feature.icon}
                alt={feature.title}
                width={40}
                height={40}
                className="rounded object-contain"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                —
              </div>
            ),
        },
        { header: 'عنوان', cell: (feature) => <span className="font-bold">{feature.title}</span> },
        { header: 'توضیحات', cell: (feature) => <span className="text-sm max-w-xs truncate block">{feature.description}</span> },
        { header: 'ترتیب', cell: (feature) => feature.display_order },
        {
          header: 'وضعیت',
          cell: (feature, helpers) => (
            <button
              onClick={async () => {
                try {
                  await setFeatureActive(feature.id, !feature.is_active)
                  helpers.refresh()
                } catch {
                  helpers.error('خطا در ذخیره تغییرات')
                }
              }}
              aria-pressed={feature.is_active}
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                feature.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {feature.is_active ? 'فعال' : 'غیرفعال'}
            </button>
          ),
        },
        {
          header: 'عملیات',
          cell: (feature, helpers) => (
            <div className="flex gap-2">
              <Link
                href={`/admin/features/${feature.id}/edit`}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors"
              >
                ویرایش
              </Link>
              <button
                onClick={async () => {
                  const ok = await helpers.confirm('آیا از حذف این ویژگی اطمینان دارید؟')
                  if (!ok) return
                  try {
                    await deleteFeature(feature.id)
                    helpers.refresh()
                  } catch {
                    helpers.error('خطا در حذف ویژگی')
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
