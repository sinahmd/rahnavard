'use client'

import Link from 'next/link'
import AdminListPage from '@/components/admin/list/AdminListPage'
import type { CarAdmin } from '@/types/car'
import { deleteCar, listCars, setCarActive, setCarFeatured } from '@/lib/api/cars'

export default function AdminCarsPage() {
  return (
    <AdminListPage<CarAdmin>
      title="مدیریت خودروها"
      createHref="/admin/cars/new"
      createLabel="+ خودرو جدید"
      emptyMessage="خودرویی وجود ندارد"
      errorMessage="خطا در بارگذاری خودروها"
      fetchPage={listCars}
      rowKey={(car) => car.id}
      columns={[
        { header: 'برند', cell: (car) => car.brand },
        { header: 'مدل', cell: (car) => car.model },
        { header: 'نام فارسی', cell: (car) => car.persian_name },
        { header: 'سال', cell: (car) => car.year },
        {
          header: 'وضعیت',
          cell: (car, helpers) => (
            <button
              onClick={async () => {
                try {
                  await setCarActive(car.id, !car.is_active)
                  helpers.refresh()
                } catch {
                  helpers.error('خطا در ذخیره تغییرات')
                }
              }}
              aria-pressed={car.is_active}
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                car.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {car.is_active ? 'فعال' : 'غیرفعال'}
            </button>
          ),
        },
        {
          header: 'ویژه',
          cell: (car, helpers) => (
            <button
              onClick={async () => {
                try {
                  await setCarFeatured(car.id, !car.is_featured)
                  helpers.refresh()
                } catch {
                  helpers.error('خطا در ذخیره تغییرات')
                }
              }}
              aria-pressed={car.is_featured}
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                car.is_featured ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {car.is_featured ? 'ویژه' : 'عادی'}
            </button>
          ),
        },
        {
          header: 'کاتالوگ',
          cell: (car) =>
            car.catalog_file ? (
              <a
                href={car.catalog_file}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </a>
            ) : (
              <span className="text-gray-400 text-sm">—</span>
            ),
        },
        {
          header: 'عملیات',
          cell: (car, helpers) => (
            <div className="flex gap-2">
              <Link
                href={`/admin/cars/${car.id}/edit`}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors"
              >
                ویرایش
              </Link>
              <button
                onClick={async () => {
                  const ok = await helpers.confirm('آیا از حذف این خودرو اطمینان دارید؟')
                  if (!ok) return
                  try {
                    await deleteCar(car.id)
                    helpers.refresh()
                  } catch {
                    helpers.error('خطا در حذف خودرو')
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
