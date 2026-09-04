'use client'

import { useState, useEffect } from 'react'
import type { Inquiry } from '@/types/inquiry'
import { listInquiries, patchInquiryStatus } from '@/lib/api/inquiries'

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInquiries()
  }, [])

  const fetchInquiries = async () => {
    try {
      setError(null)
      const data = await listInquiries()
      setInquiries(data.results || [])
    } catch {
      setError('خطا در بارگذاری استعلامات')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: number, field: 'is_read' | 'is_contacted', value: boolean) => {
    try {
      setError(null)
      await patchInquiryStatus(id, { [field]: value })
      await fetchInquiries()
    } catch {
      setError('خطا در ذخیره تغییرات')
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('fa-IR')
    } catch {
      return dateString
    }
  }

  if (loading) return <div className="text-center py-8">در حال بارگذاری...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">مدیریت استعلامات</h1>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-right">
              <th className="p-4 font-bold">نام</th>
              <th className="p-4 font-bold">تلفن</th>
              <th className="p-4 font-bold">موضوع</th>
              <th className="p-4 font-bold">پیام</th>
              <th className="p-4 font-bold">خوانده شده</th>
              <th className="p-4 font-bold">تماس گرفته شده</th>
              <th className="p-4 font-bold">تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center text-gray-500">استعلامی وجود ندارد</td></tr>
            ) : (
              inquiries.map((inquiry) => (
                <tr key={inquiry.id} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-bold">{inquiry.name}</td>
                  <td className="p-4 font-mono">{inquiry.phone}</td>
                  <td className="p-4">{inquiry.subject || '-'}</td>
                  <td className="p-4 max-w-xs truncate">{inquiry.message || '-'}</td>
                  <td className="p-4">
                    <button
                      onClick={() => updateStatus(inquiry.id, 'is_read', !inquiry.is_read)}
                      className={`px-3 py-1 rounded-full text-sm font-bold ${inquiry.is_read ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {inquiry.is_read ? 'خوانده شده' : 'جدید'}
                    </button>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => updateStatus(inquiry.id, 'is_contacted', !inquiry.is_contacted)}
                      className={`px-3 py-1 rounded-full text-sm font-bold ${inquiry.is_contacted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {inquiry.is_contacted ? 'تماس گرفته شده' : 'در انتظار'}
                    </button>
                  </td>
                  <td className="p-4 text-gray-500">{formatDate(inquiry.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
