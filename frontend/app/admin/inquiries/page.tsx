'use client'

import { useState, useEffect } from 'react'

interface Inquiry {
  id: number
  name: string
  phone: string
  subject: string
  message: string
  is_read: boolean
  is_contacted: boolean
  created_at: string
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInquiries()
  }, [])

  const fetchInquiries = async () => {
    try {
      const response = await fetch('/api/v1/admin/inquiries/')
      if (response.ok) {
        const data = await response.json()
        setInquiries(data.results || data || [])
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: number, field: string, value: boolean) => {
    try {
      const response = await fetch(`/api/v1/admin/inquiries/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (response.ok) fetchInquiries()
    } catch (error) {
      console.error('Error updating inquiry:', error)
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
                  <td className="p-4 font-mono" dir="ltr">{inquiry.phone}</td>
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
