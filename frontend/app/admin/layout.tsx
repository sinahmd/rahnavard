'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sidebarLinks = [
  { href: '/admin', label: 'داشبورد', icon: '📊' },
  { href: '/admin/cars', label: 'خودروها', icon: '🚗' },
  { href: '/admin/articles', label: 'مقالات', icon: '📝' },
  { href: '/admin/branches', label: 'شعب', icon: '📍' },
  { href: '/admin/inquiries', label: 'استعلامات', icon: '💬' },
  { href: '/admin/settings', label: 'تنظیمات', icon: '⚙️' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full bg-white shadow-lg transition-all duration-300 z-40 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-4 border-b">
          <h1 className={`font-bold text-xl ${isSidebarOpen ? 'block' : 'hidden'}`}>
            پنل مدیریت
          </h1>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full text-right p-2 hover:bg-gray-100 rounded"
          >
            {isSidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {sidebarLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    pathname === link.href
                      ? 'bg-accent text-dark font-bold'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  {isSidebarOpen && <span>{link.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-dark transition-colors"
          >
            <span>🏠</span>
            {isSidebarOpen && <span>مشاهده سایت</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isSidebarOpen ? 'mr-64' : 'mr-20'
        }`}
      >
        {/* Header */}
        <header className="bg-white shadow-sm p-4 sticky top-0 z-30">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">پنل مدیریت راهنورد خودرو</h2>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">مدیر</span>
              <button className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition-colors">
                خروج
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
