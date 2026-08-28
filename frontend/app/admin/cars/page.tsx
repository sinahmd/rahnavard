'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/authFetch'

interface Car {
  id: number
  brand: string
  model: string
  persian_name: string
  slug: string
  year: number
  is_active: boolean
  is_featured: boolean
  catalog_file: string | null
}

export default function AdminCarsPage() {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch cars from API
    fetchCars()
  }, [])

  const fetchCars = async () => {
    try {
      const response = await authFetch(`/api/v1/admin/cars/`)
      if (response.ok) {
        const data = await response.json()
        setCars(data.results || data)
      }
    } catch (error) {
      console.error('Error fetching cars:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await authFetch(`/api/v1/admin/cars/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      if (response.ok) {
        fetchCars()
      }
    } catch (error) {
      console.error('Error updating car:', error)
    }
  }

  const toggleFeatured = async (id: number, currentStatus: boolean) => {
    try {
      const response = await authFetch(`/api/v1/admin/cars/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !currentStatus }),
      })
      if (response.ok) {
        fetchCars()
      }
    } catch (error) {
      console.error('Error updating car:', error)
    }
  }

  const deleteCar = async (id: number) => {
    if (!confirm('آیا از حذف این خودرو اطمینان دارید؟')) return

    try {
      const response = await authFetch(`/api/v1/admin/cars/${id}/`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchCars()
      }
    } catch (error) {
      console.error('Error deleting car:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">در حال بارگذاری...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">مدیریت خودروها</h1>
        <Link
          href="/admin/cars/new"
          className="bg-accent text-dark px-4 py-2 rounded-lg font-bold hover:bg-accent-dark transition-colors"
        >
          + خودرو جدید
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-right">
              <th className="p-4 font-bold">برند</th>
              <th className="p-4 font-bold">مدل</th>
              <th className="p-4 font-bold">نام فارسی</th>
              <th className="p-4 font-bold">سال</th>
              <th className="p-4 font-bold">وضعیت</th>
              <th className="p-4 font-bold">ویژه</th>
              <th className="p-4 font-bold">کاتالوگ</th>
              <th className="p-4 font-bold">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {cars.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-center text-gray-500">خودرویی وجود ندارد</td></tr>
            ) : cars.map((car) => (
              <tr key={car.id} className="border-t hover:bg-gray-50">
                <td className="p-4">{car.brand}</td>
                <td className="p-4">{car.model}</td>
                <td className="p-4">{car.persian_name}</td>
                <td className="p-4">{car.year}</td>
                <td className="p-4">
                  <button
                    onClick={() => toggleActive(car.id, car.is_active)}
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      car.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {car.is_active ? 'فعال' : 'غیرفعال'}
                  </button>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => toggleFeatured(car.id, car.is_featured)}
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      car.is_featured
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {car.is_featured ? 'ویژه' : 'عادی'}
                  </button>
                </td>
                <td className="p-4">
                  {car.catalog_file ? (
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
                  )}
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/cars/${car.id}/edit`}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors"
                    >
                      ویرایش
                    </Link>
                    <button
                      onClick={() => deleteCar(car.id)}
                      className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors"
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
