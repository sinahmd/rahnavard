import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'داشبورد | پنل مدیریت راهنورد خودرو',
}

export default function AdminDashboard() {
  // This will fetch real data from API
  const stats = [
    { label: 'خودروهای فعال', value: '5', icon: '🚗', color: 'bg-blue-100 text-blue-600' },
    { label: 'مقالات منتشر شده', value: '3', icon: '📝', color: 'bg-green-100 text-green-600' },
    { label: 'استعلامات جدید', value: '12', icon: '💬', color: 'bg-yellow-100 text-yellow-600' },
    { label: 'شعب فعال', value: '1', icon: '📍', color: 'bg-purple-100 text-purple-600' },
  ]

  const recentInquiries = [
    { name: 'علی محمدی', phone: '09121234567', subject: 'استعلام قیمت RAV4', date: '۲ ساعت پیش' },
    { name: 'سارا احمدی', phone: '09359876543', subject: 'شرایط فروش النترا', date: '۵ ساعت پیش' },
    { name: 'رضا کریمی', phone: '09111112233', subject: 'مشاوره خرید', date: 'دیروز' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">داشبورد</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow p-6 flex items-center gap-4"
          >
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

      {/* Recent Inquiries */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold">آخرین استعلامات</h2>
        </div>
        <div className="p-4">
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
              {recentInquiries.map((inquiry, index) => (
                <tr key={index} className="border-t">
                  <td className="py-3">{inquiry.name}</td>
                  <td className="py-3 font-mono" dir="ltr">{inquiry.phone}</td>
                  <td className="py-3">{inquiry.subject}</td>
                  <td className="py-3 text-gray-500">{inquiry.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
