'use client'

import { useState, useEffect } from 'react'

interface Stats {
  cars: number
  articles: number
  inquiries: number
  branches: number
}

interface Inquiry {
  id: number
  name: string
  phone: string
  subject: string
  created_at: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ cars: 0, articles: 0, inquiries: 0, branches: 0 })
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [carsRes, articlesRes, inquiriesRes, branchesRes] = await Promise.all([
          fetch('/api/v1/cars/'),
          fetch('/api/v1/articles/'),
          fetch('/api/v1/admin/inquiries/'),
          fetch('/api/v1/branches/'),
        ])

        const cars = carsRes.ok ? await carsRes.json() : { results: [] }
        const articles = articlesRes.ok ? await articlesRes.json() : { results: [] }
        const inquiriesData = inquiriesRes.ok ? await inquiriesRes.json() : { results: [] }
        const branches = branchesRes.ok ? await branchesRes.json() : { results: [] }

        setStats({
          cars: (cars.results || cars || []).length,
          articles: (articles.results || articles || []).length,
          inquiries: (inquiriesData.results || inquiriesData || []).length,
          branches: (branches.results || branches || []).length,
        })

        setInquiries((inquiriesData.results || inquiriesData || []).slice(0, 5))
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      return new Date(dateString).toLocaleDateString('fa-IR')
    } catch {
      return dateString
    }
  }

  const statsDisplay = [
    { label: 'خودروهای فعال', value: stats.cars, icon: '🚗', color: 'bg-blue-100 text-blue-600' },
    { label: 'مقالات منتشر شده', value: stats.articles, icon: '📝', color: 'bg-green-100 text-green-600' },
    { label: 'استعلامات', value: stats.inquiries, icon: '💬', color: 'bg-yellow-100 text-yellow-600' },
    { label: 'شعب فعال', value: stats.branches, icon: '📍', color: 'bg-purple-100 text-purple-600' },
  ]

  if (loading) {
    return <div className="text-center py-8">در حال بارگذاری...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">داشبورد</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsDisplay.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-gray-600 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold">آخرین استعلامات</h2>
        </div>
        <div className="p-4">
          {inquiries.length === 0 ? (
            <p className="text-gray-500 text-center py-4">استعلامی وجود ندارد</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-right text-gray-600">
                  <th className="pb-3">نام</th>
                  <th className="pb-3">تلفن</th>
                  <th className="pb-3">موضوع</th>
                  <th className="pb-3">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="border-t">
                    <td className="py-3">{inquiry.name}</td>
                    <td className="py-3 font-mono" dir="ltr">{inquiry.phone}</td>
                    <td className="py-3">{inquiry.subject || '-'}</td>
                    <td className="py-3 text-gray-500">{formatDate(inquiry.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
