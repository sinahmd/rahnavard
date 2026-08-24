'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { authFetch } from '@/lib/authFetch'

interface WhyFeature {
  id: number
  title: string
  description: string
  icon: string
  is_active: boolean
  display_order: number
}

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState<WhyFeature[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeatures()
  }, [])

  const fetchFeatures = async () => {
    try {
      const response = await authFetch('/api/v1/admin/features/')
      if (response.ok) {
        const data = await response.json()
        setFeatures(data.results || data || [])
      }
    } catch (error) {
      console.error('Error fetching features:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await authFetch(`/api/v1/admin/features/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      if (response.ok) fetchFeatures()
    } catch (error) {
      console.error('Error updating feature:', error)
    }
  }

  const deleteFeature = async (id: number) => {
    if (!confirm('آیا از حذف این ویژگی اطمینان دارید؟')) return
    try {
      const response = await authFetch(`/api/v1/admin/features/${id}/`, { method: 'DELETE' })
      if (response.ok) fetchFeatures()
    } catch (error) {
      console.error('Error deleting feature:', error)
    }
  }

  if (loading) return <div className="text-center py-8">در حال بارگذاری...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">مدیریت ویژگی‌ها</h1>
        <Link
          href="/admin/features/new"
          className="bg-accent text-dark px-4 py-2 rounded-lg font-bold hover:bg-accent-dark transition-colors"
        >
          + ویژگی جدید
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-right">
              <th className="p-4 font-bold">آیکون</th>
              <th className="p-4 font-bold">عنوان</th>
              <th className="p-4 font-bold">توضیحات</th>
              <th className="p-4 font-bold">ترتیب</th>
              <th className="p-4 font-bold">وضعیت</th>
              <th className="p-4 font-bold">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {features.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  ویژگی‌ای وجود ندارد
                </td>
              </tr>
            ) : (
              features.map((feature) => (
                <tr key={feature.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    {feature.icon ? (
                      <Image
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
                    )}
                  </td>
                  <td className="p-4 font-bold">{feature.title}</td>
                  <td className="p-4 text-sm max-w-xs truncate">{feature.description}</td>
                  <td className="p-4">{feature.display_order}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(feature.id, feature.is_active)}
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        feature.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {feature.is_active ? 'فعال' : 'غیرفعال'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/features/${feature.id}/edit`}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors"
                      >
                        ویرایش
                      </Link>
                      <button
                        onClick={() => deleteFeature(feature.id)}
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
