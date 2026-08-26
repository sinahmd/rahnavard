'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { authFetch } from '@/lib/authFetch'

interface HeroSlide {
  id: number
  title: string
  image: string
  alt_text: string
  is_active: boolean
  display_order: number
}

export default function AdminHeroSlidesPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSlides()
  }, [])

  const fetchSlides = async () => {
    try {
      const response = await authFetch('/api/v1/admin/hero-slides/')
      if (response.ok) {
        const data = await response.json()
        setSlides(data.results || data || [])
      }
    } catch (error) {
      console.error('Error fetching hero slides:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await authFetch(`/api/v1/admin/hero-slides/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      if (response.ok) fetchSlides()
    } catch (error) {
      console.error('Error updating slide:', error)
    }
  }

  const deleteSlide = async (id: number) => {
    if (!confirm('آیا از حذف این اسلاید اطمینان دارید؟')) return
    try {
      const response = await authFetch(`/api/v1/admin/hero-slides/${id}/`, { method: 'DELETE' })
      if (response.ok) fetchSlides()
    } catch (error) {
      console.error('Error deleting slide:', error)
    }
  }

  if (loading) return <div className="text-center py-8">در حال بارگذاری...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">مدیریت اسلایدهای هیرو</h1>
        <Link
          href="/admin/hero-slides/new"
          className="bg-accent text-dark px-4 py-2 rounded-lg font-bold hover:bg-accent-dark transition-colors"
        >
          + اسلاید جدید
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-right">
              <th className="p-4 font-bold">تصویر</th>
              <th className="p-4 font-bold">عنوان</th>
              <th className="p-4 font-bold">متن جایگزین</th>
              <th className="p-4 font-bold">ترتیب</th>
              <th className="p-4 font-bold">وضعیت</th>
              <th className="p-4 font-bold">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {slides.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  اسلایدی وجود ندارد
                </td>
              </tr>
            ) : (
              slides.map((slide) => (
                <tr key={slide.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    {slide.image ? (
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
                    )}
                  </td>
                  <td className="p-4">{slide.title || '-'}</td>
                  <td className="p-4 text-sm">{slide.alt_text}</td>
                  <td className="p-4">{slide.display_order}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(slide.id, slide.is_active)}
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        slide.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {slide.is_active ? 'فعال' : 'غیرفعال'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/hero-slides/${slide.id}/edit`}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors"
                      >
                        ویرایش
                      </Link>
                      <button
                        onClick={() => deleteSlide(slide.id)}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
